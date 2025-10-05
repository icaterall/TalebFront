import { Component, EventEmitter, Output, Input, inject, ChangeDetectorRef, HostListener, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { GoogleOAuthService } from '../../core/services/google-oauth.service';
import { AppleOAuthService } from '../../core/services/apple-oauth.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';

type ModalMode = 'idle' | 'login-password' | 'login-social' | 'register';
type LoadingState = 'none' | 'email' | 'google' | 'apple';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit, OnDestroy {
  @Input() initialMode: 'login' | 'register' = 'login';
  @Output() closeModal = new EventEmitter<void>();
  @Output() switchToSignup = new EventEmitter<void>();
  @Output() forgotPassword = new EventEmitter<void>();
  @ViewChild('googleBtn', { static: false }) googleBtn!: ElementRef<HTMLDivElement>;
  @Output() modeChanged = new EventEmitter<'login' | 'register'>();

  // State management
  providers = { password: false, google: false, apple: false };
  mode: ModalMode = 'idle';
  loading: LoadingState = 'none';

  // Form fields
  email = '';
  password = '';
  fullName = '';
  showPassword = false;

  // OAuth availability
  googleOAuthAvailable = false;
  appleAvailable = false;

  // Computed properties for template
  get showFullNameField() { return this.mode === 'register'; }
  get showPasswordField() { return this.mode === 'register' || this.mode === 'login-password'; }
  get emailDisabled() { return this.mode === 'login-social'; }

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly appleOAuth = inject(AppleOAuthService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

 // In ngOnInit(), update the initialization:
ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    document.body.classList.add('modal-open');
    
    // Initialize Apple availability
    this.appleAvailable = this.isAppleSupported();
    
    // Initialize Google OAuth
    this.initializeGoogleOAuth();
    
    // Initialize Apple OAuth if needed
    if (this.appleAvailable) {
      this.appleOAuth.initializeApple().catch(error => {
        console.error('Failed to initialize Apple OAuth:', error);
      });
    }
    
    // Listen for OAuth events
    this.setupEventListeners();
  }
}
private setupEventListeners(): void {
  // Listen for successful Google login
  const successHandler = (event: any) => {
    console.log('Google login successful, closing modal');
    this.resetLoading();
    this.close();
  };
  
  // Listen for Google login errors
  const errorHandler = () => {
    console.log('Google login error, resetting loading state');
    this.resetLoading();
  };
  
  window.addEventListener('google-login-success', successHandler);
  window.addEventListener('google-login-error', errorHandler);
  window.addEventListener('apple-login-error', errorHandler);
  
  // Store handlers for cleanup
  (this as any).googleSuccessHandler = successHandler;
  (this as any).googleErrorHandler = errorHandler;
}
private initializeGoogleOAuth(): void {
  // Initialize the Google OAuth service
  this.googleOAuth.initializeGoogle()
    .then(() => {
      this.googleOAuthAvailable = true;
      console.log('Google OAuth ready');
      
      // Try to render button after a short delay to ensure DOM is ready
      setTimeout(() => {
        if (this.googleBtn?.nativeElement) {
          this.googleOAuth.renderGoogleButton(this.googleBtn.nativeElement);
        }
      }, 100);
    })
    .catch(error => {
      console.error('Google OAuth initialization failed:', error);
      this.googleOAuthAvailable = false;
    });
}

  private handleGoogleResponse(response: any): void {
    const idToken = response?.credential;
    if (!idToken) {
      console.error('No ID token received from Google');
      this.resetLoading();
      return;
    }

    console.log('Google OAuth response received');
    // TODO: Send ID token to backend for verification
    // this.http.post(`${environment.apiUrl}/auth/google`, { idToken }).subscribe(...)
    
    // For now, just show success and close modal
    this.toastr.success(
      this.translate.instant('authModal.loginSuccess'),
      this.translate.instant('authModal.success')
    );
    this.resetLoading();
    this.close();
  }

  /**
   * Get current language for Google Identity Services
   */
  private getCurrentLanguage(): string {
    // Try to get language from sessionStorage first
    const savedLang = sessionStorage.getItem('anataleb.lang');
    if (savedLang === 'en' || savedLang === 'ar') {
      return savedLang;
    }

    // Fallback to current translate service language
    const currentLang = this.translate.currentLang || this.translate.defaultLang || 'ar';
    return currentLang === 'en' ? 'en' : 'ar';
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('modal-open');
      // Remove event listeners
      window.removeEventListener('google-login-error', () => {});
      window.removeEventListener('apple-login-error', () => {});
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  @HostListener('click', ['$event'])
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async checkEmailExists() {
    const email = (this.email || '').trim().toLowerCase();
    if (!email) {
      this.mode = 'idle';
      return;
    }

    this.loading = 'email';
    
    try {
      const res: any = await this.http.post(`${this.baseUrl}/auth/check-email`, { email }).toPromise();
      const exists = !!res?.exists;
      const provs: string[] = res?.providers || [];
      
      this.providers = {
        password: provs.includes('password'),
        google: provs.includes('google'),
        apple: provs.includes('apple'),
      };

      if (!exists) {
        // New user → register
        this.mode = 'register';
        if (!this.fullName && res?.displayName) this.fullName = res.displayName;
        return;
      }

      // Exists
      if (this.providers.password) {
        // User has password → show password field
        this.mode = 'login-password';
      } else if (this.providers.google || this.providers.apple) {
        // Social-only account → disable email path
        this.mode = 'login-social';
      } else {
        // Edge: exists but no providers? treat as register to set password
        this.mode = 'register';
      }
    } catch (e) {
      this.toastr.error('Network error. Please try again.');
      this.mode = 'idle';
      this.resetLoading();
    }
  }

  async onContinue() {
    if (this.loading !== 'none' || this.emailDisabled) return;

    this.loading = 'email';
    try {
      if (this.mode === 'login-password') {
        const response = await this.authService.login(this.email, this.password).toPromise();
        if (!response) {
          throw new Error('No response from server');
        }
        this.authService.postLoginNavigate(response.user);
        this.toastr.success(this.translate.instant('authModal.loginSuccess'));
      } else if (this.mode === 'register') {
        const response = await this.authService.register({
          name: this.fullName,
          email: this.email,
          password: this.password
        }).toPromise();
        if (!response) {
          throw new Error('No response from server');
        }
        this.authService.postLoginNavigate(response.user);
        this.toastr.success(this.translate.instant('authModal.registrationSuccess'));
      }
      this.close();
    } catch (e) {
      this.toastr.error('Check your email or password.');
    } finally {
      this.resetLoading(); // <-- always stop spinner
    }
  }

  async onLogin() {
    if (!this.email || !this.password) {
      return;
    }
    
    const loginData = {
      email: this.email,
      password: this.password
    };

    return this.http.post<any>(`${this.baseUrl}/auth/login`, loginData)
      .toPromise()
      .then((response) => {
        console.log('Login successful:', response);
        this.showSuccess(this.translate.instant('authModal.loginSuccess'));
        // TODO: Handle successful login (store token, redirect, etc.)
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        this.close();
      });
  }

  async onRegister() {
    if (!this.email || !this.fullName || !this.password) {
      return;
    }
    
    const registrationData = {
      email: this.email,
      name: this.fullName,
      password: this.password,
      role: 'student', // Default role for registration
      gender: 'other' // Default gender, can be updated later
    };

    return this.http.post<any>(`${this.baseUrl}/auth/register`, registrationData)
      .toPromise()
      .then((response) => {
        console.log('Registration successful:', response);
        this.showSuccess(this.translate.instant('authModal.registrationSuccess'));
        // TODO: Handle successful registration (redirect, show success message, etc.)
        this.close();
      });
  }

  switchToLogin() {
    // Optional "Already on … Log in" link
    if (this.providers.password) this.mode = 'login-password';
  }

  private errMsg(_e: any): string { 
    return this.translate.instant('authModal.genericError');
  }

  private isAppleSupported(): boolean {
    return typeof (window as any).AppleID !== 'undefined' || /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  }

  /**
   * Centralized loading state reset - guarantees spinners stop on any error/cancel
   */
  private resetLoading(): void {
    this.loading = 'none';
    this.cdr.detectChanges(); // Force change detection to update UI
  }

  async onGoogleClick() {
    if (this.loading !== 'none') return;
    
    this.loading = 'google';
    
    try {
      await this.googleOAuth.loginWithGoogle();
      // The success/error will be handled by event listeners
    } catch (error) {
      console.error('Google login failed:', error);
      this.resetLoading();
    }
  }

  async onAppleClick() {
    if (!this.appleAvailable || this.loading !== 'none') return;
    this.loading = 'apple';
    
    try {
      const token = await this.appleGetIdentityToken(); // must reject on cancel/error
      await this.http.post(`${this.baseUrl}/auth/apple`, { token }).toPromise();
      this.close();
    } catch (e) {
      const errorMessage = this.getAppleErrorMessage(e);
      this.toastr.error(errorMessage);
    } finally {
      this.resetLoading(); // <-- always stop
    }
  }


  private appleGetIdentityToken(): Promise<string> {
    // TODO: integrate Sign in with Apple JS; return identity token
    return Promise.reject(new Error('Apple sign-in not implemented'));
  }

  private getGoogleErrorMessage(error: any): string {
    const message = error?.message || error?.toString() || '';
    
    if (message.includes('cancelled') || message.includes('dismissed')) {
      return 'Sign-in was cancelled.';
    }
    
    if (message.includes('blocked') || message.includes('popup')) {
      return 'Sign-in was blocked by the browser.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please try again.';
    }
    
    return 'Google sign-in failed. Please try again.';
  }

  private getAppleErrorMessage(error: any): string {
    const message = error?.message || error?.toString() || '';
    
    if (message.includes('cancelled') || message.includes('dismissed')) {
      return 'Sign-in was cancelled.';
    }
    
    if (message.includes('not supported') || message.includes('unavailable')) {
      return 'Apple sign-in is not supported on this device.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please try again.';
    }
    
    return 'Apple sign-in failed. Please try again.';
  }

  onForgotPassword() {
    this.forgotPassword.emit();
    this.close();
  }

  /**
   * Show error toastr message
   */
  private showError(message: string, title?: string): void {
    const errorTitle = title || this.translate.instant('authModal.error');
    this.toastr.error(message, errorTitle, {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }

  /**
   * Show success toastr message
   */
  private showSuccess(message: string, title?: string): void {
    const successTitle = title || this.translate.instant('authModal.success');
    this.toastr.success(message, successTitle, {
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }

  /**
   * Handle API error response
   */
  private handleApiError(error: any): void {
    let errorMessage = this.translate.instant('authModal.genericError');
    
    if (error.error && error.error.message) {
      // Use server error message
      errorMessage = error.error.message;
    } else if (error.message) {
      // Use client error message
      errorMessage = error.message;
    } else if (error.status === 0) {
      // Network error
      errorMessage = this.translate.instant('authModal.networkError');
    } else if (error.status === 401) {
      // Unauthorized
      errorMessage = this.translate.instant('authModal.unauthorized');
    } else if (error.status === 403) {
      // Forbidden
      errorMessage = this.translate.instant('authModal.forbidden');
    } else if (error.status >= 500) {
      // Server error
      errorMessage = this.translate.instant('authModal.serverError');
    }
    
    this.showError(errorMessage);
  }

  onSignupClick() {
    this.switchToSignup.emit();
    this.close();
  }

  onOrganizationLogin() {
    console.log('Organization login');
    // TODO: Implement organization login
  }

  close() {
    this.closeModal.emit();
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('modal-open');
      
      // Clean up event listeners
      if ((this as any).googleSuccessHandler) {
        window.removeEventListener('google-login-success', (this as any).googleSuccessHandler);
        window.removeEventListener('google-login-error', (this as any).googleErrorHandler);
        window.removeEventListener('apple-login-error', (this as any).googleErrorHandler);
      }
    }
  }
}
