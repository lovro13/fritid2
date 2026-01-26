import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from './dbModel';

export interface OrderItemRow extends RowDataPacket {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number | string;
  color: string | null;
}

export interface CreateOrderItemInput {
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  color?: string | null;
}

class OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  color: string | null;

  constructor(orderItemData: OrderItemRow) {
    this.id = orderItemData.id;
    this.orderId = orderItemData.order_id;
    this.productId = orderItemData.product_id;
    this.quantity = orderItemData.quantity;
    this.price = parseFloat(orderItemData.price as any);
    this.color = orderItemData.color || null;
  }

  static async findByOrderId(orderId: number): Promise<OrderItem[]> {
    const pool = getPool();
    const [rows] = await pool.execute<OrderItemRow[]>(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );
    return rows.map((row) => new OrderItem(row));
  }

  static async create(orderItemData: CreateOrderItemInput): Promise<OrderItem> {
    const pool = getPool();
    const { orderId, productId, quantity, price, color } = orderItemData;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO order_items (order_id, product_id, quantity, price, color) VALUES (?, ?, ?, ?, ?)',
      [orderId, productId, quantity, price, color || null]
    );

    return new OrderItem({
      id: result.insertId,
      order_id: orderId,
      product_id: productId,
      quantity,
      price,
      color: color || null
    } as OrderItemRow);
  }

  static async createMultiple(orderItems: CreateOrderItemInput[]): Promise<OrderItem[]> {
    const pool = getPool();
    const createdItems: OrderItem[] = [];

    for (const item of orderItems) {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO order_items (order_id, product_id, quantity, price, color) VALUES (?, ?, ?, ?, ?)',
        [item.orderId, item.productId, item.quantity, item.price, item.color || null]
      );

      createdItems.push(new OrderItem({
        id: result.insertId,
        order_id: item.orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        color: item.color || null
      } as OrderItemRow));
    }

    return createdItems;
  }

  static async deleteByOrderId(orderId: number): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    return result.affectedRows;
  }
}

export default OrderItem;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = OrderItem;
