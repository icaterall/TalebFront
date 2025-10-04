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
  isLoading = false;
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
        this.isLoading = false;
      });
      
      // Listen for OAuth login errors
      window.addEventListener('google-login-error', () => {
        this.isLoading = false;
      });
      window.addEventListener('apple-login-error', () => {
        this.isLoading = false;
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
        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleGoogleResponse(response),
          ux_mode: 'popup',
          context: 'signin'
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
      this.isLoading = false;
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
    this.isLoading = false;
    this.close();
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

    this.isLoading = true;
    
    // Call the backend API to check if email exists
    this.http.post<any>(`${this.baseUrl}/auth/check-email-exist`, { email: this.email })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
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
          this.isLoading = false;
          console.error('Error checking email:', error);
          this.handleApiError(error);
          // Default to showing registration fields on error
          this.showFullNameField = true;
          this.showPasswordField = true;
        }
      });
  }

  onContinue() {
    if (this.showPasswordField) {
      this.onRegister();
    } else {
      this.onLogin();
    }
  }

  onLogin() {
    if (!this.email || !this.password) {
      return;
    }
    
    this.isLoading = true;
    
    const loginData = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>(`${this.baseUrl}/auth/login`, loginData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Login successful:', response);
          this.showSuccess(this.translate.instant('authModal.loginSuccess'));
          // TODO: Handle successful login (store token, redirect, etc.)
          if (response.token) {
            localStorage.setItem('authToken', response.token);
          }
          this.close();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          this.handleApiError(error);
        }
      });
  }

  onRegister() {
    if (!this.email || !this.fullName || !this.password) {
      return;
    }
    
    this.isLoading = true;
    
    const registrationData = {
      email: this.email,
      name: this.fullName,
      password: this.password,
      role: 'student', // Default role for registration
      gender: 'other' // Default gender, can be updated later
    };

    this.http.post<any>(`${this.baseUrl}/auth/register`, registrationData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Registration successful:', response);
          this.showSuccess(this.translate.instant('authModal.registrationSuccess'));
          // TODO: Handle successful registration (redirect, show success message, etc.)
          this.close();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Registration error:', error);
          this.handleApiError(error);
        }
      });
  }

  switchToLogin() {
    this.showFullNameField = false;
    this.showPasswordField = false;
    this.fullName = '';
    this.password = '';
  }

  onSocialLogin(provider: 'google' | 'apple') {
    console.log(`Social login with ${provider}`);
    this.isLoading = true;
    
    if (provider === 'google') {
      try {
        // Use Google Identity Services prompt
        if (window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        } else {
          console.error('Google Identity Services not available');
          this.toastr.error(
            this.translate.instant('authModal.googleNotInitialized'),
            this.translate.instant('authModal.error')
          );
          this.isLoading = false;
        }
      } catch (error) {
        console.error('Google login error:', error);
        this.isLoading = false;
        this.handleApiError(error);
      }
    } else if (provider === 'apple') {
      try {
        this.appleOAuth.loginWithApple();
        // Reset loading state after a short delay to allow for OAuth flow
        setTimeout(() => {
          this.isLoading = false;
        }, 3000);
      } catch (error) {
        console.error('Apple login error:', error);
        this.isLoading = false;
        this.handleApiError(error);
      }
    }
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
