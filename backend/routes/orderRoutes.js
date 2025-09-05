const express = require('express');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { createInvoiceForOrder } = require('../services/minimaxService');
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
    console.log(req.body)
    const { personInfo, cartItems, userId } = req.body;
    if (!personInfo || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: 'Invalid checkout data' });
    }

    try {
        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
        }, 0);

        // Create order
        const order = await Order.create({
            userId: userId || null, // Handle guest checkout
            totalAmount: totalAmount.toFixed(2),
            status: 'Pending',
            shippingFirstName: personInfo.firstName,
            shippingLastName: personInfo.lastName,
            shippingAddress: personInfo.address,
            shippingEmail: personInfo.email,
            shippingPhoneNumber: personInfo.phone,
            shippingCity: personInfo.city,
            shippingPostalCode: personInfo.postalCode,
        });

        if (!order) {
            throw new Error('Failed to create order.');
        }

        // Create order items
        console.log('Creating order items for order ID:', order.id);
        
        // Validate that all products exist before creating order items
        const Product = require('../models/Product');
        
        // First, let's see what products exist in the database
        const allProducts = await Product.findAll();
        console.log('Available products in database:');
        allProducts.forEach(p => {
            console.log(`- Product ID: ${p.id}, Name: ${p.name}`);
        });
        
        // Then validate each cart item
        for (const item of cartItems) {
            console.log(`Checking if product ID ${item.product.id} exists...`);
            const product = await Product.findById(item.product.id);
            if (!product) {
                console.log(`❌ Product with ID ${item.product.id} not found in database`);
                console.log('Available product IDs:', allProducts.map(p => p.id));
                throw new Error(`Product with ID ${item.product.id} not found in database`);
            }
            console.log(`✅ Product ${item.product.id} exists in database`);
        }
        
        const orderItemsPromises = cartItems.map(async (item) => {
            console.log('Processing cart item:', {
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                selectedColor: item.selectedColor
            });
            
            return OrderItem.create({
                orderId: order.id,
                productId: item.product.id,
                quantity: item.quantity,
                price: item.product.price
            });
        });

        await Promise.all(orderItemsPromises);

        // Always create the invoice after order creation using our own backend endpoint
        logger.info("Creating minimax invoice")
        try {
            // Use Authorization header if present, otherwise get fresh token
            const auth = req.headers['authorization'] || req.headers['Authorization'];
            let bearer = auth && /^Bearer\s+(.+)$/i.test(auth) ? /^Bearer\s+(.+)$/i.exec(auth)[1] : null;
            
            // If no bearer token, get one from our backend
            if (!bearer) {
                const axios = require('axios');
                const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
                const backendUrl = process.env.FULL_BACKEND_URL;
                const baseUrl = `${protocol}://${backendUrl}`;
                const tokenResponse = await axios.post(`${baseUrl}/minimax/token`, {});
                bearer = tokenResponse.data.access_token;
            }
            
            // Call our own backend endpoint to create invoice
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const backendUrl = process.env.FULL_BACKEND_URL;
            const baseUrl = `${protocol}://${backendUrl}`;
            const orgId = process.env.MINIMAX_ORG_ID;
            
            const invoiceResponse = await axios.post(
                `${baseUrl}/minimax/orgs/${orgId}/issuedinvoices`,
                { orderId: order.id },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${bearer}`
                    }
                }
            );
            
            logger.info("Created minimax invoice for order: ", order.id)
            return res.status(201).json({ 
                success: true, 
                message: 'Checkout successful', 
                orderId: order.id, 
                invoice: invoiceResponse.data 
            });
        } catch (invErr) {
            logger.error('Failed to create Minimax invoice:', invErr);
            // Don't crash checkout - still return success with error info
            return res.status(201).json({ 
                success: true, 
                message: 'Checkout successful', 
                orderId: order.id, 
                invoiceError: 'Invoice creation failed but order was created successfully',
                invoiceDetails: invErr.response?.data || invErr.message 
            });
        }

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to process checkout' });
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
