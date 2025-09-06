export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phoneNumber?: string;
  role?: 'user' | 'admin';
}