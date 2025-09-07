const express = require('express');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { createInvoiceForOrder, getToken, apiRequestToMinimax } = require('../services/minimaxService');
const { create_order_and_send_issue_to_mmax } = require('../services/orderService');
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
    const { personInfo, cartItems, userId: optUserId } = req.body;
    
    if (!personInfo || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: 'Invalid checkout data' });
    }

    try {
        let userId;
        if (optUserId == null) {
            const user = await User.findByEmail(personInfo.email);
            if (user != null) {
                console.log("found user via email", user.id);
                userId = user.id;
            } else {
                userId = null;
            }
        } else {
            userId = optUserId;
        }
        console.log("User id sent to orderService", userId)
        const result = await create_order_and_send_issue_to_mmax({ personInfo, cartItems, userId });
        res.status(201).json(result);
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

// Create a Minimax invoice for an existing order
router.post('/:id/invoice', async (req, res) => {
    try {
        const auth = req.headers['authorization'] || req.headers['Authorization'];
        const bearer = auth && /^Bearer\s+(.+)$/i.test(auth) ? auth.split(/\s+/)[1] : null;
        const { id } = req.params;
        const result = await createInvoiceForOrder({ orderId: id, bearerToken: bearer });
        res.status(201).json(result);
    } catch (err) {
        const status = err.status || err?.response?.status || 500;
        res.status(status).json({ error: err.message, details: err?.response?.data || null });
    }
});
