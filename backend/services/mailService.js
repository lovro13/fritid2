const nodemailer = require('nodemailer');
const logger = require('../logger');
const fs = require('fs');
const path = require('path');


class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        });
    }

    /**
     * Send order confirmation email
     * @param {Object} order - Order object from Order.js
     * @param {boolean} upn - Whether payment is via UPN (true) or cash/card on delivery (false)
     * @param {string|null} invoiceId - Invoice ID for UPN payments (required if upn=true)
     * @returns {Promise<Object>} - Email send result
     */
    async sendOrderConfirmation(order, upn = false, invoiceId = null) {
        try {
            logger.info(`Preparing to send order confirmation email for order #${order.id}, UPN: ${upn}`);
            // Validate UPN payment requires invoice ID
            if (upn && !invoiceId) {
                logger.error('Invoice ID is required for UPN payments but not provided');
                throw new Error('Invoice ID is required for UPN payments');
            }

            // Load order items if not already loaded
            if (!order.orderItems || order.orderItems.length === 0) {
                await order.loadOrderItems();
            }

            // Check if invoice exists for UPN payment
            let invoicePath = null;
            if (upn) {
                invoicePath = path.join(__dirname, '..', 'uploads', 'invoices', `invoice_${order.id}_${invoiceId}.pdf`);
                if (!fs.existsSync(invoicePath)) {
                    logger.error(`Invoice file not found: ${invoicePath}`);
                    throw new Error(`Invoice file not found: invoice_${order.id}_${invoiceId}.pdf`);
                }
            }

            // Generate order items HTML
            const orderItemsHtml = order.orderItems.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        ${item.productName}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                        ${item.quantity}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        ${item.price.toFixed(2)} EUR
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        ${(item.price * item.quantity).toFixed(2)} EUR
                    </td>
                </tr>
            `).join('');

            // Payment method section based on UPN flag
            const paymentMethodHtml = upn ? `
                <div class="payment-info" style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; border-radius: 5px;">
                    <strong>💳 Način plačila:</strong> UPN nalog (bančno nakazilo)
                    <p style="margin: 10px 0 0 0;">
                        <strong>TRR:</strong> ${process.env.COMPANY_BANK_ACCOUNT || 'SI56 XXXX XXXX XXXX XXX'}<br>
                        <strong>Referenca:</strong> SI00 ${order.id}<br>
                        <strong>Namen:</strong> Naročilo #${order.id}
                    </p>
                </div>
                <div class="important" style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px;">
                    <strong>⚠️ Pomembno:</strong>
                    <p style="margin: 5px 0;">Vaše naročilo bo odposlano po prejemu plačila. Prosimo, plačajte najkasneje v 3 dneh.</p>
                </div>
                <div class="attachment-note" style="background-color: #e8f5e9; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;">
                    <strong>📎 Račun z UPN je priložen temu emailu</strong>
                </div>
            ` : `
                <div class="payment-info" style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; border-radius: 5px;">
                    <strong>💳 Način plačila:</strong> Plačilo ob prevzemu (gotovina ali kartica)
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Plačilo boste opravili ob prevzemu pošiljke.</p>
                </div>
            `;

            const additionalInstructionsHtml = upn ? `
                <p><strong>Navodila za plačilo:</strong></p>
                <ol>
                    <li>Odprite priložen račun (PDF)</li>
                    <li>Plačajte preko spletne banke ali na pošti</li>
                    <li>Po prejemu plačila bomo naročilo takoj odposlali</li>
                </ol>
            ` : `
                <p>Poslali vam bomo še eno e-pošto, ko bo vaše naročilo odposlano.</p>
            `;

            // HTML email template
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f0f0f0; padding: 10px; text-align: left; }
                        .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${upn ? '📄 Račun za naročilo' : 'Potrditev naročila'}</h1>
                        </div>
                        <div class="content">
                            <p>Pozdravljeni ${order.shippingFirstName} ${order.shippingLastName},</p>
                            <p>Hvala za vaše naročilo! ${upn ? 'V prilogi najdete račun z UPN nalogom za plačilo.' : 'Prejeli smo vaše naročilo in ga trenutno obdelujemo.'}</p>
                            
                            ${paymentMethodHtml}
                            
                            <div class="order-details">
                                <h2>Naročilo #${order.id}</h2>
                                <p><strong>Datum naročila:</strong> ${new Date(order.createdAt).toLocaleDateString('sl-SI', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}</p>
                                
                                <h3>Naslov za dostavo:</h3>
                                <p>
                                    ${order.shippingFirstName} ${order.shippingLastName}<br>
                                    ${order.shippingAddress}<br>
                                    ${order.shippingPostalCode} ${order.shippingCity}<br>
                                </p>
                                
                                <h3>Naročeni izdelki:</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Izdelek</th>
                                            <th style="text-align: center;">Količina</th>
                                            <th style="text-align: right;">Cena</th>
                                            <th style="text-align: right;">Skupaj</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orderItemsHtml}
                                    </tbody>
                                </table>
                                
                                <div class="total">
                                    ${upn ? 'Za plačilo:' : 'Skupaj:'} ${order.totalAmount.toFixed(2)} EUR
                                </div>
                            </div>
                            
                            ${additionalInstructionsHtml}
                            
                            <p>Če imate kakršnakoli vprašanja, nas prosim kontaktirajte na info@fritid.si</p>
                        </div>
                        <div class="footer">
                            <p>Hvala, ker nakupujete pri Fritid!</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Plain text version
            const paymentMethodText = upn ? `
Način plačila: UPN nalog (bančno nakazilo)

PODATKI ZA PLAČILO:
TRR: ${process.env.COMPANY_BANK_ACCOUNT || 'SI56 XXXX XXXX XXXX XXX'}
Referenca: SI00 ${order.id}
Namen: Naročilo #${order.id}

⚠️ POMEMBNO: Vaše naročilo bo odposlano po prejemu plačila. 
Prosimo, plačajte najkasneje v 3 dneh.

📎 Račun z UPN je priložen temu emailu.
` : `
Način plačila: Plačilo ob prevzemu (gotovina ali kartica)
Plačilo boste opravili ob prevzemu pošiljke.
`;

            const additionalInstructionsText = upn ? `
NAVODILA ZA PLAČILO:
1. Odprite priložen račun (PDF)
2. Plačajte preko spletne banke ali na pošti
3. Po prejemu plačila bomo naročilo takoj odposlali
` : `
Poslali vam bomo še eno e-pošto, ko bo vaše naročilo odposlano.
`;

            const textContent = `
${upn ? '📄 RAČUN ZA NAROČILO' : 'POTRDITEV NAROČILA'} - Naročilo #${order.id}

Pozdravljeni ${order.shippingFirstName} ${order.shippingLastName},

Hvala za vaše naročilo! ${upn ? 'V prilogi najdete račun z UPN nalogom za plačilo.' : 'Prejeli smo vaše naročilo in ga trenutno obdelujemo.'}

${paymentMethodText}

Podrobnosti naročila:
- Datum naročila: ${new Date(order.createdAt).toLocaleDateString('sl-SI')}

Naslov za dostavo:
${order.shippingFirstName} ${order.shippingLastName}
${order.shippingAddress}
${order.shippingPostalCode} ${order.shippingCity}
Telefon: ${order.shippingPhoneNumber}

Naročeni izdelki:
${order.orderItems.map(item => 
    `- ${item.productName} x ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} EUR`
).join('\n')}

${upn ? 'Za plačilo:' : 'Skupaj:'} ${order.totalAmount.toFixed(2)} EUR

${additionalInstructionsText}

Hvala, ker nakupujete pri Fritid!
            `;

            const recipientEmail = order.shippingEmail;
            const mailOptions = {
                from: `"Fritid" <${process.env.MAIL_USER}>`,
                to: recipientEmail,
                subject: upn ? `Račun za naročilo #${order.id}` : `Potrditev naročila - Naročilo #${order.id}`,
                text: textContent,
                html: htmlContent,
                attachments: upn ? [{
                    filename: `racun_${order.id}_${invoiceId}.pdf`,
                    path: invoicePath
                }] : []
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Order confirmation email sent successfully for order #${order.id}`, {
                messageId: info.messageId,
                recipient: recipientEmail
            });

            return {
                success: true,
                messageId: info.messageId,
                recipient: recipientEmail
            };
        } catch (error) {
            logger.error('Error sending order confirmation email:', error);
            throw error;
        }
    }

    /**
     * Send order notification to store owner
     * @param {Object} order - Order object from Order.js
     * @returns {Promise<Object>} - Email send result
     */
    async sendOwnerOrderNotification(order) {
        try {
            // Load order items if not already loaded
            if (!order.orderItems || order.orderItems.length === 0) {
                await order.loadOrderItems();
            }

            // Generate order items list
            const orderItemsList = order.orderItems.map(item => 
                `- ${item.productName} x ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} EUR`
            ).join('\n');

            // HTML email template
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .alert { background-color: #fff3cd; border-left: 4px solid #FF9800; padding: 10px; margin: 10px 0; }
                        .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
                        .customer-info { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔔 Novo naročilo!</h1>
                        </div>
                        <div class="content">
                            <div class="alert">
                                <strong>Prejeli ste novo naročilo v spletni trgovini Fritid.</strong>
                            </div>
                            
                            <div class="order-details">
                                <h2>Naročilo #${order.id}</h2>
                                <p><strong>Datum:</strong> ${new Date(order.createdAt).toLocaleDateString('sl-SI', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</p>
                                <p><strong>Status:</strong> ${order.status}</p>
                                
                                <div class="customer-info">
                                    <h3>Podatki o stranki:</h3>
                                    <p>
                                        <strong>Ime:</strong> ${order.shippingFirstName} ${order.shippingLastName}<br>
                                        <strong>Email:</strong> ${order.shippingEmail}<br>
                                        <strong>Telefon:</strong> ${order.shippingPhoneNumber}<br>
                                        <strong>Naslov:</strong> ${order.shippingAddress}, ${order.shippingPostalCode} ${order.shippingCity}
                                    </p>
                                </div>
                                
                                <h3>Naročeni izdelki:</h3>
                                <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
${order.orderItems.map(item => 
    `${item.productName}\n  Količina: ${item.quantity}\n  Cena: ${item.price.toFixed(2)} EUR\n  Skupaj: ${(item.price * item.quantity).toFixed(2)} EUR\n`
).join('\n')}
                                </pre>
                                
                                <div class="total">
                                    SKUPAJ: ${order.totalAmount.toFixed(2)} EUR
                                </div>
                            </div>
                            
                            <p><strong>Nadaljnji koraki:</strong></p>
                            <ol>
                                <li>Preveri zalogo izdelkov</li>
                                <li>Pripravi naročilo za pošiljanje</li>
                                <li>Posodobi status naročila v admin panelu</li>
                            </ol>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Plain text version
            const textContent = `
🔔 NOVO NAROČILO - Fritid

Prejeli ste novo naročilo v spletni trgovini!

NAROČILO #${order.id}
Datum: ${new Date(order.createdAt).toLocaleString('sl-SI')}
Status: ${order.status}

PODATKI O STRANKI:
Ime: ${order.shippingFirstName} ${order.shippingLastName}
Email: ${order.shippingEmail}
Telefon: ${order.shippingPhoneNumber}
Naslov: ${order.shippingAddress}, ${order.shippingPostalCode} ${order.shippingCity}

NAROČENI IZDELKI:
${orderItemsList}

SKUPAJ: ${order.totalAmount.toFixed(2)} EUR

Nadaljnji koraki:
1. Preveri zalogo izdelkov
2. Pripravi naročilo za pošiljanje
3. Posodobi status naročila v admin panelu
            `;

            const ownerEmail = process.env.OWNER_EMAIL;
            
            if (!ownerEmail) {
                logger.warn('OWNER_EMAIL not configured in environment variables');
                return {
                    success: false,
                    error: 'Owner email not configured'
                };
            }

            const mailOptions = {
                from: `"Fritid Sistem" <${process.env.MAIL_USER}>`,
                to: ownerEmail,
                subject: `🔔 Novo naročilo #${order.id} - ${order.shippingFirstName} ${order.shippingLastName}`,
                text: textContent,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Owner notification email sent successfully for order #${order.id}`, {
                messageId: info.messageId,
                recipient: ownerEmail
            });

            return {
                success: true,
                messageId: info.messageId,
                recipient: ownerEmail
            };
        } catch (error) {
            logger.error('Error sending owner notification email:', error);
            throw error;
        }
    }


}

module.exports = new MailService();
