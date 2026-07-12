import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order, { OrderStatus, PaymentMethod } from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import User from '../models/User';
import { authenticateToken } from '../middleware/auth';
import adminAuth from '../middleware/adminAuth';
import { create_order } from '../services/orderService';
import MailService from '../services/mailService';
import glsService from '../services/glsService';
import JWTService from '../services/jwtService';
import logger from '../logger';

const router = express.Router();
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE || 5.99);
const FREE_SHIPPING_THRESHOLD_CENTS = 15_000;

// Get all orders
router.get('/', adminAuth, async (_req: Request, res: Response) => {
  try {
    logger.info('Fetching all orders');
    const orders = await Order.findAll();
    logger.info(`Fetched ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await order.loadOrderItems();
    res.json(order);
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get orders by user ID
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.userId !== String(req.user?.id) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.findByUserId(Number(req.params.userId));
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        await order.loadOrderItems();
        return order;
      })
    );
    res.json(ordersWithItems);
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Create order (checkout)
router.post(
  '/',
  [
    body('personInfo.email').isEmail().trim().toLowerCase().withMessage('Valid email is required'),
    body('personInfo.firstName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('First name is required'),
    body('personInfo.lastName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Last name is required'),
    body('personInfo.address').trim().isLength({ min: 1, max: 200 }).escape().withMessage('Address is required'),
    body('personInfo.postalCode').matches(/^\d{4}$/).withMessage('Postal code must be 4 digits'),
    body('personInfo.city').trim().isLength({ min: 1, max: 100 }).escape().withMessage('City is required'),
    body('personInfo.phone').matches(/^[\d\s\-+()]+$/).withMessage('Valid phone number is required'),
    body('cartItems').isArray({ min: 1 }).withMessage('Cart must contain at least one item'),
    body('cartItems.*.product.id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('cartItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('typeOfOrder').isIn(['upn', 'cash', 'delivery', 'pickup']).withMessage('Invalid order type')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Order validation failed', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ errors: errors.array() });
    }

    const { personInfo, cartItems, typeOfOrder } = req.body as any;
    logger.info('Processing checkout request', { email: personInfo?.email, itemCount: cartItems?.length, typeOfOrder, ip: req.ip });

    try {
      let user = await User.findByEmail(personInfo.email);
      let userId: number | null;
      let shouldUpdateUser = false;

      if (user != null) {
        const isRegisteredUser = Boolean(user.passwordHash) && user.role !== 'guest';
        let isAuthenticatedForUser = false;
        if (req.cookies?.token) {
          try {
            const decoded = JWTService.verifyToken(req.cookies.token);
            isAuthenticatedForUser = decoded.id === user.id;
          } catch {
            isAuthenticatedForUser = false;
          }
        }

        logger.info('Found existing user via email', { userId: user.id, isRegisteredUser, isAuthenticatedForUser });
        userId = user.id;
        shouldUpdateUser = !isRegisteredUser || isAuthenticatedForUser;
      } else {
        logger.info('Creating new user from shipping info');
        user = await User.create({
          firstName: personInfo.firstName,
          lastName: personInfo.lastName,
          email: personInfo.email,
          password: null,
          role: 'guest'
        });

        userId = user.id;
        shouldUpdateUser = true;
        logger.info('Created new user with ID:', userId);
      }

      if (shouldUpdateUser) {
        user.address = personInfo.address;
        user.postalCode = personInfo.postalCode;
        user.city = personInfo.city;
        user.phoneNumber = personInfo.phone;
        logger.info('Saving user with updated info for user ID:', userId);
        await user.save();
      }

      let paymentMethod: PaymentMethod = 'DELIVERY';
      if (typeOfOrder === 'upn' || typeOfOrder === 'UPN') {
        paymentMethod = 'UPN';
      } else if (typeOfOrder === 'pickup') {
        paymentMethod = 'PICKUP';
      } else if (typeOfOrder === 'cash' || typeOfOrder === 'delivery') {
        paymentMethod = 'DELIVERY';
      }
      logger.info('Mapped payment type', { typeOfOrder, paymentMethod });

      const cartItemsProducts: any[] = [];
      let subtotalCents = 0;
      logger.info('Verifying cart items against database products');
      for (const item of cartItems) {
        const productId = Number(item?.product?.id);
        const product = await Product.findById(productId);
        if (!product) {
          throw new Error(`Product with ID ${productId} not found in database`);
        }

        subtotalCents += Math.round(Number(product.price) * 100) * item.quantity;
        cartItemsProducts.push({
          ...product,
          quantity: item.quantity,
          color: item.selectedColor
        });
        // HERE WE SHOULD GIVE THE ITEM MINIMAX_ID if it doesnt have it yet
      }

      const shippingFee = paymentMethod === 'PICKUP' || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
        ? 0
        : SHIPPING_FEE;
      const totalAmount = (subtotalCents + Math.round(shippingFee * 100)) / 100;

      logger.info('Creating order for user ID:', userId);
      const order = await Order.create({
        optUserId: userId ?? undefined,
        totalAmount: totalAmount.toFixed(2),
        status: 'PENDING' as OrderStatus,
        shippingFirstName: personInfo.firstName,
        shippingLastName: personInfo.lastName,
        shippingAddress: personInfo.address,
        shippingEmail: personInfo.email,
        shippingPhoneNumber: personInfo.phone,
        shippingCity: personInfo.city,
        shippingPostalCode: personInfo.postalCode,
        paymentMethod
      });
      if (!order) {
        throw new Error('Failed to create order.');
      }
      logger.info('Order created successfully', { orderId: order.id });

      for (const item of cartItems) {
        const productId = Number(item?.product?.id);
        const product = cartItemsProducts.find((p) => p.id === productId);
        if (!product) {
          throw new Error(`Product with ID ${productId} not found in cart verification`);
        }
        await OrderItem.create({
          orderId: order.id,
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          color: item.selectedColor
        });
      }

      logger.info('All cart items verified and order items created in database', { orderId: order.id });
      const minimax_invoice_result = await create_order({ order, user, cartItemsProducts });

      if ((minimax_invoice_result as any).invoiceError) {
        logger.error('Minimax integration failed for order', { orderId: (minimax_invoice_result as any).orderId, error: (minimax_invoice_result as any).invoiceError });
        return res.status(500).json({
          error: 'Order created but invoice generation failed',
          details: (minimax_invoice_result as any).invoiceError,
          orderId: (minimax_invoice_result as any).orderId
        });
      }

      let glsLabelPath: string | null = null;
      if (order.paymentMethod !== 'PICKUP') {
        try {
          logger.info('Generating GLS shipping label for order', { orderId: order.id });
          const glsResult = await glsService.generateLabelForOrder(order as any);

          if ((glsResult as any).success) {
            glsLabelPath = (glsResult as any).labelPath;
            logger.info('GLS label saved', { path: glsLabelPath, parcelNumber: (glsResult as any).parcelNumber });
          } else {
            logger.error('Failed to generate GLS label', { errors: (glsResult as any).errors });
          }
        } catch (glsError) {
          logger.error('GLS label generation error:', glsError);
        }
      } else {
        logger.info('Skipping GLS label generation for personal pickup order', { orderId: order.id });
      }

      logger.info('Created minimax invoice for order', { orderId: order.id });
      logger.info('order.paymentMethod', { orderId: order.id, paymentMethod: order.paymentMethod });

      try {
        await (MailService as any).sendOwnerOrderNotification(order as any, glsLabelPath);
        logger.info('Payment method on order and received', { orderPayment: order.paymentMethod, requestPayment: personInfo.paymentMethod });
        await (MailService as any).sendOrderConfirmation(
          order as any,
          order.paymentMethod === 'UPN' ? (minimax_invoice_result as any).invoiceId || null : null
        );
      } catch (mailError: any) {
        logger.error('Graceful error - Failed to send notification emails:', mailError.message);
      }

      res.status(201).json(minimax_invoice_result);
      return;
    } catch (error: any) {
      logger.error('Checkout error:', error);
      const isProduction = process.env.NODE_ENV === 'production';
      res.status(500).json({
        error: 'Failed to process checkout',
        ...(isProduction ? {} : { details: error.message })
      });
    }
  }
);

// Update order status
router.put('/:id/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const status = req.body.status as OrderStatus;

    if (!Object.values(Order.STATUS).includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await Order.findById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.updateStatus(status);
    res.json(order);
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await Order.delete(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = router;
