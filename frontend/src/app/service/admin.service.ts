import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Order } from '../models/order.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private adminApiUrl = `${environment.apiBase}/admin`;
  private ordersApiUrl = `${environment.apiBase}/orders`;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.adminApiUrl}/products`);
  }

  createProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>(`${this.adminApiUrl}/products`, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.adminApiUrl}/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/products/${id}`);
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.ordersApiUrl);
  }
}
