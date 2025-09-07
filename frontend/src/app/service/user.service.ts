import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';
import { Order, PersonInfo } from '../models/order.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBase}`;

  private personInfoSubject = new BehaviorSubject<PersonInfo | null>(null);
  personInfo$ = this.personInfoSubject.asObservable();

  setPersonInfo(info: PersonInfo) {
    this.personInfoSubject.next(info);
  }

  // User profile operations
  getUserProfileById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`);
  }

  updateUserProfile(userId: number, profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/profile`, profileData);
  }

  // User orders operations
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

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${environment.apiBase}/users/${id}`);
  }

}
