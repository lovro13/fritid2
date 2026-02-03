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
// Search products (must come before /:id route)
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const products = await Product_1.default.search(q);
        res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
});
// Get products by price range (must come before /:id route)
router.get('/price-range', async (req, res) => {
    try {
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        if (!minPrice || !maxPrice) {
            return res.status(400).json({ error: 'minPrice and maxPrice are required' });
        }
        const products = await Product_1.default.findByPriceRange(parseFloat(minPrice), parseFloat(maxPrice));
        res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error fetching products by price range:', error);
        res.status(500).json({ error: 'Failed to fetch products by price range' });
    }
});
// Get all products
router.get('/', async (_req, res) => {
    try {
        const products = await Product_1.default.findAllActive();
        return res.json(products);
    }
    catch (error) {
        logger_1.default.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product_1.default.findById(Number(req.params.id));
        if (!product || !product.is_active) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        logger_1.default.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// Create product (admin only)
router.post('/', adminAuth_1.default, [
    (0, express_validator_1.body)('name').trim().escape().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('description').optional().trim().escape(),
    (0, express_validator_1.body)('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('image_url').trim().notEmpty().withMessage('Image URL is required'),
    (0, express_validator_1.body)('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    (0, express_validator_1.body)('category').optional().trim().escape(),
    (0, express_validator_1.body)('colors').optional(),
    (0, express_validator_1.body)('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    (0, express_validator_1.body)('minimax_id').optional().isInt({ min: 1 }).withMessage('minimax_id must be a positive integer')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Product creation validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const product = await Product_1.default.create(req.body);
        res.status(201).json(product);
    }
    catch (error) {
        logger_1.default.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// Update product (admin only)
router.put('/admin/:id', adminAuth_1.default, async (req, res) => {
    try {
        const product = await Product_1.default.findById(Number(req.params.id));
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const { name, description, price, imageUrl, colors, category, stockQuantity, isActive } = req.body;
        if (name !== undefined)
            product.name = name;
        if (description !== undefined)
            product.description = description;
        if (price !== undefined)
            product.price = price;
        if (imageUrl !== undefined)
            product.image_url = imageUrl;
        if (colors !== undefined)
            product.colors = colors;
        if (category !== undefined)
            product.category = category;
        if (stockQuantity !== undefined)
            product.stock_quantity = stockQuantity;
        if (isActive !== undefined)
            product.is_active = isActive;
        await Product_1.default.update(product.id, {
            name: product.name,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            colors: product.colors,
            category: product.category,
            stock_quantity: product.stock_quantity,
            is_active: product.is_active,
            minimax_id: product.minimax_id
        });
        res.json(product);
    }
    catch (error) {
        logger_1.default.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// Delete product (admin only)
router.delete('/:id', adminAuth_1.default, async (req, res) => {
    try {
        const deleted = await Product_1.default.delete(Number(req.params.id));
        if (!deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = router;
