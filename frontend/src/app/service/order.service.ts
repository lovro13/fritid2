import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, PersonInfo } from '../models/order.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBase}`;

  private personInfoSubject = new BehaviorSubject<PersonInfo | null>(null);
  personInfo$ = this.personInfoSubject.asObservable();

  setPersonInfo(info: PersonInfo) {
    this.personInfoSubject.next(info);
  }

  // Order operations
  getUserOrders(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/user/${userId}`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}`);
  }

  // Checkout operation
  createOrder(orderData: any): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/order`, orderData);
  }
}
