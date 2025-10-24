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
    console.log('🔍 AuthService.getCurrentUser() called');
    console.log('👤 Current user:', user);
    console.log('💾 localStorage user:', localStorage.getItem('currentUser'));
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
    console.log('🎫 AuthService.getToken() called');
    console.log('🎫 Token exists:', !!token);
    console.log('🎫 Token preview:', token ? token.substring(0, 20) + '...' : 'null');
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
    console.log('💾 Storing auth data:', {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasToken: !!token
    });
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.currentUserSubject.next(user);
    
    console.log('✅ Auth data stored successfully');
  }

  /**
   * Update current user data without changing tokens
   */
  updateCurrentUser(user: User): void {
    console.log('🔄 Updating current user data:', {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboarding_step: user.onboarding_step
    });
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    
    console.log('✅ User data updated successfully');
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
      console.log('Found onboarding state, navigating based on it:', onboardingState);
      
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
   * Validate authentication and handle expired/invalid tokens
   */
  validateAuthentication(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    console.log('🔐 AuthService: validateAuthentication() called');
    console.log('👤 User data:', user);
    console.log('🎫 Token exists:', !!token);
    console.log('🎫 Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    
    // Check if user exists
    if (!user) {
      console.log('❌ AuthService: No user found, clearing auth data');
      this.clearAuthData();
      return false;
    }
    
    // Check if token exists
    if (!token) {
      console.log('❌ AuthService: No token found, clearing auth data');
      this.clearAuthData();
      return false;
    }
    
    // Check if token is expired (basic check)
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = tokenPayload.exp;
      const timeUntilExpiry = tokenExp ? tokenExp - currentTime : 0;
      
      console.log('⏰ Token expiry check:');
      console.log('   Current time:', currentTime);
      console.log('   Token expires at:', tokenExp);
      console.log('   Time until expiry (seconds):', timeUntilExpiry);
      console.log('   Token expired:', tokenExp && tokenExp < currentTime);
      
      if (tokenPayload.exp && tokenPayload.exp < currentTime) {
        console.log('⚠️ AuthService: Token expired, attempting refresh');
        // Try to refresh token
        this.refreshToken().subscribe({
          next: (response) => {
            const newToken = response.token || response.accessToken;
            if (newToken && response.user && response.refreshToken) {
              this.storeAuthData(response.user, newToken, response.refreshToken);
              console.log('✅ AuthService: Token refreshed successfully');
            } else {
              console.log('❌ AuthService: Token refresh failed, logging out');
              this.logout();
            }
          },
          error: (error) => {
            console.log('❌ AuthService: Token refresh error, logging out:', error);
            this.logout();
          }
        });
        return false;
      }
    } catch (error) {
      console.log('❌ AuthService: Invalid token format, clearing auth data:', error);
      this.clearAuthData();
      return false;
    }
    
    console.log('✅ AuthService: Authentication validation successful');
    return true;
  }

  /**
   * Force logout with redirect
   */
  forceLogout(reason: string = 'Authentication failed'): void {
    console.log('AuthService: Force logout -', reason);
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
    console.log('🔐 AuthService: validateAuthAndRole() called');
    console.log('🎯 Required role:', requiredRole || 'any');
    console.log('🔄 Redirect path:', redirectPath || 'default');
    
    // Step 1: Validate authentication
    if (!this.validateAuthentication()) {
      console.log('❌ AuthService: Authentication validation failed');
      this.forceLogout('Authentication validation failed');
      return false;
    }

    const user = this.getCurrentUser();
    console.log('👤 User after auth validation:', user);
    
    // Step 2: Check if user exists
    if (!user) {
      console.log('❌ AuthService: No user data found');
      this.forceLogout('No user data found');
      return false;
    }

    console.log('👤 User role:', user.role);
    console.log('📋 Onboarding step:', user.onboarding_step);

    // Step 3: Check if user has required role (if specified)
    if (requiredRole && user.role !== requiredRole) {
      console.log(`❌ AuthService: User role '${user.role}' does not match required role '${requiredRole}'`);
      
      // Redirect based on user's actual role
      if (user.role === 'Student') {
        console.log('🔄 Redirecting Student to /student/dashboard');
        this.router.navigateByUrl('/student/dashboard');
      } else if (user.role === 'Teacher') {
        console.log('🔄 Redirecting Teacher to /teacher');
        this.router.navigateByUrl('/teacher');
      } else {
        console.log('🔄 Redirecting to default dashboard');
        this.router.navigateByUrl(redirectPath || '/dashboard');
      }
      return false;
    }

    // Step 4: Check onboarding status
    if (user.onboarding_step !== 'complete') {
      console.log(`⚠️ AuthService: User onboarding not complete: ${user.onboarding_step}`);
      
      // Redirect based on onboarding step
      switch (user.onboarding_step) {
        case 'need_role':
          console.log('🔄 Redirecting to /account-type');
          this.router.navigateByUrl('/account-type');
          break;
        case 'student_registration':
          console.log('🔄 Redirecting to /student/registration');
          this.router.navigateByUrl('/student/registration');
          break;
        case 'need_teacher_form':
          console.log('🔄 Redirecting to /teacher/setup');
          this.router.navigateByUrl('/teacher/setup');
          break;
        default:
          console.log('🔄 Redirecting to /account-type (default)');
          this.router.navigateByUrl('/account-type');
      }
      return false;
    }

    console.log('✅ AuthService: Authentication and role validation successful');
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
