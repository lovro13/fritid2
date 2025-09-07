import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model'


/**
 * UserService
 * Handles the registering and loggin of a user,
 * handles api calls and local storage and observalbes
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  // comprehensive authentication service that manages user authentication state, 
  // token handling, and user session management
  private apiUrl = `${environment.apiBase}/users`;
  private userSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private isInitialized = new BehaviorSubject<boolean>(false);
  public user$ = this.userSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isInitialized$ = this.isInitialized.asObservable();

  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  getUser(): any | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  clearAll(): void {
    this.removeToken();
    this.removeUser();
  }

  isTokenExpired(token: string): boolean {
    try {
      if (!token || token.split('.').length !== 3) {
        return true;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Add 5 minute buffer to account for clock skew
      return payload.exp < (currentTime + 300);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  constructor(private http: HttpClient) {
    // Initialize immediately and synchronously
    this.initializeSynchronously();
    
    // Listen for storage changes (e.g., when interceptor clears localStorage)
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' || event.key === 'user') {
        this.handleStorageChange();
      }
    });
  }

  private initializeSynchronously(): void {
    const storedUser = this.getUser();
    const storedToken = this.getToken();
    
    if (storedUser && storedToken && !this.isTokenExpired(storedToken)) {
      // Set user state immediately and synchronously
      this.userSubject.next(storedUser);
      this.tokenSubject.next(storedToken);
    }
    
    // Mark as initialized immediately
    this.isInitialized.next(true);
    
    // Validate token in background if exists
    if (storedToken) {
      setTimeout(() => {
        this.validateTokenSilently(storedToken);
      }, 100);
    }
  }

  private validateTokenSilently(token: string): void {
    this.validateToken(token).subscribe({
      next: (isValid: boolean) => {
        if (!isValid) {
          console.warn('Token validation failed, logging out user');
          this.logout();
        }
      },
      error: (error) => {
        console.error('Token validation error:', error);
        this.logout();
      }
    });
  }

  private handleStorageChange(): void {
    const storedUser = this.getUser();
    const storedToken = this.getToken();
    
    // If token or user was removed, clear the service state
    if (!storedUser || !storedToken) {
      this.userSubject.next(null);
      this.tokenSubject.next(null);
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    const user = this.userSubject.value;
    return !!(token && user && !this.isTokenExpired(token));
  }

  isReady(): boolean {
    return this.isInitialized.getValue();
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  validateToken(token: string): Observable<boolean> {
    if (!token || this.isTokenExpired(token)) {
      return of(false);
    }
    
    return this.http.post<{ valid: boolean }>(`${environment.apiBase}/auth/verify`, { token })
      .pipe(
        map((response: { valid: boolean }) => response.valid),
        catchError((error) => {
          console.error('Token validation failed:', error);
          return of(false);
        })
      );
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string; user?: any, token?: string }> {
    // Send login request to backend
    return this.http.post<{ success: boolean; message: string; user?: any, token?: string }>(
      `${environment.apiBase}/auth/login`,
      { email, password }
    ).pipe(
      tap(res => {
        if (res.success && res.user && res.token) {
          const user: User = {
            id: res.user.id,
            email: res.user.email,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            name: `${res.user.firstName} ${res.user.lastName}`,
            role: res.user.role
          };
          this.setUser(user);
          this.setToken(res.token);
          this.userSubject.next(user);
          this.tokenSubject.next(res.token);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    // Send registration data to backend
    const registrationRequest = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.confirmPassword
    };
    console.log('Registration request:', registrationRequest);
    
    return this.http.post(`${environment.apiBase}/auth/register`, registrationRequest);
  }

  logout(): void {
    this.clearAll();
    this.userSubject.next(null);
    this.tokenSubject.next(null);
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  getUserProfileById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  updateUserProfile(userId: number, profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}/profile`, profileData);
  }

}
