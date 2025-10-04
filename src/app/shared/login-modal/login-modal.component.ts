import { Component, EventEmitter, Output, Input, inject, ChangeDetectorRef, HostListener, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { GoogleOAuthService } from '../../core/services/google-oauth.service';
import { AppleOAuthService } from '../../core/services/apple-oauth.service';
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';

type LoadingState = 'none' | 'email' | 'google' | 'apple';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  @Input() initialMode: 'login' | 'register' = 'login';
  @Output() closeModal = new EventEmitter<void>();
  @Output() switchToSignup = new EventEmitter<void>();
  @Output() forgotPassword = new EventEmitter<void>();
  @ViewChild('googleBtn', { static: false }) googleBtn!: ElementRef<HTMLDivElement>;
  @Output() modeChanged = new EventEmitter<'login' | 'register'>();

  email = '';
  password = '';
  fullName = '';
  showPassword = false;
  loading: LoadingState = 'none';
  showFullNameField = false;
  showPasswordField = false;
  emailExists = false;
  googleOAuthAvailable = false;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly appleOAuth = inject(AppleOAuthService);
  private readonly baseUrl = environment.apiUrl;
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.add('modal-open');
      
      // Initialize Google OAuth with proper GIS approach
      this.initializeGoogleOAuth();
      
      // Initialize Apple OAuth
      this.appleOAuth.initializeApple().catch(error => {
        console.error('Failed to initialize Apple OAuth:', error);
        this.loading = 'none';
      });
      
      // Listen for OAuth login errors
      window.addEventListener('google-login-error', () => {
        this.loading = 'none';
      });
      window.addEventListener('apple-login-error', () => {
        this.loading = 'none';
      });
    }
  }

  private initializeGoogleOAuth(): void {
    const waitForGis = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(waitForGis, 100);
        return;
      }
      
      try {
        // Get current language for Google Identity Services
        const currentLang = this.getCurrentLanguage();
        
        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleGoogleResponse(response),
          ux_mode: 'popup',
          context: 'signin',
          locale: currentLang // Set the language for Google OAuth UI
        });
        
        this.googleOAuthAvailable = true;
        console.log('Google OAuth initialized successfully');
        
        // Render Google button if element exists
        if (this.googleBtn?.nativeElement) {
          this.googleOAuth.renderGoogleButton(this.googleBtn.nativeElement);
        }
      } catch (error) {
        console.error('Error initializing Google OAuth:', error);
        this.googleOAuthAvailable = false;
        this.toastr.error(
          this.translate.instant('authModal.googleNotInitialized'),
          this.translate.instant('authModal.error')
        );
      }
    };
    
    waitForGis();
  }

  private handleGoogleResponse(response: any): void {
    const idToken = response?.credential;
    if (!idToken) {
      console.error('No ID token received from Google');
      this.loading = 'none';
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
    this.loading = 'none';
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

  checkEmailExists() {
    if (!this.email) {
      this.showFullNameField = false;
      this.showPasswordField = false;
      return;
    }

    this.loading = 'email';
    
    // Call the backend API to check if email exists
    this.http.post<any>(`${this.baseUrl}/auth/check-email-exist`, { email: this.email })
      .subscribe({
        next: (response) => {
          this.loading = 'none';
          this.emailExists = response.exists;
          
          if (!this.emailExists) {
            // Email doesn't exist, show registration fields
            this.showFullNameField = true;
            this.showPasswordField = true;
          } else {
            // Email exists, hide registration fields
            this.showFullNameField = false;
            this.showPasswordField = false;
          }
        },
        error: (error) => {
          this.loading = 'none';
          console.error('Error checking email:', error);
          this.handleApiError(error);
          // Default to showing registration fields on error
          this.showFullNameField = true;
          this.showPasswordField = true;
        }
      });
  }

  async onContinue() {
    if (this.loading !== 'none') return;
    this.loading = 'email';
    
    try {
      if (this.showPasswordField) {
        await this.onLogin();
      } else {
        await this.onRegister();
      }
    } catch (err) {
      this.handleApiError(err);
    } finally {
      this.loading = 'none';
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
    this.showFullNameField = false;
    this.showPasswordField = false;
    this.fullName = '';
    this.password = '';
  }

  async onGoogleClick() {
    if (this.loading !== 'none') return;
    this.loading = 'google';
    
    try {
      if (!this.googleOAuthAvailable) {
        throw new Error('Google OAuth not available');
      }
      
      const idToken = await this.gisSignIn();
      await this.http.post(`${this.baseUrl}/auth/google-login`, { idToken }).toPromise();
      this.showSuccess('authModal.loginSuccess');
      this.close();
    } catch (err) {
      this.handleApiError(err);
      this.loading = 'none'; // re-enable on error
    }
  }

  async onAppleClick() {
    if (this.loading !== 'none') return;
    this.loading = 'apple';
    
    try {
      const appleToken = await this.appleSignIn();
      await this.http.post(`${this.baseUrl}/auth/apple-login`, { token: appleToken }).toPromise();
      this.showSuccess('authModal.loginSuccess');
      this.close();
    } catch (err) {
      this.handleApiError(err);
      this.loading = 'none'; // re-enable on error
    }
  }

  private gisSignIn(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          // If user dismissed, treat as cancel
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            return reject(new Error('Google sign-in cancelled'));
          }
        });
        
        // Set up callback for credential response
        window.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (res: any) => {
            const token = res?.credential;
            token ? resolve(token) : reject(new Error('No credential'));
          },
          ux_mode: 'popup',
          context: 'signin',
          locale: this.getCurrentLanguage()
        });
      } catch (e) { 
        reject(e); 
      }
    });
  }

  private appleSignIn(): Promise<string> {
    // TODO: integrate Sign in with Apple JS; return identity token
    return Promise.reject(new Error('Apple sign-in not implemented'));
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
}
