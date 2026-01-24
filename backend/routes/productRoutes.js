const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../logger');

const router = express.Router();

// Search products (must come before /:id route)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const products = await Product.search(q);
        res.json(products);
    } catch (error) {
        logger.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
});

// Get products by price range (must come before /:id route)
router.get('/price-range', async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        if (!minPrice || !maxPrice) {
            return res.status(400).json({ error: 'minPrice and maxPrice are required' });
        }
        const products = await Product.findByPriceRange(parseFloat(minPrice), parseFloat(maxPrice));
        res.json(products);
    } catch (error) {
        logger.error('Error fetching products by price range:', error);
        res.status(500).json({ error: 'Failed to fetch products by price range' });
    }
});

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.findAllActive();
        return res.json(products);

    } catch (error) {
        logger.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        // Product not found OR product is inactive (IDOR protection)
        if (!product || !product.is_active) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        logger.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Create product (admin only)
router.post('/', adminAuth, [
    body('name').trim().escape().notEmpty().withMessage('Name is required'),
    body('description').optional().trim().escape(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('image_url').trim().notEmpty().withMessage('Image URL is required'),
    body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('category').optional().trim().escape(),
    body('colors').optional(),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body('minimax_id').optional().isInt({ min: 1 }).withMessage('minimax_id must be a positive integer')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Product creation validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        logger.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product (admin only)
router.put('/admin/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update product properties
        const {
            name, description, price, imageUrl, colors,
            category, stockQuantity, isActive
        } = req.body;

        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;
        if (colors !== undefined) product.colors = colors;
        if (category !== undefined) product.category = category;
        if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
        if (isActive !== undefined) product.isActive = isActive;

        await product.save();
        res.json(product);
    } catch (error) {
        logger.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const deleted = await Product.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
