/* eslint-disable @typescript-eslint/no-explicit-any */
import Order from '../models/Order';
import Product from '../models/Product';
import OrderItem from '../models/OrderItem';
import User from '../models/User';
import MailService from './mailService';
import { apiRequestToMinimax, buildInvoiceRowsFromCart, getCustomerId } from './minimaxService';
import { getToken } from './httpRequestsService';
import logger from '../logger';
import fs from 'fs';
import path from 'path';

const idPostnina = 324;

export async function create_order({ order, user, cartItemsProducts }: 
    { order: any; user: any; cartItemsProducts: any[]; }) {
    // Creates order and sends issues to minimax and generates invoice PDF if needed 
    // and makes stickers from GLS and sends 2 mails,
    // 1 to owner and 1 to customer. If anything fails, it should not fail the whole
    // operation, but just log the error and continue with the rest of the operations
    const orgId = process.env.MINIMAX_ORG_ID;
    const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT || '0');
    const includeShipping = order.paymentMethod !== 'PICKUP';
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
            // TODO: remove '14' and use environment variable, need to do in prod
            dueDate.setDate(dueDate.getDate() + parseInt(process.env.MINIMAX_DUE_DAYS || '14', 10));
            const dueDateStr = dueDate.toISOString().split('T')[0];

            // PREPARE MINIMAX ITEMS
            const invoiceRows = await buildInvoiceRowsFromCart({
                cartItemsProducts,
                vatPercent,
                token
            });

            // Add shipping cost
            if (includeShipping) {
                const shippingProduct = await Product.findById(idPostnina);
                if (shippingProduct) {
                    const priceWithVat = parseFloat(String(shippingProduct.price));
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
            if (!process.env.MINIMAX_NUMBERING_SERIES_ID) {
                throw new Error('MINIMAX_NUMBERING_SERIES_ID not set');
            }
            if (!process.env.MINIMAX_EMPLOYEE_ID) {
                throw new Error('MINIMAX_EMPLOYEE_ID not set');
            }
            if (!process.env.MINIMAX_COUNTRY_SLOVENIA_ID) {
                throw new Error('MINIMAX_COUNTRY_SLOVENIA_ID not set');
            }
            const invoicePayload: any = {
                Customer: { ID: customerId },
                ...(process.env.NODE_ENV !== 'development' && { DocumentNumbering: { ID: parseInt(process.env.MINIMAX_NUMBERING_SERIES_ID, 10) } }),
                Employee: { ID: parseInt(process.env.MINIMAX_EMPLOYEE_ID, 10) },
                DateIssued: date,
                DateTransaction: date,
                DateTransactionFrom: date,
                DateDue: dueDateStr,
                AddresseeName: `${order.shippingFirstName} ${order.shippingLastName}`,
                AddresseeAddress: order.shippingAddress,
                AddresseePostalCode: order.shippingPostalCode,
                AddresseeCity: order.shippingCity,
                AddresseeCountry: { ID: 192 },
                Currency: { ID: process.env.MINIMAX_CURRENCY_ID }, // EUR
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
                // Resolve to backend root directory
                const isRunningFromDist = __dirname.includes('/dist/') || __dirname.includes(path.sep + 'dist' + path.sep);
                const backendDir = isRunningFromDist ? path.resolve(__dirname, '..', '..') : path.resolve(__dirname, '..');
                const uploadsDir = path.resolve(backendDir, 'uploads', 'invoices');
                // Ensure directory exists
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }
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
        } catch (invErr: any) {
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

export default {
    create_order_and_send_issue_to_mmax: create_order
};
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = { create_order };
