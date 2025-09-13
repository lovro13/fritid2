export interface Order {
  id: number;
  user_id: number;
  userId: number;
  total_amount: number;
  totalAmount: number;
  status: string;
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingEmail?: string;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingCity?: string;
  shippingPhoneNumber?: string;
  created_at: string;
  createdAt: string;
  updated_at: string;
  order_items: OrderItem[];
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
  product_image_url: string;
}

export interface PersonInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  companyID?: string;
}
