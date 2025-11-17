const express = require('express');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { createInvoiceForOrder } = require('../services/minimaxService');
const { create_order_and_send_issue_to_mmax } = require('../services/orderService');
const MailService = require('../services/mailService');
const logger = require('../logger');

const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.findAll();
        // Load order items for each order
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                await order.loadOrderItems();
                return order;
            })
        );
        res.json(ordersWithItems);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        await order.loadOrderItems();
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get orders by user ID
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
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
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Failed to fetch user orders' });
    }
});

// Create order (checkout)
router.post('/', async (req, res) => {
    logger.info('Processing checkout request', { body: req.body });
    // EXTRACT BODY PARAMETERS
    const { personInfo, cartItems, typeOfOrder } = req.body;
    logger.info('Checkout data received', { personInfo, cartItems, typeOfOrder });

    try {
        // CREATE USER IF NOT EXISTS OR GET USER ID If EXISTS
        const user = await User.findByEmail(personInfo.email);
        if (user != null) {
            logger.info("found user via email", user.id);
            userId = user.id;
        } else {
            logger.info("Creating new user from shipping info");
            const user = await User.create({
                firstName: personInfo.firstName,
                lastName: personInfo.lastName,
                email: personInfo.email,
                password: null, // Leave password null
                role: 'user'
            });
            
            
            userId = user.id;
            console.log("Created new user with ID:", userId);
        }
        user.address = personInfo.address;
        user.postalCode = personInfo.postalCode;
        user.city = personInfo.city;
        user.phoneNumber = personInfo.phone;
        logger.info("Saving user with updated info:");
        await user.save();

        // CREATE ORDER
        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
        }, 0);

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
            paymentMethod: typeOfOrder
        });        
        if (!order) {
            throw new Error('Failed to create order.');
        }
        logger.info("Order created successfully with ID:", order.id);

        // Check cart items against database products
        const cartItemsProducts = []
        logger.info("Verifying cart items against database products");
        for (const item of cartItems) {
            const product = await Product.findById(item.product.id);
            if (!product) {
                throw new Error(`Product with ID ${item.product.id} not found in database`);
            }
            cartItemsProducts.push(product);
        }
        logger.info("All cart items verified against database products");
        const minimax_invoice_result = await create_order_and_send_issue_to_mmax({order, user, cartItemsProducts });
        
        // Check if minimax integration failed
        if (minimax_invoice_result.invoiceError) {
            logger.error('Minimax integration failed for order:', minimax_invoice_result.orderId, minimax_invoice_result.invoiceError);
            return res.status(500).json({ 
                error: 'Order created but invoice generation failed', 
                details: minimax_invoice_result.invoiceError,
                orderId: minimax_invoice_result.orderId 
            });
        }

        // Make call here to GLS API, TODO, whole GLS API to make "prevoznica"/sticker for the package

        // SEND MAIL TO OWNER ABOUT NEW ORDER, TODO

        // TOOD SEND MAIL TO CUSTOMER ONE IF HE PAYS UPN AND ONE FOR CASH ON DELIVERY

        logger.info("Created minimax invoice for order: ", order.id)
        logger.info("order.paymentMethod: ", order.paymentMethod);
        
        // Send email notifications
        await MailService.sendOwnerOrderNotification(order);
        logger.info("Payment method on order and received", order.paymentMethod, personInfo.paymentMethod);
        if (order.paymentMethod === 'UPN') {
            await MailService.sendOrderConfirmation(order, true, minimax_invoice_result.invoiceId);
        } else {
            await MailService.sendOrderConfirmation(order, false, null);
        }
            

        res.status(201).json(minimax_invoice_result);
        return;
    } catch (error) {
        logger.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to process checkout', details: error.message });
    }
});

// Update order status
router.put('/:id/status', async (req, res) => {
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
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Order.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

module.exports = router;