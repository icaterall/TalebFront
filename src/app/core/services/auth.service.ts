import { Injectable, inject } from '@angular/core';
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
    const user = this.currentUserSubject.value;
    return user;
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
    const token = localStorage.getItem('accessToken');
    return token;
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
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.currentUserSubject.next(user);

  }

  /**
   * Update current user data without changing tokens
   */
  updateCurrentUser(user: User): void {

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);

  }

  /**
   * Refresh current user data from backend
   */
  refreshUserData(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/auth/me`);
  }

  /**
   * Update current user data from backend response
   */
  updateUserFromBackend(): void {
    this.refreshUserData().subscribe({
      next: (response) => {
        if (response.user) {
          this.updateCurrentUser(response.user);
        }
      },
      error: (error) => {
        console.error('Failed to refresh user data:', error);
      }
    });
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
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
 
      // Navigate based on saved onboarding state
      switch (onboardingState.step) {
        case 'select_role':
          this.router.navigateByUrl('/account-type');
          return;
        
        case 'enter_dob':
          // User was in the middle of entering DOB
          this.router.navigateByUrl('/account-type');
          return;
        
        case 'student_registration':
          // User has entered DOB, now on registration form
          this.router.navigateByUrl('/student/registration');
          return;
        
        case 'teacher_setup':
          this.router.navigateByUrl('/teacher');
          return;
        
        case 'complete':
          // Clear the onboarding state and continue normally
          localStorage.removeItem('onboardingState');
          break;
      }
    }

    // Fallback to server-side onboarding state
    if (!user.role || user.onboarding_step === 'need_role') {
      this.router.navigateByUrl('/account-type');
    } else if (user.onboarding_step === 'need_teacher_form') {
      this.router.navigateByUrl('/teacher/setup');
    } else {
      this.router.navigateByUrl(intendedUrl || '/dashboard');
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
   * Refresh access token using refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, {
      refreshToken
    });
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearAuthData();
    // Also clear onboarding state
    localStorage.removeItem('onboardingState');
    this.router.navigateByUrl('/');
  }

  /**
   * Check if user needs role selection
   */
  needsRoleSelection(): boolean {
    const user = this.getCurrentUser();
    const onboardingStep = user?.onboarding_step || 'need_role';
    return !user?.role || onboardingStep === 'need_role';
  }

  /**
   * Check if user needs teacher setup
   */
  needsTeacherSetup(): boolean {
    const user = this.getCurrentUser();
    const onboardingStep = user?.onboarding_step || 'need_role';
    return onboardingStep === 'need_teacher_form';
  }

  /**
   * Validate authentication and handle expired/invalid tokens
   */
  validateAuthentication(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();

    // Check if user exists
    if (!user) {
  
      this.clearAuthData();
      return false;
    }
    
    // Check if token exists
    if (!token) {
     
      this.clearAuthData();
      return false;
    }
    
    // Check if token is expired (basic check)
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = tokenPayload.exp;
      const timeUntilExpiry = tokenExp ? tokenExp - currentTime : 0;
  
      
      if (tokenPayload.exp && tokenPayload.exp < currentTime) {
     
        // Try to refresh token
        this.refreshToken().subscribe({
          next: (response) => {
            const newToken = response.token || response.accessToken;
            if (newToken && response.user && response.refreshToken) {
              this.storeAuthData(response.user, newToken, response.refreshToken);
           
            } else {
            
              this.logout();
            }
          },
          error: (error) => {
            this.logout();
          }
        });
        return false;
      }
    } catch (error) {
      this.clearAuthData();
      return false;
    }

    return true;
  }

  /**
   * Force logout with redirect
   */
  forceLogout(reason: string = 'Authentication failed'): void {
    this.clearAuthData();
    this.router.navigateByUrl('/');
  }

  /**
   * Universal authentication and role validation
   * @param requiredRole - The role required to access the page (optional)
   * @param redirectPath - Where to redirect if validation fails (optional)
   * @returns boolean - true if valid, false if invalid
   */
  validateAuthAndRole(requiredRole?: string, redirectPath?: string): boolean {

    
    // Step 1: Validate authentication
    if (!this.validateAuthentication()) {

      this.forceLogout('Authentication validation failed');
      return false;
    }

    const user = this.getCurrentUser();

    
    // Step 2: Check if user exists
    if (!user) {
   
      this.forceLogout('No user data found');
      return false;
    }

    // Step 3: Check if user has required role (if specified)
    if (requiredRole && user.role !== requiredRole) {
      
      // Redirect based on user's actual role
      if (user.role === 'Student') {
      
        this.router.navigateByUrl('/student/dashboard');
      } else if (user.role === 'Teacher') {
        this.router.navigateByUrl('/teacher');
      } else {
        this.router.navigateByUrl(redirectPath || '/dashboard');
      }
      return false;
    }

    // Step 4: Check onboarding status
    if (user.onboarding_step !== 'complete') {
      
      // Redirect based on onboarding step
      switch (user.onboarding_step) {
        case 'need_role':
      
          this.router.navigateByUrl('/account-type');
          break;
        case 'student_registration':
        
          this.router.navigateByUrl('/student/registration');
          break;
        case 'need_teacher_form':
       
          this.router.navigateByUrl('/teacher/setup');
          break;
        default:
        
          this.router.navigateByUrl('/account-type');
      }
      return false;
    }

    return true;
  }


  /**
   * Check if user has specific role
   * @param role - The role to check for
   * @returns boolean - true if user has the role, false if not
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Get user's current role
   * @returns string | undefined - The user's role or undefined
   */
  getCurrentRole(): string | undefined {
    const user = this.getCurrentUser();
    return user?.role;
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
