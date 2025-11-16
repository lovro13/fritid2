const dotenv = require('dotenv');

// Load environment variables
const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });
console.log(`Loading environment from: ${envPath}`);

const Order = require('./models/Order');
const mailService = require('./services/mailService');
const { initializeDatabase } = require('./models/dbModel');

async function testOrderConfirmationEmail() {
    try {
        // Initialize database connection
        await initializeDatabase();
        console.log('Database connected');

        // Get the most recent order or specify an order ID
        const orderId = 60; // Random order with one čebelica in it
        
        let order;
        order = await Order.findById(orderId);
        console.log(`Found order #${orderId}`);

        // Load order items
        await order.loadOrderItems();
        console.log(`Order has ${order.orderItems.length} items`);

        // Send confirmation email
        console.log('Sending order confirmation email...');
        const result = await mailService.sendOrderConfirmation(order);
        
        console.log('Email sent successfully!');
        console.log('Result:', result);
        console.log(`Email sent to: ${result.recipient}`);
        console.log(`Message ID: ${result.messageId}`);
        
        const ownerResult = await mailService.sendOwnerOrderNotification(order);

        console.log('Owner notification email sent successfully!');
        console.log('Owner Result:', ownerResult);

        const upnResult = await mailService.sendOrderConfirmation(order, true, 47306635);

        console.log('UPN email sent successfully!');
        console.log('UPN Result:', upnResult);
        console.log(`UPN Email sent to: ${upnResult.recipient}`);
        console.log(`UPN Message ID: ${upnResult.messageId}`);

        console.log('Test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error in test:', error);
        process.exit(1);
    }
}

// Run the test
testOrderConfirmationEmail();
