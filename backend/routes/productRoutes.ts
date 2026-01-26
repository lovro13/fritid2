import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Product, { ProductInput } from '../models/Product';
import { authenticateToken } from '../middleware/auth';
import adminAuth from '../middleware/adminAuth';
import logger from '../logger';

const router = express.Router();

// Search products (must come before /:id route)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
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
router.get('/price-range', async (req: Request, res: Response) => {
  try {
    const minPrice = req.query.minPrice as string | undefined;
    const maxPrice = req.query.maxPrice as string | undefined;
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
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await Product.findAllActive();
    return res.json(products);
  } catch (error) {
    logger.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(Number(req.params.id));

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
router.post(
  '/',
  adminAuth,
  [
    body('name').trim().escape().notEmpty().withMessage('Name is required'),
    body('description').optional().trim().escape(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('image_url').trim().notEmpty().withMessage('Image URL is required'),
    body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('category').optional().trim().escape(),
    body('colors').optional(),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body('minimax_id').optional().isInt({ min: 1 }).withMessage('minimax_id must be a positive integer')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Product creation validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.create(req.body as ProductInput);
      res.status(201).json(product);
    } catch (error) {
      logger.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// Update product (admin only)
router.put('/admin/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const {
      name, description, price, imageUrl, colors,
      category, stockQuantity, isActive
    } = req.body as Record<string, any>;

    if (name !== undefined) (product as any).name = name;
    if (description !== undefined) (product as any).description = description;
    if (price !== undefined) (product as any).price = price;
    if (imageUrl !== undefined) (product as any).image_url = imageUrl;
    if (colors !== undefined) (product as any).colors = colors;
    if (category !== undefined) (product as any).category = category;
    if (stockQuantity !== undefined) (product as any).stock_quantity = stockQuantity;
    if (isActive !== undefined) (product as any).is_active = isActive;

    await Product.update(product.id, {
      name: (product as any).name,
      description: (product as any).description,
      price: (product as any).price,
      image_url: (product as any).image_url,
      colors: (product as any).colors,
      category: (product as any).category,
      stock_quantity: (product as any).stock_quantity,
      is_active: (product as any).is_active,
      minimax_id: (product as any).minimax_id
    });
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await Product.delete(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = router;
