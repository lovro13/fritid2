import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

/**
 * UserProfileService
 * 
 * Handles user profile management operations including:
 * - Fetching user data by ID
 * - Updating user profile information
 * - Managing user-specific data operations
 * 
 * This service is separate from AuthService to follow Single Responsibility Principle.
 * Use this service when you need to work with user profile data but don't need
 * authentication state management.
 * 
 * Usage examples:
 * - Checkout component: Get current user's profile data
 * - Profile settings: Update user information
 * - Admin panel: Fetch user details
 */
@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  constructor(private http: HttpClient) {}

  /**
   * Fetches user profile data by user ID
   * @param id - The user ID to fetch
   * @returns Observable<User> - User profile data
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${environment.apiBase}/users/${id}`);
  }

  /**
   * Updates user profile information
   * @param id - The user ID to update
   * @param profileData - Partial user data to update
   * @returns Observable<User> - Updated user profile data
   */
  updateUserProfile(id: number, profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${environment.apiBase}/users/${id}/profile`, profileData);
  }
}
