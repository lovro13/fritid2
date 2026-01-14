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

  private readonly USER_KEY = 'user';

  // Token is now managed by HttpOnly cookies
  // getToken, setToken, removeToken removed

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
    this.removeUser();
  }

  // isTokenExpired removed as tokens are HttpOnly

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
    console.log('ANTIGRAVITY: Initializing UserService. Stored user:', storedUser);

    // We optimistically set the user if data exists in localStorage
    if (storedUser) {
      console.log('ANTIGRAVITY: Restoring user session from localStorage');
      this.userSubject.next(storedUser);
      // Verify session via cookie
      this.validateTokenSilently();
    } else {
      console.log('ANTIGRAVITY: No stored user found.');
    }

    // Mark as initialized immediately
    this.isInitialized.next(true);
  }

  private validateTokenSilently(): void {
    console.log('ANTIGRAVITY: Validating token silently...');
    this.validateToken().subscribe({
      next: (isValid: boolean) => {
        console.log('ANTIGRAVITY: Token validation result:', isValid);
        if (!isValid) {
          console.warn('ANTIGRAVITY: Token validation failed, logging out user');
          this.logout(false);
        }
      },
      error: (error) => {
        console.error('ANTIGRAVITY: Token validation error:', error);
        this.logout(false);
      }
    });
  }

  private handleStorageChange(): void {
    const storedUser = this.getUser();
    console.log('ANTIGRAVITY: Storage changed. New user:', storedUser);

    // If user was removed, clear the service state
    if (!storedUser) {
      this.userSubject.next(null);
    }
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value; // Optimistic check
  }

  isReady(): boolean {
    return this.isInitialized.getValue();
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  validateToken(): Observable<boolean> {
    return this.http.post<{ valid: boolean }>(`${environment.apiBase}/auth/verify`, {})
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
        if (res.success && res.user) {
          console.log('ANTIGRAVITY: Login successful, saving user to localStorage');
          const user: User = {
            id: res.user.id,
            email: res.user.email,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            name: `${res.user.firstName} ${res.user.lastName}`,
            role: res.user.role
          };
          this.setUser(user);
          // Token is now handled by HttpOnly cookie
          this.userSubject.next(user);
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
      confirmPassword: userData.confirmPassword,
      phoneNumber: userData.phoneNumber,
      address: userData.address,
      postalCode: userData.postalCode,
      city: userData.city
    };
    console.log('Registration request:', registrationRequest);

    return this.http.post(`${environment.apiBase}/auth/register`, registrationRequest);
  }

  logout(notifyServer: boolean = true): void {
    if (notifyServer) {
      this.http.post(`${environment.apiBase}/auth/logout`, {}).subscribe({
        error: (err) => console.error('Logout error', err)
      });
    }
    this.removeUser();
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

  checkEmailExists(email: string): Observable<{ exists: boolean, validDomain: boolean }> {
    return this.http.get<{ exists: boolean, validDomain: boolean }>(`${this.apiUrl}/exists/email/${email}`);
  }

}
