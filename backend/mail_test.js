const dotenv = require('dotenv');
const path = require('path');

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });
console.log(`Loading environment from: ${envPath}`);
const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
async function sendTestEmail() {
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        }
    });

    // Email options
    const mailOptions = {
        from: `"Fritid Test" <${process.env.MAIL_USER}>`,
        to: 'lovro.zskrlj@gmail.com',
        subject: 'Test Email from Fritid',
        text: 'This is a test email sent from the Fritid backend.'
    };

    // Send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

sendTestEmail();
