import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  auth_provider: string;
  provider_sub?: string;
  profile_photo_url?: string;
  onboarding_step: string;
  institution_id?: number;
  institution_role?: string;
  institution_verified: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  /**
   * Load user from localStorage on service initialization
   */
  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !!this.getToken();
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Store authentication data
   */
  storeAuthData(user: User, token: string, refreshToken: string): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.currentUserSubject.next(user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
  }

  /**
   * Handle post-login navigation based on user state
   */
  postLoginNavigate(user: User, intendedUrl?: string): void {
    // Store auth data
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    
    if (token && refreshToken) {
      this.storeAuthData(user, token, refreshToken);
    }

    // Navigate based on onboarding state
    if (!user.role || user.onboarding_step === 'need_role') {
      this.router.navigate(['/account-type']);
    } else if (user.onboarding_step === 'need_teacher_form') {
      this.router.navigate(['/teacher/setup']);
    } else {
      this.router.navigate([intendedUrl || '/dashboard']);
    }
  }

  /**
   * Email/password login
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
      email,
      password
    });
  }

  /**
   * User registration
   */
  register(userData: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, userData);
  }

  /**
   * Google OAuth login
   */
  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/google`, {
      idToken
    });
  }

  /**
   * Update user role
   */
  updateRole(role: 'Teacher' | 'Student'): Observable<{ user: User }> {
    return this.http.patch<{ user: User }>(`${this.baseUrl}/auth/users/role`, {
      role
    });
  }

  /**
   * Get current user from server
   */
  getMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/auth/me`);
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/']);
  }

  /**
   * Check if user needs role selection
   */
  needsRoleSelection(): boolean {
    const user = this.getCurrentUser();
    return !user?.role || user.onboarding_step === 'need_role';
  }

  /**
   * Check if user needs teacher setup
   */
  needsTeacherSetup(): boolean {
    const user = this.getCurrentUser();
    return user?.onboarding_step === 'need_teacher_form';
  }

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    const user = this.getCurrentUser();
    return user?.onboarding_step === 'complete';
  }

  /**
   * Get user's onboarding step
   */
  getOnboardingStep(): string {
    const user = this.getCurrentUser();
    return user?.onboarding_step || 'need_role';
  }

  /**
   * Get user's role
   */
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }
}
