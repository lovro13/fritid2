import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from './dbModel';
import User from './User';
import logger from '../logger';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'DELIVERY' | 'UPN' | 'PICKUP';

export interface OrderRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  total_amount: number | string;
  status: OrderStatus;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_email: string;
  shipping_address: string;
  shipping_postal_code: string;
  shipping_city: string;
  shipping_phone_number: string;
  payment_method: PaymentMethod;
  created_at: Date;
  type?: string | null;
}

export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  price: number;
  color: string | null;
}

export interface CreateOrderInput {
  optUserId?: number | null;
  totalAmount: number | string;
  status?: OrderStatus;
  shippingFirstName: string;
  shippingLastName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingPhoneNumber: string;
  paymentMethod?: PaymentMethod;
}

class Order {
  id: number;
  userId: number | null;
  totalAmount: number;
  status: OrderStatus;
  shippingFirstName: string;
  shippingLastName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingPhoneNumber: string;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  type?: string | null;
  orderItems: OrderItemDto[];

  constructor(orderData: OrderRow) {
    this.id = orderData.id;
    this.userId = orderData.user_id;
    this.totalAmount = parseFloat(orderData.total_amount as any);
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
    this.type = (orderData as any).type ?? null;
    this.orderItems = [];
  }

  static get STATUS(): Record<string, OrderStatus> {
    return {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED'
    };
  }

  static get PAYMENT_METHOD(): Record<string, PaymentMethod> {
    return {
      DELIVERY: 'DELIVERY',
      UPN: 'UPN',
      PICKUP: 'PICKUP'
    };
  }

  static async findAll(): Promise<Order[]> {
    const pool = getPool();
    const [orderRows] = await pool.execute<OrderRow[]>('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = orderRows.map((row) => new Order(row));

    if (orders.length === 0) {
      return orders;
    }

    const orderIds = orders.map((order) => order.id);
    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT oi.*, p.name as product_name, p.image_url as product_image_url 
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );

    const itemsByOrderId: Record<number, OrderItemDto[]> = {};
    itemRows.forEach((row: any) => {
      if (!itemsByOrderId[row.order_id]) {
        itemsByOrderId[row.order_id] = [];
      }
      itemsByOrderId[row.order_id].push({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        productImageUrl: row.product_image_url,
        quantity: row.quantity,
        price: parseFloat(row.price),
        color: row.color || null
      });
    });

    orders.forEach((order) => {
      order.orderItems = itemsByOrderId[order.id] || [];
    });

    return orders;
  }

  static async findById(id: number): Promise<Order | null> {
    const pool = getPool();
    const [rows] = await pool.execute<OrderRow[]>('SELECT * FROM orders WHERE id = ?', [id]);
    logger.info('Finding order by ID:', id);
    return rows.length > 0 ? new Order(rows[0]) : null;
  }

  static async findByUserId(userId: number): Promise<Order[]> {
    const pool = getPool();
    const [rows] = await pool.execute<OrderRow[]>('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows.map((row) => new Order(row));
  }

  static async create(orderData: CreateOrderInput): Promise<Order | null> {
    const pool = getPool();
    const {
      optUserId, totalAmount, status = Order.STATUS.PENDING,
      shippingFirstName, shippingLastName, shippingEmail,
      shippingAddress, shippingPostalCode, shippingCity, shippingPhoneNumber,
      paymentMethod = Order.PAYMENT_METHOD.DELIVERY
    } = orderData;

    let userId: number | null = optUserId ?? null;
    if (optUserId == null) {
      const userData = {
        firstName: shippingFirstName,
        lastName: shippingLastName,
        email: shippingEmail,
        address: shippingAddress,
        postalCode: shippingPostalCode,
        city: shippingCity,
        phoneNumber: shippingPhoneNumber,
        password: null
      };
      const newUser = await User.create(userData);
      userId = newUser.id;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO orders 
             (user_id, total_amount, status, shipping_first_name, shipping_last_name, 
              shipping_email, shipping_address, shipping_postal_code, shipping_city, shipping_phone_number, payment_method) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, totalAmount, status, shippingFirstName, shippingLastName,
      shippingEmail, shippingAddress, shippingPostalCode, shippingCity, shippingPhoneNumber, paymentMethod]
    );

    return Order.findById(result.insertId);
  }

  async updateStatus(newStatus: OrderStatus): Promise<Order> {
    const pool = getPool();
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [newStatus, this.id]
    );
    this.status = newStatus;
    return this;
  }

  async loadOrderItems(): Promise<Order> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT oi.*, p.name as product_name, p.image_url as product_image_url 
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?`,
      [this.id]
    );

    this.orderItems = rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productImageUrl: row.product_image_url,
      quantity: row.quantity,
      price: parseFloat(row.price),
      color: row.color || null
    }));

    return this;
  }

  static async delete(id: number): Promise<boolean> {
    const pool = getPool();
    await pool.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM orders WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

export default Order;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = Order;
