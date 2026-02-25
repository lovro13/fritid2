"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_order = create_order;
const Product_1 = __importDefault(require("../models/Product"));
const minimaxService_1 = require("./minimaxService");
const httpRequestsService_1 = require("./httpRequestsService");
const logger_1 = __importDefault(require("../logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const idPostnina = 324;
async function create_order({ order, user, cartItemsProducts }) {
    // Creates order and sends issues to minimax and generates invoice PDF if needed 
    // and makes stickers from GLS and sends 2 mails,
    // 1 to owner and 1 to customer. If anything fails, it should not fail the whole
    // operation, but just log the error and continue with the rest of the operations
    const orgId = process.env.MINIMAX_ORG_ID;
    const vatPercent = parseFloat(process.env.MINIMAX_VAT_PERCENT || '0');
    let invoiceId = null;
    try {
        // CREATING MINIMAX INVOICE
        logger_1.default.info("Creating minimax invoice");
        try {
            // GET ME TOKEN
            let token = null;
            if (process.env.MINIMAX_USERNAME && process.env.MINIMAX_PASSWORD) {
                const t = await (0, httpRequestsService_1.getToken)({
                    username: process.env.MINIMAX_USERNAME,
                    password: process.env.MINIMAX_PASSWORD
                });
                token = t.access_token;
            }
            if (!token) {
                throw new Error('Failed to get Minimax API token');
            }
            logger_1.default.info("Got minimax token");
            // Calculate dates for invoice
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const dueDate = new Date();
            // TODO: remove '14' and use environment variable, need to do in prod
            dueDate.setDate(dueDate.getDate() + parseInt(process.env.MINIMAX_DUE_DAYS || '14', 10));
            const dueDateStr = dueDate.toISOString().split('T')[0];
            // PREPARE MINIMAX ITEMS
            const invoiceRows = await (0, minimaxService_1.buildInvoiceRowsFromCart)({
                cartItemsProducts,
                vatPercent,
                token
            });
            // Add shipping cost
            if (idPostnina) {
                const shippingProduct = await Product_1.default.findById(idPostnina);
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
            const customerId = await (0, minimaxService_1.getCustomerId)(user);
            logger_1.default.info('Using customer ID for invoice:', customerId);
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
            const invoicePayload = {
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
            logger_1.default.info('Creating Minimax invoice');
            const [invoiceResponse, headers] = await (0, minimaxService_1.apiRequestToMinimax)({
                method: 'POST',
                path: `orgs/${orgId}/issuedinvoices`,
                token,
                body: invoicePayload
            });
            logger_1.default.info(`Invoice created successfully: data: ${JSON.stringify(invoiceResponse)}, 
            headers: ${JSON.stringify(headers)}`);
            // GET THE INVOICE ID
            const locationHeader = headers?.location || '';
            const invoicePathMatch = locationHeader.match(/\/SI\/API\/api\/(orgs\/\d+\/issuedinvoices\/\d+)/);
            const invoicePath = invoicePathMatch[1];
            invoiceId = invoicePath.split('/').pop(); // Extract invoice ID from path
            logger_1.default.info('Extracted invoice path from location header:', invoicePath);
            logger_1.default.info('Extracted invoice ID:', invoiceId);
            logger_1.default.info("Checking if invoice exists");
            // GET THE WHOLE INVOICE TO GET ROWVERSION FOR PDF GENERATION
            const [checkInvoiceResponse, checkHeaders] = await (0, minimaxService_1.apiRequestToMinimax)({
                method: 'GET',
                path: invoicePath,
                token
            });
            try {
                const rowVersion = encodeURIComponent(checkInvoiceResponse.RowVersion);
                logger_1.default.info("got row version for pdf generation:", rowVersion);
                // GET THE PDF FOR UPN PAYMENT METHOD
                const [pdfResponse, pdfHeaders] = await (0, minimaxService_1.apiRequestToMinimax)({
                    method: 'PUT',
                    path: invoicePath + `/actions/issueAndGeneratepdf?rowVersion=${rowVersion}`,
                    token,
                    body: {}
                });
                logger_1.default.info(`PDF generated successfully for invoice;`);
                logger_1.default.info('Invoice PDF generated:', pdfResponse.Data?.AttachmentFileName);
                // SAVE PDF
                let savedFilePath = null;
                const fileName = `invoice_${order.id}_${invoiceId}.pdf`;
                // Resolve to backend root directory
                const isRunningFromDist = __dirname.includes('/dist/') || __dirname.includes(path_1.default.sep + 'dist' + path_1.default.sep);
                const backendDir = isRunningFromDist ? path_1.default.resolve(__dirname, '..', '..') : path_1.default.resolve(__dirname, '..');
                const uploadsDir = path_1.default.resolve(backendDir, 'uploads', 'invoices');
                // Ensure directory exists
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                savedFilePath = path_1.default.join(uploadsDir, fileName);
                const pdfBuffer = Buffer.from(pdfResponse.Data.AttachmentData, 'base64');
                fs_1.default.writeFileSync(savedFilePath, pdfBuffer);
                logger_1.default.info(`PDF saved to: ${savedFilePath}`);
            }
            catch (pdfError) {
                logger_1.default.error('Failed to generate PDF:', pdfError);
                // Return invoice without PDF - don't fail the whole operation
            }
            return {
                success: true,
                message: 'Checkout successful',
                orderId: order.id,
                invoice: invoiceResponse,
                invoiceId: invoiceId
            };
        }
        catch (invErr) {
            logger_1.default.error('Failed to create Minimax invoice:', invErr);
            await order.updateStatus('Invoice Error');
            return {
                success: false,
                message: 'Checkout unsuccessful',
                orderId: order.id,
                invoiceError: 'Invoice creation failed but order was created successfully',
                invoiceDetails: invErr.response?.data || invErr.message
            };
        }
    }
    catch (error) {
        logger_1.default.error('Checkout error:', error);
        throw error;
    }
}
exports.default = {
    create_order_and_send_issue_to_mmax: create_order
};
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = { create_order };
