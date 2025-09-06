export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url: string;
  colors: string[];
  category?: string;
  stock_quantity?: number;
  is_active?: boolean;
}