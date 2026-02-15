"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Product_1 = __importDefault(require("../models/Product"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const logger_1 = __importDefault(require("../logger"));
const router = express_1.default.Router();
router.get('/products', adminAuth_1.default, async (_req, res) => {
    try {
        const products = await Product_1.default.findAllActive();
        logger_1.default.info('Admin fetched all products successfully');
        res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
router.get('/products/:id', adminAuth_1.default, async (req, res) => {
    try {
        const product = await Product_1.default.findById(Number(req.params.id));
        if (!product) {
            logger_1.default.warn(`Product with ID ${req.params.id} not found`);
            return res.status(404).json({ error: 'Product not found' });
        }
        logger_1.default.info(`Admin fetched product ${req.params.id}`);
        res.json(product);
    }
    catch (error) {
        logger_1.default.error(`Error fetching product ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
router.post('/products', adminAuth_1.default, [
    (0, express_validator_1.body)('name').trim().escape().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('description').optional().trim().escape(),
    (0, express_validator_1.body)('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('image_url').trim().notEmpty().withMessage('Image URL is required'),
    (0, express_validator_1.body)('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    (0, express_validator_1.body)('category').optional().trim().escape()
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Product validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { name, description, price, image_url, colors, category, stock_quantity, display_order } = req.body;
        const productData = {
            name,
            description: description || '',
            price: parseFloat(price),
            image_url,
            colors: Array.isArray(colors) ? JSON.stringify(colors) : colors || '[]',
            category: category || '',
            stock_quantity: parseInt(stock_quantity, 10) || 0,
            display_order: display_order !== undefined ? parseInt(display_order, 10) : 0
        };
        const product = await Product_1.default.create(productData);
        logger_1.default.info(`Admin created new product: ${name} (ID: ${product?.id})`);
        res.status(201).json(product);
    }
    catch (error) {
        logger_1.default.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
router.put('/products/:id', adminAuth_1.default, [
    (0, express_validator_1.body)('name').optional().trim().escape(),
    (0, express_validator_1.body)('description').optional().trim().escape(),
    (0, express_validator_1.body)('price').optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)('image_url').optional().trim(),
    (0, express_validator_1.body)('stock_quantity').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('category').optional().trim().escape()
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Product update validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const product = await Product_1.default.findById(Number(req.params.id));
        if (!product) {
            logger_1.default.warn(`Attempted to update non-existent product ${req.params.id}`);
            return res.status(404).json({ error: 'Product not found' });
        }
        const { name, description, price, image_url, colors, category, stock_quantity, is_active, display_order } = req.body;
        const productData = {
            name: name ?? product.name,
            description: description ?? product.description,
            price: price !== undefined ? parseFloat(price) : product.price,
            image_url: image_url ?? product.image_url,
            colors: colors !== undefined ? (Array.isArray(colors) ? JSON.stringify(colors) : colors) : product.colors,
            category: category ?? product.category,
            stock_quantity: stock_quantity !== undefined ? parseInt(stock_quantity, 10) : product.stock_quantity,
            is_active: is_active !== undefined ? Boolean(is_active) : product.is_active,
            display_order: display_order !== undefined ? parseInt(display_order, 10) : product.display_order
        };
        const updatedProduct = await Product_1.default.update(Number(req.params.id), productData);
        logger_1.default.info(`Admin updated product ${req.params.id}`);
        res.json(updatedProduct);
    }
    catch (error) {
        logger_1.default.error(`Error updating product ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
router.delete('/products/:id', adminAuth_1.default, async (req, res) => {
    try {
        const deleted = await Product_1.default.delete(Number(req.params.id));
        if (!deleted) {
            logger_1.default.warn(`Attempted to delete non-existent product ${req.params.id}`);
            return res.status(404).json({ error: 'Product not found' });
        }
        logger_1.default.info(`Admin deleted product ${req.params.id}`);
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        logger_1.default.error(`Error deleting product ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = router;
