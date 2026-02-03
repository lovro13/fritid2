"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbModel_1 = require("./dbModel");
class OrderItem {
    constructor(orderItemData) {
        this.id = orderItemData.id;
        this.orderId = orderItemData.order_id;
        this.productId = orderItemData.product_id;
        this.quantity = orderItemData.quantity;
        this.price = parseFloat(orderItemData.price);
        this.color = orderItemData.color || null;
    }
    static async findByOrderId(orderId) {
        const pool = (0, dbModel_1.getPool)();
        const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        return rows.map((row) => new OrderItem(row));
    }
    static async create(orderItemData) {
        const pool = (0, dbModel_1.getPool)();
        const { orderId, productId, quantity, price, color } = orderItemData;
        const [result] = await pool.execute('INSERT INTO order_items (order_id, product_id, quantity, price, color) VALUES (?, ?, ?, ?, ?)', [orderId, productId, quantity, price, color || null]);
        return new OrderItem({
            id: result.insertId,
            order_id: orderId,
            product_id: productId,
            quantity,
            price,
            color: color || null
        });
    }
    static async createMultiple(orderItems) {
        const pool = (0, dbModel_1.getPool)();
        const createdItems = [];
        for (const item of orderItems) {
            const [result] = await pool.execute('INSERT INTO order_items (order_id, product_id, quantity, price, color) VALUES (?, ?, ?, ?, ?)', [item.orderId, item.productId, item.quantity, item.price, item.color || null]);
            createdItems.push(new OrderItem({
                id: result.insertId,
                order_id: item.orderId,
                product_id: item.productId,
                quantity: item.quantity,
                price: item.price,
                color: item.color || null
            }));
        }
        return createdItems;
    }
    static async deleteByOrderId(orderId) {
        const pool = (0, dbModel_1.getPool)();
        const [result] = await pool.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        return result.affectedRows;
    }
}
exports.default = OrderItem;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = OrderItem;
