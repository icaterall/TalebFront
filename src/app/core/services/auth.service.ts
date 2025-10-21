import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  name: string;
  name_en?: string;  // English name
  name_ar?: string;  // Arabic name
  email: string;
  role?: string;
  auth_provider: string;
  provider_sub?: string;
  profile_photo?: string;  // Legacy field name
  profile_photo_url?: string;
  locale: string;
  gender?: string;
  dob?: string;
  education_stage_id?: number;
  country_id?: number;
  state_id?: number;
  onboarding_step: string;
  institution_id?: number;
  institution_role?: string;
  institution_verified?: boolean;
  is_verified?: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;           // For compatibility
  accessToken?: string;     // Backend returns this
  refreshToken: string;
  message?: string;
  requiresVerification?: boolean;
  verification?: {
    canResendAfter: number;
    canResendAt: string;
    serverTime: string;
  };
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
   * Get onboarding state from localStorage
   * (Direct access to avoid circular dependency with OnboardingStateService)
   */
  private getOnboardingStateFromStorage(): any {
    try {
      const stored = localStorage.getItem('onboardingState');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
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
    console.log('💾 Storing auth data:', {
      userId: user.id,
      email: user.email,
      name: user.name,
      name_en: user.name_en,
      name_ar: user.name_ar,
      role: user.role,
      hasToken: !!token
    });
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.currentUserSubject.next(user);
    
    console.log('✅ Auth data stored successfully');
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
   * Handle post-login navigation based on user state and onboarding progress
   */
  postLoginNavigate(user: User, intendedUrl?: string): void {
    // Store auth data
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    
    if (token && refreshToken) {
      this.storeAuthData(user, token, refreshToken);
    }

    // Check if there's an ongoing onboarding process in localStorage
    const onboardingState = this.getOnboardingStateFromStorage();
    
    if (onboardingState) {
      console.log('Found onboarding state, navigating based on it:', onboardingState);
      
      // Navigate based on saved onboarding state
      switch (onboardingState.step) {
        case 'select_role':
          this.router.navigate(['/account-type']);
          return;
        
        case 'enter_dob':
          // User was in the middle of entering DOB
          this.router.navigate(['/account-type']);
          return;
        
        case 'student_registration':
          // User has entered DOB, now on registration form
          this.router.navigate(['/student/registration']);
          return;
        
        case 'teacher_setup':
          this.router.navigate(['/teacher']);
          return;
        
        case 'complete':
          // Clear the onboarding state and continue normally
          localStorage.removeItem('onboardingState');
          break;
      }
    }

    // Fallback to server-side onboarding state
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
    // Get current language
    const currentLang = localStorage.getItem('anataleb.lang') || 
                       sessionStorage.getItem('anataleb.lang') || 'ar';
    
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
      email,
      password,
      language: currentLang  // Send language to backend
    }, {
      headers: {
        'Accept-Language': currentLang
      }
    });
  }

  /**
   * User registration
   * Only requires: name, email, password
   * Gender and role will be selected later on account-type page
   */
  register(userData: { 
    name: string; 
    email: string; 
    password: string;
    gender?: string;
    role?: string;
  }): Observable<AuthResponse> {
    // Get current language
    const currentLang = localStorage.getItem('anataleb.lang') || 
                       sessionStorage.getItem('anataleb.lang') || 'ar';
    
    // Minimal registration data - only required fields
    const registrationData: any = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
    };
    
    // Only add gender and role if explicitly provided (otherwise null)
    if (userData.gender) {
      registrationData.gender = userData.gender;
    }
    if (userData.role) {
      registrationData.role = userData.role;
    }
    
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, registrationData, {
      headers: {
        'Accept-Language': currentLang
      }
    });
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
   * Complete student registration with all details
   */
  completeStudentRegistration(data: {
    name: string;
    date_of_birth: string;
    country_id: number;
    state_id: number | null;
    education_stage_id: number;
    gender: string | null;
    locale: string;
    profile_photo_url: string | null;
    role: string;
  }): Observable<{ user: User }> {
    return this.http.post<{ user: User }>(`${this.baseUrl}/auth/complete-registration`, data);
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
    // Also clear onboarding state
    localStorage.removeItem('onboardingState');
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
