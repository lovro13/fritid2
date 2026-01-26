import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from './dbModel';
import logger from '../logger';

export interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  colors: string | null | unknown[];
  category: string | null;
  stock_quantity: number;
  is_active: number | boolean;
  minimax_id?: string | null;
  created_at: Date;
}

export interface ProductInput {
  name: string;
  description?: string | null;
  price?: number;
  image_url?: string | null;
  colors?: string | null | unknown[];
  category?: string | null;
  stock_quantity?: number;
  is_active?: number | boolean;
  minimax_id?: string | null;
}

class Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  colors: string[];
  minimax_id?: string | null;
  category: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: Date;

  constructor(productData: ProductRow) {
    this.id = productData.id;
    this.name = productData.name;
    this.description = productData.description ?? null;
    this.price = parseFloat(productData.price as any);
    this.image_url = productData.image_url ?? null;
    this.colors = this.parseColors(productData.colors);
    this.minimax_id = (productData as any).minimax_id ?? null;
    this.category = productData.category ?? null;
    this.stock_quantity = productData.stock_quantity;
    this.is_active = Boolean(productData.is_active);
    this.created_at = productData.created_at;
  }

  private parseColors(raw: ProductRow['colors']): string[] {
    try {
      if (!raw || raw === '') return [];
      if (raw === '[deafult]' || raw === '[default]') return ['Default'];
      if (typeof raw === 'string') return JSON.parse(raw);
      if (Array.isArray(raw)) return raw as string[];
      return [];
    } catch (error) {
      logger.warn('Failed to parse colors for product', { colors: raw });
      if (raw === '[deafult]' || raw === '[default]') return ['Default'];
      return [];
    }
  }

  static async findAllActive(): Promise<ProductRow[]> {
    const [rows] = await getPool().execute<ProductRow[]>(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC'
    );
    return rows;
  }

  static async findAll(): Promise<ProductRow[]> {
    const [rows] = await getPool().execute<ProductRow[]>(
      'SELECT * FROM products ORDER BY id DESC'
    );
    return rows;
  }

  static async findById(id: number): Promise<Product | null> {
    const [rows] = await getPool().execute<ProductRow[]>(
      'SELECT * FROM products WHERE id = ? LIMIT 1', [id]
    );
    return rows[0] ? new Product(rows[0]) : null;
  }

  static async search(q: string): Promise<ProductRow[]> {
    const like = `%${q}%`;
    const [rows] = await getPool().execute<ProductRow[]>(
      'SELECT * FROM products WHERE is_active = 1 AND (name LIKE ? OR description LIKE ?) ORDER BY id DESC',
      [like, like]
    );
    return rows;
  }

  static async findByPriceRange(minPrice: number, maxPrice: number): Promise<ProductRow[]> {
    const [rows] = await getPool().execute<ProductRow[]>(
      'SELECT * FROM products WHERE is_active = 1 AND price BETWEEN ? AND ? ORDER BY price ASC',
      [minPrice, maxPrice]
    );
    return rows;
  }

  static async create(data: ProductInput): Promise<Product | null> {
    const { name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id } = data;
    const [res] = await getPool().execute<ResultSetHeader>(
      `INSERT INTO products
             (name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description ?? null,
        price ?? 0,
        image_url ?? null,
        colors ?? null,
        category ?? null,
        stock_quantity ?? 0,
        is_active ?? 1,
        minimax_id ?? null
      ]
    );
    return this.findById(res.insertId);
  }

  static async delete(id: number): Promise<boolean> {
    const [res] = await getPool().execute<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  static async update(id: number, data: ProductInput): Promise<Product | null> {
    const { name, description, price, image_url, colors, category, stock_quantity, is_active, minimax_id } = data;
    await getPool().execute<ResultSetHeader>(
      `UPDATE products SET 
             name = ?,
             description = ?,
             price = ?,
             image_url = ?,
             colors = ?,
             category = ?,
             stock_quantity = ?,
             is_active = ?,
             minimax_id = ?
             WHERE id = ?`,
      [
        name,
        description ?? null,
        price ?? 0,
        image_url ?? null,
        colors ?? null,
        category ?? null,
        stock_quantity ?? 0,
        is_active ?? 1,
        minimax_id ?? null,
        id
      ]
    );
    return this.findById(id);
  }
}

export default Product;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = Product;
