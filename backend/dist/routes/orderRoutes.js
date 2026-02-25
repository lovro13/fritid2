"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Order_1 = __importDefault(require("../models/Order"));
const OrderItem_1 = __importDefault(require("../models/OrderItem"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const orderService_1 = require("../services/orderService");
const mailService_1 = __importDefault(require("../services/mailService"));
const glsService_1 = __importDefault(require("../services/glsService"));
const jwtService_1 = __importDefault(require("../services/jwtService"));
const logger_1 = __importDefault(require("../logger"));
const router = express_1.default.Router();
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE || 5.99);
// Get all orders
router.get('/', adminAuth_1.default, async (_req, res) => {
    try {
        logger_1.default.info('Fetching all orders');
        const orders = await Order_1.default.findAll();
        logger_1.default.info(`Fetched ${orders.length} orders`);
        res.json(orders);
    }
    catch (error) {
        logger_1.default.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
// Get order by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const order = await Order_1.default.findById(Number(req.params.id));
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.userId !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await order.loadOrderItems();
        res.json(order);
    }
    catch (error) {
        logger_1.default.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});
// Get orders by user ID
router.get('/user/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.params.userId !== String(req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const orders = await Order_1.default.findByUserId(Number(req.params.userId));
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            await order.loadOrderItems();
            return order;
        }));
        res.json(ordersWithItems);
    }
    catch (error) {
        logger_1.default.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Failed to fetch user orders' });
    }
});
// Create order (checkout)
router.post('/', [
    (0, express_validator_1.body)('personInfo.email').isEmail().trim().toLowerCase().withMessage('Valid email is required'),
    (0, express_validator_1.body)('personInfo.firstName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('First name is required'),
    (0, express_validator_1.body)('personInfo.lastName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Last name is required'),
    (0, express_validator_1.body)('personInfo.address').trim().isLength({ min: 1, max: 200 }).escape().withMessage('Address is required'),
    (0, express_validator_1.body)('personInfo.postalCode').matches(/^\d{4}$/).withMessage('Postal code must be 4 digits'),
    (0, express_validator_1.body)('personInfo.city').trim().isLength({ min: 1, max: 100 }).escape().withMessage('City is required'),
    (0, express_validator_1.body)('personInfo.phone').matches(/^[\d\s\-+()]+$/).withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('cartItems').isArray({ min: 1 }).withMessage('Cart must contain at least one item'),
    (0, express_validator_1.body)('cartItems.*.product.id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    (0, express_validator_1.body)('cartItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    (0, express_validator_1.body)('typeOfOrder').isIn(['upn', 'cash', 'delivery']).withMessage('Invalid order type')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Order validation failed', { errors: errors.array(), ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
    }
    const { personInfo, cartItems, typeOfOrder } = req.body;
    logger_1.default.info('Processing checkout request', { email: personInfo?.email, itemCount: cartItems?.length, typeOfOrder, ip: req.ip });
    try {
        let user = await User_1.default.findByEmail(personInfo.email);
        let userId;
        let shouldUpdateUser = false;
        if (user != null) {
            const isRegisteredUser = Boolean(user.passwordHash) && user.role !== 'guest';
            let isAuthenticatedForUser = false;
            if (req.cookies?.token) {
                try {
                    const decoded = jwtService_1.default.verifyToken(req.cookies.token);
                    isAuthenticatedForUser = decoded.id === user.id;
                }
                catch {
                    isAuthenticatedForUser = false;
                }
            }
            logger_1.default.info('Found existing user via email', { userId: user.id, isRegisteredUser, isAuthenticatedForUser });
            userId = user.id;
            shouldUpdateUser = !isRegisteredUser || isAuthenticatedForUser;
        }
        else {
            logger_1.default.info('Creating new user from shipping info');
            user = await User_1.default.create({
                firstName: personInfo.firstName,
                lastName: personInfo.lastName,
                email: personInfo.email,
                password: null,
                role: 'guest'
            });
            userId = user.id;
            shouldUpdateUser = true;
            logger_1.default.info('Created new user with ID:', userId);
        }
        if (shouldUpdateUser) {
            user.address = personInfo.address;
            user.postalCode = personInfo.postalCode;
            user.city = personInfo.city;
            user.phoneNumber = personInfo.phone;
            logger_1.default.info('Saving user with updated info for user ID:', userId);
            await user.save();
        }
        let paymentMethod = 'DELIVERY';
        if (typeOfOrder === 'upn' || typeOfOrder === 'UPN') {
            paymentMethod = 'UPN';
        }
        else if (typeOfOrder === 'cash' || typeOfOrder === 'delivery') {
            paymentMethod = 'DELIVERY';
        }
        logger_1.default.info('Mapped payment type', { typeOfOrder, paymentMethod });
        const cartItemsProducts = [];
        let subtotal = 0;
        logger_1.default.info('Verifying cart items against database products');
        for (const item of cartItems) {
            const productId = Number(item?.product?.id);
            const product = await Product_1.default.findById(productId);
            if (!product) {
                throw new Error(`Product with ID ${productId} not found in database`);
            }
            subtotal += product.price * item.quantity;
            cartItemsProducts.push({
                ...product,
                quantity: item.quantity,
                color: item.selectedColor
            });
            // HERE WE SHOULD GIVE THE ITEM MINIMAX_ID if it doesnt have it yet
        }
        const totalAmount = subtotal + SHIPPING_FEE;
        logger_1.default.info('Creating order for user ID:', userId);
        const order = await Order_1.default.create({
            optUserId: userId ?? undefined,
            totalAmount: totalAmount.toFixed(2),
            status: 'PENDING',
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
        logger_1.default.info('Order created successfully', { orderId: order.id });
        for (const item of cartItems) {
            const productId = Number(item?.product?.id);
            const product = cartItemsProducts.find((p) => p.id === productId);
            if (!product) {
                throw new Error(`Product with ID ${productId} not found in cart verification`);
            }
            await OrderItem_1.default.create({
                orderId: order.id,
                productId: product.id,
                quantity: item.quantity,
                price: product.price,
                color: item.selectedColor
            });
        }
        logger_1.default.info('All cart items verified and order items created in database', { orderId: order.id });
        const minimax_invoice_result = await (0, orderService_1.create_order)({ order, user, cartItemsProducts });
        if (minimax_invoice_result.invoiceError) {
            logger_1.default.error('Minimax integration failed for order', { orderId: minimax_invoice_result.orderId, error: minimax_invoice_result.invoiceError });
            return res.status(500).json({
                error: 'Order created but invoice generation failed',
                details: minimax_invoice_result.invoiceError,
                orderId: minimax_invoice_result.orderId
            });
        }
        let glsLabelPath = null;
        try {
            logger_1.default.info('Generating GLS shipping label for order', { orderId: order.id });
            const glsResult = await glsService_1.default.generateLabelForOrder(order);
            if (glsResult.success) {
                glsLabelPath = glsResult.labelPath;
                logger_1.default.info('GLS label saved', { path: glsLabelPath, parcelNumber: glsResult.parcelNumber });
            }
            else {
                logger_1.default.error('Failed to generate GLS label', { errors: glsResult.errors });
            }
        }
        catch (glsError) {
            logger_1.default.error('GLS label generation error:', glsError);
        }
        logger_1.default.info('Created minimax invoice for order', { orderId: order.id });
        logger_1.default.info('order.paymentMethod', { orderId: order.id, paymentMethod: order.paymentMethod });
        try {
            await mailService_1.default.sendOwnerOrderNotification(order, glsLabelPath);
            logger_1.default.info('Payment method on order and received', { orderPayment: order.paymentMethod, requestPayment: personInfo.paymentMethod });
            if (order.paymentMethod === 'UPN') {
                await mailService_1.default.sendOrderConfirmation(order, true, minimax_invoice_result.invoiceId || null);
            }
            else {
                await mailService_1.default.sendOrderConfirmation(order, false, null);
            }
        }
        catch (mailError) {
            logger_1.default.error('Graceful error - Failed to send notification emails:', mailError.message);
        }
        res.status(201).json(minimax_invoice_result);
        return;
    }
    catch (error) {
        logger_1.default.error('Checkout error:', error);
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({
            error: 'Failed to process checkout',
            ...(isProduction ? {} : { details: error.message })
        });
    }
});
// Update order status
router.put('/:id/status', adminAuth_1.default, async (req, res) => {
    try {
        const status = req.body.status;
        if (!Object.values(Order_1.default.STATUS).includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
        }
        const order = await Order_1.default.findById(Number(req.params.id));
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        await order.updateStatus(status);
        res.json(order);
    }
    catch (error) {
        logger_1.default.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});
// Delete order
router.delete('/:id', adminAuth_1.default, async (req, res) => {
    try {
        const deleted = await Order_1.default.delete(Number(req.params.id));
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});
exports.default = router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = router;
