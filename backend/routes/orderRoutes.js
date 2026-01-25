const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { createInvoiceForOrder } = require('../services/minimaxService');
const { create_order_and_send_issue_to_mmax } = require('../services/orderService');
const MailService = require('../services/mailService');
const glsService = require('../services/glsService');
const JWTService = require('../services/jwtService');
const logger = require('../logger');
const path = require('path');

const router = express.Router();
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE || 5.99);

// Get all orders
router.get('/', adminAuth, async (req, res) => {
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
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership: users can only view their own orders, admins can view all
        if (order.userId !== req.user.id && req.user.role !== 'admin') {
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
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        // Check ownership: users can only view their own orders, admins can view all
        if (req.params.userId !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const orders = await Order.findByUserId(req.params.userId);
        // Load order items for each order
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
router.post('/', [
    body('personInfo.email').isEmail().trim().toLowerCase().withMessage('Valid email is required'),
    body('personInfo.firstName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('First name is required'),
    body('personInfo.lastName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Last name is required'),
    body('personInfo.address').trim().isLength({ min: 1, max: 200 }).escape().withMessage('Address is required'),
    body('personInfo.postalCode').matches(/^\d{4}$/).withMessage('Postal code must be 4 digits'),
    body('personInfo.city').trim().isLength({ min: 1, max: 100 }).escape().withMessage('City is required'),
    body('personInfo.phone').matches(/^[\d\s\-+()]+$/).withMessage('Valid phone number is required'),
    body('cartItems').isArray({ min: 1 }).withMessage('Cart must contain at least one item'),
    body('cartItems.*.product.id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('cartItems.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    body('typeOfOrder').isIn(['upn', 'cash', 'delivery']).withMessage('Invalid order type')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Order validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
    }

    logger.info('Processing checkout request', { email: req.body?.personInfo?.email, itemCount: req.body?.cartItems?.length, ip: req.ip });
    // EXTRACT BODY PARAMETERS
    const { personInfo, cartItems, typeOfOrder } = req.body;
    logger.info('Checkout data received', { email: personInfo?.email, itemCount: cartItems?.length, typeOfOrder });

    try {
        // CREATE USER IF NOT EXISTS OR GET USER ID If EXISTS
        let user = await User.findByEmail(personInfo.email);
        let userId;
        let shouldUpdateUser = false;

        if (user != null) {
            const isRegisteredUser = Boolean(user.passwordHash) && user.role !== 'guest';
            let isAuthenticatedForUser = false;
            if (req.cookies?.token) {
                try {
                    const decoded = JWTService.verifyToken(req.cookies.token);
                    isAuthenticatedForUser = decoded.id === user.id;
                } catch (error) {
                    isAuthenticatedForUser = false;
                }
            }

            logger.info("Found existing user via email", user.id);
            userId = user.id;
            shouldUpdateUser = isRegisteredUser && isAuthenticatedForUser;
        } else {
            logger.info("Creating new user from shipping info");
            user = await User.create({
                firstName: personInfo.firstName,
                lastName: personInfo.lastName,
                email: personInfo.email,
                password: null, // Leave password null
                role: 'guest'
            });

            userId = user.id;
            shouldUpdateUser = true;
            logger.info("Created new user with ID:", userId);
        }

        // Update user address info only for guests or authenticated users
        if (shouldUpdateUser) {
            user.address = personInfo.address;
            user.postalCode = personInfo.postalCode;
            user.city = personInfo.city;
            user.phoneNumber = personInfo.phone;
            logger.info("Saving user with updated info for user ID:", userId);
            await user.save();
        }

        // Map frontend payment type to database enum
        let paymentMethod = 'DELIVERY'; // Default
        if (typeOfOrder === 'upn' || typeOfOrder === 'UPN') {
            paymentMethod = 'UPN';
        } else if (typeOfOrder === 'cash' || typeOfOrder === 'delivery') {
            paymentMethod = 'DELIVERY';
        }
        logger.info("Mapped payment type:", typeOfOrder, "->", paymentMethod);

        // Check cart items against database products and compute totals
        const cartItemsProducts = [];
        let subtotal = 0;
        logger.info("Verifying cart items against database products");
        for (const item of cartItems) {
            const productId = Number(item?.product?.id);
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error(`Product with ID ${productId} not found in database`);
            }

            subtotal += product.price * item.quantity;

            // Create order item in database
            // Combine product details from DB with quantity from request
            cartItemsProducts.push({
                ...product,
                quantity: item.quantity
            });
        }
        
        const totalAmount = subtotal + SHIPPING_FEE;

        // Create order
        logger.info("Creating order for user ID:", userId);
        const order = await Order.create({
            optUserId: userId,
            totalAmount: totalAmount.toFixed(2),
            status: 'Pending',
            shippingFirstName: personInfo.firstName,
            shippingLastName: personInfo.lastName,
            shippingAddress: personInfo.address,
            shippingEmail: personInfo.email,
            shippingPhoneNumber: personInfo.phone,
            shippingCity: personInfo.city,
            shippingPostalCode: personInfo.postalCode,
            paymentMethod: paymentMethod
        });
        if (!order) {
            throw new Error('Failed to create order.');
        }
        logger.info("Order created successfully with ID:", order.id);

        // Create order items after order exists
        for (const item of cartItems) {
            const productId = Number(item?.product?.id);
            const product = cartItemsProducts.find(p => p.id === productId);
            if (!product) {
                throw new Error(`Product with ID ${productId} not found in cart verification`);
            }
            await OrderItem.create({
                orderId: order.id,
                productId: product.id,
                quantity: item.quantity,
                price: product.price,
                color: item.selectedColor || null
            });
            logger.info(`Created order item for product ${product.id} with color: ${item.selectedColor}`);
        }

        logger.info("All cart items verified and order items created in database");
        const minimax_invoice_result = await create_order_and_send_issue_to_mmax({ order, user, cartItemsProducts });

        // Check if minimax integration failed
        if (minimax_invoice_result.invoiceError) {
            logger.error('Minimax integration failed for order:', minimax_invoice_result.orderId, minimax_invoice_result.invoiceError);
            return res.status(500).json({
                error: 'Order created but invoice generation failed',
                details: minimax_invoice_result.invoiceError,
                orderId: minimax_invoice_result.orderId
            });
        }

        // Generate GLS shipping label
        let glsLabelPath = null;
        try {
            logger.info("Generating GLS shipping label for order:", order.id);
            const glsResult = await glsService.generateLabelForOrder(order);

            if (glsResult.success) {
                glsLabelPath = glsResult.labelPath;
                logger.info("GLS label saved to:", glsLabelPath);
                logger.info("GLS parcel number:", glsResult.parcelNumber);
            } else {
                logger.error("Failed to generate GLS label:", glsResult.errors);
            }
        } catch (glsError) {
            logger.error("GLS label generation error:", glsError);
            // Don't fail the whole order if GLS fails
        }

        logger.info("Created minimax invoice for order: ", order.id)
        logger.info("order.paymentMethod: ", order.paymentMethod);

        // Send email notifications (Graceful handling)
        try {
            await MailService.sendOwnerOrderNotification(order, glsLabelPath);
            logger.info("Payment method on order and received", order.paymentMethod, personInfo.paymentMethod);
            if (order.paymentMethod === 'UPN') {
                await MailService.sendOrderConfirmation(order, true, minimax_invoice_result.invoiceId);
            } else {
                await MailService.sendOrderConfirmation(order, false, null);
            }
        } catch (mailError) {
            logger.error('Graceful error - Failed to send notification emails:', mailError.message);
            // We don't return error here because the order and invoice are already created
        }

        res.status(201).json(minimax_invoice_result);
        return;
    } catch (error) {
        logger.error('Checkout error:', error);
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({ 
            error: 'Failed to process checkout',
            ...(isProduction ? {} : { details: error.message })
        });
    }
});

// Update order status
router.put('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!Object.values(Order.STATUS).includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
        }

        const order = await Order.findById(req.params.id);
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
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const deleted = await Order.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

module.exports = router;
