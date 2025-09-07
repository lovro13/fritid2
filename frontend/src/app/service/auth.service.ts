import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model'


/**
 * AuthService
 * 
 * Core authentication service that manages:
 * - User authentication state (login/logout)
 * - JWT token management and validation
 * - User session management across app lifecycle
 * - Cross-tab authentication synchronization
 * 
 * This service handles ONLY authentication concerns. For user profile operations,
 * use UserProfileService instead.
 * 
 * Key features:
 * - Reactive state management with observables
 * - Automatic token validation on app startup
 * - Storage change detection for multi-tab scenarios
 * - Graceful error handling and cleanup
 * 
 * Used by:
 * - Route guards (auth.guard.ts, admin.guard.ts)
 * - Authentication components (auth.component.ts)
 * - Main app component for user state
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // comprehensive authentication service that manages user authentication state, 
  // token handling, and user session management
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
    this.initializeAuth();
    
    // Listen for storage changes (e.g., when interceptor clears localStorage)
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' || event.key === 'user') {
        this.handleStorageChange();
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

  private initializeAuth(): void {
    // Check if user is already logged in from localStorage
    const storedUser = this.getUser();
    const storedToken = this.getToken();
    
    if (storedUser && storedToken) {
      try {
        // First, check if token is expired client-side
        if (this.isTokenExpired(storedToken)) {
          this.logout();
          this.isInitialized.next(true);
          return;
        }

        // Set the user and token immediately to prevent logout on reload
        this.userSubject.next(storedUser);
        this.tokenSubject.next(storedToken);
        
        // Then validate with server in background
        this.validateToken(storedToken).subscribe({
          next: (isValid: boolean) => {
            if (!isValid) {
              this.logout();
            }
            this.isInitialized.next(true);
          },
          error: () => {
            this.logout();
            this.isInitialized.next(true);
          }
        });
      } catch (error) {
        this.logout();
        this.isInitialized.next(true);
      }
    } else {
      this.isInitialized.next(true);
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
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
}
