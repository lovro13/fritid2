export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingPhoneNumber: string;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  productName: string;
  productImageUrl: string | null;
  color: string | null;
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
