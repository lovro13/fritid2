const express = require('express');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { createInvoiceForOrder, getToken, apiRequestToMinimax } = require('../services/minimaxService');
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
        
        // Then validate each cart item
        for (const item of cartItems) {
            console.log(`Checking if product ID ${item.product.id} exists...`);
            const product = await Product.findById(item.product.id);
            if (!product) {
                console.log(`Product with ID ${item.product.id} not found in database`);
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

            
            // Call our own backend endpoint to create invoice
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const backendUrl = process.env.FULL_BACKEND_URL;
            const baseUrl = `${protocol}://${backendUrl}`;
            const orgId = process.env.MINIMAX_ORG_ID;
            
            let token = null;
            if (process.env.MINIMAX_USERNAME && process.env.MINIMAX_PASSWORD) {
            const t = await getToken({ 
                username: process.env.MINIMAX_USERNAME, 
                password: process.env.MINIMAX_PASSWORD 
            });
            token = t.access_token;
            }
            if (!token) return res.status(401).json({ error: 'Failed to get Minimax API token' });
            logger.info("Got minimax token", token)

            // Get order with user information using models
            const orderData = await Order.findById(order.id);
            if (!orderData) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Get user information if order has a userId
            let user = null;
            if (orderData.userId) {
                user = await User.findById(orderData.userId);
            }

            // Get order items with product information using models
            const orderItems = await OrderItem.findByOrderId(order.id);
            if (!orderItems || orderItems.length === 0) {
                return res.status(400).json({ error: 'Order has no items' });
            }

            // Attach product info to each order item
            for (const item of orderItems) {
                const product = await Product.findById(item.productId);
                item.productName = product ? product.name : `Product ${item.productId}`;
                item.description = product ? product.description : item.productName;
            }

            // Get current date
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Calculate due date (14 days from now as per env)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + parseInt(process.env.MINIMAX_DUE_DAYS || 14));
            const dueDateStr = dueDate.toISOString().split('T')[0];

            // Build invoice rows from order items
            const invoiceRows = orderItems.map((item, index) => {
            const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT);
            const priceWithoutVat = parseFloat(item.price) * (1 - vatPercent / 100);
            const priceWithVat = parseFloat(item.price);
            const totalValue = priceWithoutVat * item.quantity;

            return {
                Item: { ID: process.env.MINIMAX_ITEM_ID }, // Use configured item ID
                ItemName: item.productName || `Product ${item.productId}`,
                RowNumber: index + 1,
                ItemCode: `ITEM_${item.productId}`,
                Description: item.description || item.productName || `Product ${item.productId}`,
                Quantity: item.quantity,
                UnitOfMeasurement: process.env.MINIMAX_UOM || "kos",
                Price: priceWithoutVat,
                PriceWithVAT: priceWithVat,
                VATPercent: vatPercent,
                Discount: 0,
                DiscountPercent: 0,
                Value: totalValue,
                VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID || 1 }
            };
            });

            const invoicePayload = {
            Customer: { ID: process.env.MINIMAX_CUSTOMER_ID },
            DateIssued: date,
            DateTransaction: date,
            DateTransactionFrom: date,
            DateDue: dueDateStr,
            AddresseeName: `${orderData.shippingFirstName} ${orderData.shippingLastName}`,
            AddresseeAddress: orderData.shippingAddress,
            AddresseePostalCode: orderData.shippingPostalCode,
            AddresseeCity: orderData.shippingCity,
            AddresseeCountryName: "Slovenia",
            AddresseeCountry: { ID: 191 }, // Slovenia country ID
            Currency: { ID: process.env.MINIMAX_CURRENCY_ID || 7 }, // EUR
            PaymentMethod: { ID: process.env.MINIMAX_PAYMENT_METHOD_ID },
            Status: "O", // Open status
            PricesOnInvoice: process.env.MINIMAX_PRICES_ON_INVOICE || "N",
            RecurringInvoice: "N",
            InvoiceType: "R", // Regular invoice
            PaymentStatus: process.env.MINIMAX_ALREADY_PAID === "Y" ? "Placan" : "NePlačan",
            IssuedInvoiceRows: invoiceRows
            };


            logger.info('Creating Minimax invoice with payload');

            // Create invoice via Minimax API
            const invoiceResponse = await apiRequestToMinimax({
                method: 'POST',
                path: `orgs/${orgId}/issuedinvoices`,
                token,
                body: invoicePayload
            });

            logger.info('Invoice created successfully:', invoiceResponse);
            
            if (process.env.MINIMAX_AUTO_ISSUE_PDF === 'true') {
                try {
                    const issuedInvoiceId = invoiceResponse.IssuedInvoiceId;
                    const rowVersion = invoiceResponse.RowVersion;
                    
                    if (issuedInvoiceId && rowVersion) {
                    const pdfResponse = await apiRequestToMinimax({
                        method: 'PUT',
                        path: `orgs/${orgId}/issuedinvoices/${issuedInvoiceId}/actions/IssueAndGeneratePdf`,
                        token,
                        body: {},
                        query: { rowVersion }
                    });

                    logger.info('Invoice PDF generated:', pdfResponse.Data?.AttachmentFileName);
                    
                    return res.status(201).json({
                        success: true,
                        invoice: invoiceResponse,
                        pdf: pdfResponse.Data
                    });
                    } else {
                    logger.warn('Missing IssuedInvoiceId or RowVersion for PDF generation');
                    }
                } catch (pdfError) {
                    logger.error('Failed to generate PDF:', pdfError);
                    // Return invoice without PDF - don't fail the whole operation
                }
            }

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
