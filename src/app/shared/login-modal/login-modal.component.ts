import { Component, EventEmitter, Output, Input, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { GoogleOAuthService } from '../../core/services/google-oauth.service';
import { AppleOAuthService } from '../../core/services/apple-oauth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent {
  @Input() initialMode: 'login' | 'register' = 'login';
  @Output() closeModal = new EventEmitter<void>();
  @Output() switchToSignup = new EventEmitter<void>();
  @Output() forgotPassword = new EventEmitter<void>();
  @Output() modeChanged = new EventEmitter<'login' | 'register'>();

  email = '';
  password = '';
  fullName = '';
  showPassword = false;
  isLoading = false;
  showFullNameField = false;
  showPasswordField = false;
  emailExists = false;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly googleOAuth = inject(GoogleOAuthService);
  private readonly appleOAuth = inject(AppleOAuthService);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.add('modal-open');
      // Initialize Google OAuth
      this.googleOAuth.initializeGoogle().catch(error => {
        console.error('Failed to initialize Google OAuth:', error);
      });
      
      // Initialize Apple OAuth
      this.appleOAuth.initializeApple().catch(error => {
        console.error('Failed to initialize Apple OAuth:', error);
      });
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('modal-open');
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
    this.http.post<any>('/api/auth/check-email-exist', { email: this.email })
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

    this.http.post<any>('/api/auth/login', loginData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Login successful:', response);
          // TODO: Handle successful login (store token, redirect, etc.)
          if (response.token) {
            localStorage.setItem('authToken', response.token);
          }
          this.close();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          // TODO: Handle login error (show error message)
          if (error.error && error.error.message) {
            console.error('Login failed:', error.error.message);
          }
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

    this.http.post<any>('/api/auth/register', registrationData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Registration successful:', response);
          // TODO: Handle successful registration (redirect, show success message, etc.)
          this.close();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Registration error:', error);
          // TODO: Handle registration error (show error message)
          if (error.error && error.error.message) {
            // You can show error message to user here
            console.error('Registration failed:', error.error.message);
          }
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
      this.googleOAuth.loginWithGoogle();
    } else if (provider === 'apple') {
      this.appleOAuth.loginWithApple();
    }
  }

  onForgotPassword() {
    this.forgotPassword.emit();
    this.close();
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
