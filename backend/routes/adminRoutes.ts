import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product';
import adminAuth from '../middleware/adminAuth';
import logger from '../logger';

const router = express.Router();

router.get('/products', adminAuth, async (_req: Request, res: Response) => {
  try {
    const products = await Product.findAllActive();
    logger.info('Admin fetched all products successfully');
    res.json(products);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(Number(req.params.id));
    if (!product) {
      logger.warn(`Product with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }
    logger.info(`Admin fetched product ${req.params.id}`);
    res.json(product);
  } catch (error) {
    logger.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/products', adminAuth, [
  body('name').trim().escape().notEmpty().withMessage('Name is required'),
  body('description').optional().trim().escape(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('image_url').trim().notEmpty().withMessage('Image URL is required'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category').optional().trim().escape()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Product validation failed', { errors: errors.array() });
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

    const product = await Product.create(productData);
    logger.info(`Admin created new product: ${name} (ID: ${product?.id})`);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', adminAuth, [
  body('name').optional().trim().escape(),
  body('description').optional().trim().escape(),
  body('price').optional().isFloat({ min: 0 }),
  body('image_url').optional().trim(),
  body('stock_quantity').optional().isInt({ min: 0 }),
  body('category').optional().trim().escape()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Product update validation failed', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const product = await Product.findById(Number(req.params.id));
    if (!product) {
      logger.warn(`Attempted to update non-existent product ${req.params.id}`);
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

    const updatedProduct = await Product.update(Number(req.params.id), productData);
    logger.info(`Admin updated product ${req.params.id}`);
    res.json(updatedProduct);
  } catch (error) {
    logger.error(`Error updating product ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await Product.delete(Number(req.params.id));
    if (!deleted) {
      logger.warn(`Attempted to delete non-existent product ${req.params.id}`);
      return res.status(404).json({ error: 'Product not found' });
    }
    logger.info(`Admin deleted product ${req.params.id}`);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting product ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = router;
