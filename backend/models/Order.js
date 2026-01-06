const { getPool } = require('./dbModel');
const User = require('../models/User')
const logger = require('../logger');
const { log } = require('winston');

class Order {
    constructor(orderData) {
        this.id = orderData.id;
        this.userId = orderData.user_id;
        this.totalAmount = parseFloat(orderData.total_amount);
        this.status = orderData.status;
        this.shippingFirstName = orderData.shipping_first_name;
        this.shippingLastName = orderData.shipping_last_name;
        this.shippingEmail = orderData.shipping_email;
        this.shippingAddress = orderData.shipping_address;
        this.shippingPostalCode = orderData.shipping_postal_code;
        this.shippingCity = orderData.shipping_city;
        this.shippingPhoneNumber = orderData.shipping_phone_number;
        this.paymentMethod = orderData.payment_method;
        this.createdAt = orderData.created_at;
        this.type = orderData.type;
        this.orderItems = [];
    }

    static get STATUS() {
        return {
            PENDING: 'PENDING',
            CONFIRMED: 'CONFIRMED',
            PROCESSING: 'PROCESSING',
            SHIPPED: 'SHIPPED',
            DELIVERED: 'DELIVERED',
            CANCELLED: 'CANCELLED'
        };
    }

    static get PAYMENT_METHOD() {
        return {
            DELIVERY: 'delivery',
            UPN: 'upn'
        };
    }

    static async findAll() {
        const pool = getPool();
        
        // Get all orders
        const [orderRows] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = orderRows.map(row => new Order(row));
        
        if (orders.length === 0) {
            return orders;
        }
        
        // Get all order IDs
        const orderIds = orders.map(order => order.id);
        
        // Load all order items in a single query
        const [itemRows] = await pool.execute(
            `SELECT oi.*, p.name as product_name, p.image_url as product_image_url 
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
            orderIds
        );
        
        // Group items by order_id
        const itemsByOrderId = {};
        itemRows.forEach(row => {
            if (!itemsByOrderId[row.order_id]) {
                itemsByOrderId[row.order_id] = [];
            }
            itemsByOrderId[row.order_id].push({
                id: row.id,
                product_id: row.product_id,
                product_name: row.product_name,
                product_image_url: row.product_image_url,
                quantity: row.quantity,
                price: parseFloat(row.price),
                color: row.color || null
            });
        });
        
        // Assign items to their respective orders
        orders.forEach(order => {
            order.orderItems = itemsByOrderId[order.id] || [];
        });
        
        return orders;
    }

    static async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
        logger.info("Finding order by ID:", id);
        logger.info("Database returned rows:", rows);
        logger.info("Making order from row:", rows[0]);
        return rows.length > 0 ? new Order(rows[0]) : null;
    }

    static async findByUserId(userId) {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows.map(row => new Order(row));
    }

    static async create(orderData) {
        const pool = getPool();
        const {
            optUserId, totalAmount, status = Order.STATUS.PENDING,
            shippingFirstName, shippingLastName, shippingEmail,
            shippingAddress, shippingPostalCode, shippingCity, shippingPhoneNumber,
            paymentMethod = Order.PAYMENT_METHOD.DELIVERY
        } = orderData;
        let userId;
        if (optUserId == null) {
            const userData = {
                firstName: shippingFirstName,
                lastName: shippingLastName,
                email: shippingEmail,
                address: shippingAddress,
                postalCode: shippingPostalCode,
                city: shippingCity,
                phoneNumber: shippingPhoneNumber
            };
            const newUser = await User.create(userData);
            userId = newUser.id;
        } else {
            userId = optUserId
        }
        const [result] = await pool.execute(
            `INSERT INTO orders 
             (user_id, total_amount, status, shipping_first_name, shipping_last_name, 
              shipping_email, shipping_address, shipping_postal_code, shipping_city, shipping_phone_number, payment_method) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, totalAmount, status, shippingFirstName, shippingLastName,
             shippingEmail, shippingAddress, shippingPostalCode, shippingCity, shippingPhoneNumber, paymentMethod]
        );

        return Order.findById(result.insertId);
    }

    async updateStatus(newStatus) {
        const pool = getPool();
        await pool.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [newStatus, this.id]
        );
        this.status = newStatus;
        return this;
    }


    async loadOrderItems() {
        const pool = getPool();
        const [rows] = await pool.execute(
            `SELECT oi.*, p.name as product_name, p.image_url as product_image_url 
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?`,
            [this.id]
        );
        
        this.orderItems = rows.map(row => ({
            id: row.id,
            product_id: row.product_id,
            product_name: row.product_name,
            product_image_url: row.product_image_url,
            quantity: row.quantity,
            price: parseFloat(row.price),
            color: row.color || null
        }));
        
        return this;
    }

    static async delete(id) {
        const pool = getPool();
        
        // First delete order items
        await pool.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
        
        // Then delete the order
        const [result] = await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Order;
