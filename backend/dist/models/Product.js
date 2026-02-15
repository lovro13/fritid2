"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dbModel_1 = require("./dbModel");
const logger_1 = __importDefault(require("../logger"));
class Product {
    constructor(productData) {
        this.id = productData.id;
        this.name = productData.name;
        this.description = productData.description ?? null;
        this.price = parseFloat(productData.price);
        this.image_url = productData.image_url ?? null;
        this.colors = this.parseColors(productData.colors);
        this.minimax_id = productData.minimax_id ?? null;
        this.category = productData.category ?? null;
        this.stock_quantity = productData.stock_quantity;
        this.is_active = Boolean(productData.is_active);
        this.display_order = productData.display_order ?? 0;
        this.created_at = productData.created_at;
    }
    parseColors(raw) {
        try {
            if (!raw || raw === '')
                return [];
            if (raw === '[deafult]' || raw === '[default]')
                return ['Default'];
            if (typeof raw === 'string')
                return JSON.parse(raw);
            if (Array.isArray(raw))
                return raw;
            return [];
        }
        catch (error) {
            logger_1.default.warn('Failed to parse colors for product', { colors: raw });
            if (raw === '[deafult]' || raw === '[default]')
                return ['Default'];
            return [];
        }
    }
    static async findAllActive() {
        const [rows] = await (0, dbModel_1.getPool)().execute('SELECT * FROM products WHERE is_active = 1 ORDER BY display_order ASC, id DESC');
        return rows;
    }
    static async findAll() {
        const [rows] = await (0, dbModel_1.getPool)().execute('SELECT * FROM products ORDER BY display_order ASC, id DESC');
        return rows;
    }
    static async findById(id) {
        const [rows] = await (0, dbModel_1.getPool)().execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
        return rows[0] ? new Product(rows[0]) : null;
    }
    static async search(q) {
        const like = `%${q}%`;
        const [rows] = await (0, dbModel_1.getPool)().execute('SELECT * FROM products WHERE is_active = 1 AND (name LIKE ? OR description LIKE ?) ORDER BY display_order ASC, id DESC', [like, like]);
        return rows;
    }
    static async findByPriceRange(minPrice, maxPrice) {
        const [rows] = await (0, dbModel_1.getPool)().execute('SELECT * FROM products WHERE is_active = 1 AND price BETWEEN ? AND ? ORDER BY price ASC', [minPrice, maxPrice]);
        return rows;
    }
    static async create(data) {
        const { name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id } = data;
        const [res] = await (0, dbModel_1.getPool)().execute(`INSERT INTO products
             (name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            name,
            description ?? null,
            price ?? 0,
            image_url ?? null,
            colors ?? null,
            category ?? null,
            stock_quantity ?? 0,
            is_active ?? 1,
            minimax_id ?? null
        ]);
        return this.findById(res.insertId);
    }
    static async delete(id) {
        const [res] = await (0, dbModel_1.getPool)().execute('DELETE FROM products WHERE id = ?', [id]);
        return res.affectedRows > 0;
    }
    static async update(id, data) {
        const { name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id, display_order } = data;
        await (0, dbModel_1.getPool)().execute(`UPDATE products SET 
             name = ?,
             description = ?,
             price = ?,
             image_url = ?,
             colors = ?,
             category = ?,
             stock_quantity = ?,
             is_active = ?,
             minimax_id = ?,
             display_order = ?
             WHERE id = ?`, [
            name,
            description ?? null,
            price ?? 0,
            image_url ?? null,
            colors ?? null,
            category ?? null,
            stock_quantity ?? 0,
            is_active ?? 1,
            minimax_id ?? null,
            display_order ?? 0,
            id
        ]);
        return this.findById(id);
    }
}
exports.default = Product;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = Product;
