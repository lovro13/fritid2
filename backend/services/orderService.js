const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const MailService = require('./mailService');
const { apiRequestToMinimax, getCustomerId } = require('./minimaxService');
const { getToken } = require('./httpRequestsService')
const logger = require('../logger');
const fs = require('fs');
const path = require('path');

const idPostnina = 324;

async function create_order_and_send_issue_to_mmax({ order, user, cartItemsProducts }) {
    const orgId = process.env.MINIMAX_ORG_ID;
    const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT);
    let invoiceId = null;

    try {
        // CREATING MINIMAX INVOICE
        logger.info("Creating minimax invoice")
        try {
            // GET ME TOKEN
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
            logger.info("Got minimax token")


            // Calculate dates for invoice
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + parseInt(process.env.MINIMAX_DUE_DAYS || 14));
            const dueDateStr = dueDate.toISOString().split('T')[0];

            // PREPARE MINIMAX ITEMS
            const invoiceRows = cartItemsProducts.map((item, index) => {
                const priceWithVat = parseFloat(item.price);
                const priceWithoutVat = priceWithVat / (1 + vatPercent / 100);

                const totalValueWithVat = priceWithVat * item.quantity;

                return {
                    Item: { ID: item.minimax_id || process.env.MINIMAX_ITEM_ID },
                    ItemName: item.name,
                    RowNumber: index + 1,
                    ItemCode: `ITEM_${item.id}`,
                    Description: item.description || item.name,
                    Quantity: item.quantity,
                    UnitOfMeasurement: "kos",
                    Price: priceWithoutVat,
                    PriceWithVAT: priceWithVat,
                    VATPercent: vatPercent,
                    Discount: 0,
                    DiscountPercent: 0,
                    Value: totalValueWithVat,
                    VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID }
                };
            });

            // Add shipping cost
            if (idPostnina) {
                const shippingProduct = await Product.findById(idPostnina);
                if (shippingProduct) {
                    const priceWithVat = parseFloat(shippingProduct.price);
                    const priceWithoutVat = priceWithVat / (1 + vatPercent / 100);
                    const totalValueWithVat = priceWithVat * 1; // Quantity 1

                    invoiceRows.push({
                        Item: { ID: shippingProduct.minimax_id || process.env.MINIMAX_ITEM_ID },
                        ItemName: shippingProduct.name,
                        RowNumber: invoiceRows.length + 1,
                        ItemCode: `ITEM_${shippingProduct.id}`,
                        Description: shippingProduct.description || shippingProduct.name,
                        Quantity: 1,
                        UnitOfMeasurement: "kos",
                        Price: priceWithoutVat,
                        PriceWithVAT: priceWithVat,
                        VATPercent: vatPercent,
                        Discount: 0,
                        DiscountPercent: 0,
                        Value: totalValueWithVat,
                        VatRate: { ID: process.env.MINIMAX_VAT_RATE_ID }
                    });
                }
            }

            // Get the custpomer minimax ID
            const customerId = await getCustomerId(user);
            logger.info('Using customer ID for invoice:', customerId);


            // SEND API REQUEST TO CREATE INVOICE
            const invoicePayload = {
                Customer: { ID: customerId },
                DateIssued: date,
                DateTransaction: date,
                DateTransactionFrom: date,
                DateDue: dueDateStr,
                AddresseeName: `${order.shippingFirstName} ${order.shippingLastName}`,
                AddresseeAddress: order.shippingAddress,
                AddresseePostalCode: order.shippingPostalCode,
                AddresseeCity: order.shippingCity,
                AddresseeCountryName: "Slovenia",
                AddresseeCountry: { ID: 191 }, // Slovenia country ID
                Currency: { ID: process.env.MINIMAX_CURRENCY_ID || 7 }, // EUR
                PaymentMethod: { ID: process.env.MINIMAX_PAYMENT_METHOD_ID },
                Status: "O", // Open status
                PricesOnInvoice: process.env.MINIMAX_PRICES_ON_INVOICE,
                RecurringInvoice: "N",
                InvoiceType: "R", // Regular invoice
                PaymentStatus: "NePlačan",
                IssuedInvoiceRows: invoiceRows
            };

            logger.info('Creating Minimax invoice');
            const [invoiceResponse, headers] = await apiRequestToMinimax({
                method: 'POST',
                path: `orgs/${orgId}/issuedinvoices`,
                token,
                body: invoicePayload
            });
            logger.info(`Invoice created successfully: data: ${JSON.stringify(invoiceResponse)}, 
            headers: ${JSON.stringify(headers)}`);


            // GET THE INVOICE ID
            const locationHeader = headers?.location || '';
            const invoicePathMatch = locationHeader.match(/\/SI\/API\/api\/(orgs\/\d+\/issuedinvoices\/\d+)/);
            const invoicePath = invoicePathMatch[1];
            invoiceId = invoicePath.split('/').pop(); // Extract invoice ID from path
            logger.info('Extracted invoice path from location header:', invoicePath);
            logger.info('Extracted invoice ID:', invoiceId);
            logger.info("Checking if invoice exists")

            // GET THE WHOLE INVOICE TO GET ROWVERSION FOR PDF GENERATION
            const [checkInvoiceResponse, checkHeaders] = await apiRequestToMinimax({
                method: 'GET',
                path: invoicePath,
                token
            });
            try {
                const rowVersion = encodeURIComponent(checkInvoiceResponse.RowVersion);
                logger.info("got row version for pdf generation:", rowVersion);
                // GET THE PDF FOR UPN PAYMENT METHOD
                const [pdfResponse, pdfHeaders] = await apiRequestToMinimax({
                    method: 'PUT',
                    path: invoicePath + `/actions/issueAndGeneratepdf?rowVersion=${rowVersion}`,
                    token,
                    body: {}
                });
                logger.info(`PDF generated successfully for invoice;`);
                logger.info('Invoice PDF generated:', pdfResponse.Data?.AttachmentFileName);

                // SAVE PDF
                let savedFilePath = null;
                const fileName = `invoice_${order.id}_${invoiceId}.pdf`;
                const uploadsDir = path.join(__dirname, '../uploads/invoices');
                savedFilePath = path.join(uploadsDir, fileName);
                const pdfBuffer = Buffer.from(pdfResponse.Data.AttachmentData, 'base64');
                fs.writeFileSync(savedFilePath, pdfBuffer);
                logger.info(`PDF saved to: ${savedFilePath}`);
            } catch (pdfError) {
                logger.error('Failed to generate PDF:', pdfError);
                // Return invoice without PDF - don't fail the whole operation
            }

            return {
                success: true,
                message: 'Checkout successful',
                orderId: order.id,
                invoice: invoiceResponse,
                invoiceId: invoiceId
            };
        } catch (invErr) {
            logger.error('Failed to create Minimax invoice:', invErr);
            await order.updateStatus('Invoice Error');
            return {
                success: false,
                message: 'Checkout unsuccessful',
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