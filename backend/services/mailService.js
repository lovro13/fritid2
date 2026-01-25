const nodemailer = require('nodemailer');
const logger = require('../logger');
const fs = require('fs');
const path = require('path');
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE || 5.99);

/**
 * Escape HTML entities to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

        // Pre-load templates
        this.templates = {
            orderConfirmation: fs.readFileSync(path.join(__dirname, '../templates/orderConfirmation.html'), 'utf8'),
            ownerNotification: fs.readFileSync(path.join(__dirname, '../templates/ownerNotification.html'), 'utf8')
        };
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

            // Generate order items HTML with escaped user data
            const subtotal = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const orderItemsHtml = order.orderItems.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        ${escapeHtml(item.productName)}${item.color ? ` - ${escapeHtml(item.color)}` : ''}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                        ${escapeHtml(String(item.quantity))}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        ${item.price.toFixed(2)} EUR
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        ${(item.price * item.quantity).toFixed(2)} EUR
                    </td>
                </tr>
            `).join('') + `<tr><td colspan="3" style="padding: 10px; text-align: right;"><strong>Vmesni seštevek:</strong></td><td style="padding: 10px; text-align: right;"><strong>${subtotal.toFixed(2)} EUR</strong></td></tr><tr><td colspan="3" style="padding: 10px; text-align: right;"><strong>Dostava:</strong></td><td style="padding: 10px; text-align: right;"><strong>${SHIPPING_FEE.toFixed(2)} EUR</strong></td></tr>`;

            // Prepare template variables
            const title = upn ? '📄 Račun za naročilo' : 'Potrditev naročila';
            const introText = upn ? 'V prilogi najdete račun z UPN nalogom za plačilo.' : 'Prejeli smo vaše naročilo in ga trenutno obdelujemo.';

            let paymentInfoHtml = '';
            let additionalInstructionsHtml = '';

            if (upn) {
                paymentInfoHtml = `
                <div class="payment-info upn" style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; border-radius: 5px;">
                    <strong>💳 Način plačila:</strong> UPN nalog (bančno nakazilo)
                    <p style="margin: 10px 0 0 0;">
                        <strong>TRR:</strong> ${escapeHtml(process.env.COMPANY_BANK_ACCOUNT || 'SI56 XXXX XXXX XXXX XXX')}<br>
                        <strong>Referenca:</strong> SI00 ${escapeHtml(String(order.id))}<br>
                        <strong>Namen:</strong> Naročilo #${escapeHtml(String(order.id))}
                    </p>
                </div>
                <div class="important" style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px;">
                    <strong>⚠️ Pomembno:</strong>
                    <p style="margin: 5px 0;">Vaše naročilo bo odposlano po prejemu plačila. Prosimo, plačajte najkasneje v 3 dneh.</p>
                </div>
                <div class="attachment-note" style="background-color: #e8f5e9; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;">
                    <strong>📎 Račun z UPN je priložen temu emailu</strong>
                </div>`;

                additionalInstructionsHtml = `
                <p><strong>Navodila za plačilo:</strong></p>
                <ol>
                    <li>Odprite priložen račun (PDF)</li>
                    <li>Plačajte preko spletne banke ali na pošti</li>
                    <li>Po prejemu plačila bomo naročilo takoj odposlali</li>
                </ol>`;
            } else {
                paymentInfoHtml = `
                <div class="payment-info" style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; border-radius: 5px;">
                    <strong>💳 Način plačila:</strong> Plačilo ob prevzemu (gotovina ali kartica)
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Plačilo boste opravili ob prevzemu pošiljke.</p>
                </div>`;

                additionalInstructionsHtml = `
                <p>Poslali vam bomo še eno e-pošto, ko bo vaše naročilo odposlano.</p>`;
            }

            // Replace variables in template with escaped user data
            let htmlContent = this.templates.orderConfirmation
                .replace('{{title}}', escapeHtml(title))
                .replace(/{{firstName}}/g, escapeHtml(order.shippingFirstName))
                .replace(/{{lastName}}/g, escapeHtml(order.shippingLastName))
                .replace('{{introText}}', escapeHtml(introText))
                .replace('{{paymentInfoHtml}}', paymentInfoHtml) // Already contains escaped order.id
                .replace(/{{orderId}}/g, escapeHtml(String(order.id)))
                .replace('{{orderDate}}', escapeHtml(new Date(order.createdAt).toLocaleDateString('sl-SI', { year: 'numeric', month: 'long', day: 'numeric' })))
                .replace('{{address}}', escapeHtml(order.shippingAddress))
                .replace('{{postalCode}}', escapeHtml(order.shippingPostalCode))
                .replace('{{city}}', escapeHtml(order.shippingCity))
                .replace('{{orderItemsHtml}}', orderItemsHtml) // Already escaped
                .replace('{{totalLabel}}', escapeHtml(upn ? 'Za plačilo:' : 'Skupaj:'))
                .replace('{{totalAmount}}', order.totalAmount.toFixed(2))
                .replace('{{additionalInstructionsHtml}}', additionalInstructionsHtml);

            // Plain text version (simplified for brevity, ideally also a template)
            const textContent = `Naročilo #${order.id} - ${upn ? 'Za plačilo' : 'Potrditev'}`;

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
     * @param {string|null} glsLabelPath - Path to GLS label PDF (optional)
     * @returns {Promise<Object>} - Email send result
     */
    async sendOwnerOrderNotification(order, glsLabelPath = null) {
        try {
            logger.info(`Preparing to send owner notification for order #${order.id}, GLS label: ${glsLabelPath ? 'yes' : 'no'}`);

            // Validate GLS label exists if path provided
            if (glsLabelPath && !fs.existsSync(glsLabelPath)) {
                logger.warn(`GLS label file not found: ${glsLabelPath}`);
                glsLabelPath = null; // Don't attach if file doesn't exist
            }

            // Load order items if not already loaded
            if (!order.orderItems || order.orderItems.length === 0) {
                await order.loadOrderItems();
            }

            // Generate order items text for owner
            const subtotalOwner = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const orderItemsText = order.orderItems.map(item =>
                `${item.productName}\n  Količina: ${item.quantity}\n  Cena: ${item.price.toFixed(2)} EUR\n  Skupaj: ${(item.price * item.quantity).toFixed(2)} EUR`
            ).join('\n\n') + `\n\nVmesni seštevek: ${subtotalOwner.toFixed(2)} EUR\nDostava: ${SHIPPING_FEE.toFixed(2)} EUR`;

            // Replace variables in template with escaped user data
            let htmlContent = this.templates.ownerNotification
                .replace(/{{orderId}}/g, escapeHtml(String(order.id)))
                .replace('{{orderDate}}', escapeHtml(new Date(order.createdAt).toLocaleDateString('sl-SI', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })))
                .replace('{{status}}', escapeHtml(order.status))
                .replace('{{firstName}}', escapeHtml(order.shippingFirstName))
                .replace('{{lastName}}', escapeHtml(order.shippingLastName))
                .replace('{{email}}', escapeHtml(order.shippingEmail))
                .replace('{{phone}}', escapeHtml(order.shippingPhoneNumber))
                .replace('{{address}}', escapeHtml(order.shippingAddress))
                .replace('{{postalCode}}', escapeHtml(order.shippingPostalCode))
                .replace('{{city}}', escapeHtml(order.shippingCity))
                .replace('{{orderItemsText}}', escapeHtml(orderItemsText))
                .replace('{{totalAmount}}', order.totalAmount.toFixed(2));

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
                subject: `🔔 Novo naročilo #${order.id} - ${escapeHtml(order.shippingFirstName)} ${escapeHtml(order.shippingLastName)}`,
                text: `Novo naročilo #${order.id} od ${order.shippingFirstName} ${order.shippingLastName}`,
                html: htmlContent,
                attachments: glsLabelPath ? [{
                    filename: `GLS_nalepka_narocilo_${order.id}.pdf`,
                    path: glsLabelPath
                }] : []
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Owner notification email sent successfully for order #${order.id}${glsLabelPath ? ' with GLS label' : ''}`, {
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
