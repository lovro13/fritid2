const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const { apiRequestToMinimax, getCustomerId } = require('./minimaxService');
const { getToken } = require('./httpRequestsService')
const logger = require('../logger');

async function create_order_and_send_issue_to_mmax({ personInfo, cartItems, userId }) {
    
    try {
        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
        }, 0);

        // Create order
        logger.info("Do i have userid", userId);
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
        });

        if (!order) {
            throw new Error('Failed to create order.');
        }

        // Create order items
        console.log('Creating order items for order ID:', order.id);

        
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
            if (!token) {
                throw new Error('Failed to get Minimax API token');
            }
            logger.info("Got minimax token", token)

            // Get order with user information using models
            const orderData = await Order.findById(order.id);
            if (!orderData) {
                throw new Error('Order not found');
            }

            // Get user information if order has a userId
            let user = null;
            if (orderData.userId) {
                user = await User.findById(orderData.userId);
            }

            // Get order items with product information using models
            const orderItems = await OrderItem.findByOrderId(order.id);
            if (!orderItems || orderItems.length === 0) {
                throw new Error('Order has no items');
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

            // Get the customer ID (this is async)
            const customerId = await getCustomerId(orderData);
            logger.info('Using customer ID for invoice:', customerId);

            const invoicePayload = {
            Customer: { ID: customerId },
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
                    
                    return {
                        success: true,
                        orderId: order.id,
                        invoice: invoiceResponse,
                        pdf: pdfResponse.Data
                    };
                    } else {
                    logger.warn('Missing IssuedInvoiceId or RowVersion for PDF generation');
                    }
                } catch (pdfError) {
                    logger.error('Failed to generate PDF:', pdfError);
                    // Return invoice without PDF - don't fail the whole operation
                }
            }

            logger.info("Created minimax invoice for order: ", order.id)
            return {
                success: true, 
                message: 'Checkout successful', 
                orderId: order.id, 
                invoice: invoiceResponse
            };
        } catch (invErr) {
            logger.error('Failed to create Minimax invoice:', invErr);
            return {
                success: true, 
                message: 'Checkout successful', 
                orderId: order.id, 
                invoiceError: 'Invoice creation failed but order was created successfully',
                invoiceDetails: invErr.response?.data || invErr.message 
            };
        }

    } catch (error) {
        logger.error('Checkout error:', error);
        throw error;
    }
}

module.exports = {
    create_order_and_send_issue_to_mmax
};