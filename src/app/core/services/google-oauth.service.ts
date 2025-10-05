// google-oauth.service.ts
import { Injectable, inject, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

declare global {
  interface Window {
    google: any;
    handleGoogleCallback?: (response: any) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleOAuthService {
  private readonly GOOGLE_CLIENT_ID = environment.googleClientId;
  private readonly baseUrl = environment.apiUrl;
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private loginCompleteSubject = new BehaviorSubject<boolean>(false);
  public loginComplete$ = this.loginCompleteSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Set up global callback for Google
    if (isPlatformBrowser(this.platformId)) {
      window.handleGoogleCallback = (response: any) => this.handleCredentialResponse(response);
    }
  }

  /**
   * Initialize Google OAuth
   */
  initializeGoogle(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized, return resolved promise
    if (this.initialized) {
      return Promise.resolve();
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      // Check if client ID is configured
      if (!this.GOOGLE_CLIENT_ID || this.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        console.error('Google Client ID not configured in environment');
        this.toastr.error('Google sign-in is not configured', 'Configuration Error');
        reject(new Error('Google Client ID not configured'));
        return;
      }

      // Wait for Google Identity Services to load
      const checkGoogleLoaded = () => {
        if (window.google?.accounts?.id) {
          try {
            // Initialize Google Identity Services
            window.google.accounts.id.initialize({
              client_id: this.GOOGLE_CLIENT_ID,
              callback: window.handleGoogleCallback,
              auto_select: false,
              cancel_on_tap_outside: true,
              ux_mode: 'popup',
              context: 'signin',
              itp_support: true
            });

            this.initialized = true;
            console.log('Google OAuth initialized successfully');
            resolve();
          } catch (error) {
            console.error('Failed to initialize Google OAuth:', error);
            reject(error);
          }
        } else {
          // Retry after a short delay
          setTimeout(checkGoogleLoaded, 100);
        }
      };

      // Start checking for Google Identity Services
      checkGoogleLoaded();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.initialized) {
          reject(new Error('Google Identity Services failed to load'));
        }
      }, 5000);
    });

    return this.initializationPromise;
  }

  /**
   * Handle credential response from Google
   */
  private handleCredentialResponse(response: any): void {
    console.log('Google credential response received');
    
    if (!response.credential) {
      console.error('No credential in response');
      this.emitLoginError();
      return;
    }

    // Send token to backend
    this.sendTokenToBackend(response.credential);
  }

  /**
   * Send Google token to backend for verification
   */
  private sendTokenToBackend(idToken: string): void {
    this.http.post<any>(`${this.baseUrl}/auth/google`, { idToken })
      .subscribe({
        next: (response) => {
          console.log('Google login successful:', response);
          
          // Store authentication tokens
          if (response.token) {
            localStorage.setItem('authToken', response.token);
          }
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          if (response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
          
          // Emit success event
          this.loginCompleteSubject.next(true);
          window.dispatchEvent(new CustomEvent('google-login-success', { 
            detail: response 
          }));
          
          // Navigate based on user state
          this.handlePostLogin(response.user);
        },
        error: (error) => {
          console.error('Google login failed:', error);
          this.handleLoginError(error);
        }
      });
  }

  /**
   * Handle post-login navigation
   */
  private handlePostLogin(user: any): void {
    if (!user.role || user.onboarding_step === 'need_role') {
      this.router.navigate(['/account-type']);
    } else if (user.onboarding_step === 'need_teacher_form') {
      this.router.navigate(['/teacher/setup']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Handle login errors
   */
  private handleLoginError(error: any): void {
    let errorMessage = 'Google sign-in failed';
    
    if (error.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.status === 401) {
      errorMessage = 'Invalid Google credentials';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    this.toastr.error(errorMessage, 'Sign-in Error');
    this.emitLoginError();
  }

  /**
   * Trigger Google OAuth login
   */
  async loginWithGoogle(): Promise<void> {
    try {
      // Ensure Google is initialized
      await this.initializeGoogle();
      
      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity Services not available');
      }

      // Trigger the sign-in prompt
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google One Tap was not displayed or was skipped');
          // Fall back to button click
          this.emitLoginError();
        }
      });
    } catch (error) {
      console.error('Failed to trigger Google login:', error);
      this.toastr.error('Failed to open Google sign-in', 'Error');
      this.emitLoginError();
    }
  }

  /**
   * Render Google sign-in button
   */
  renderGoogleButton(element: HTMLElement): void {
    if (!this.initialized || !window.google?.accounts?.id) {
      console.warn('Google not initialized, cannot render button');
      return;
    }

    try {
      window.google.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: element.offsetWidth || 280
      });
    } catch (error) {
      console.error('Error rendering Google button:', error);
    }
  }

  /**
   * Check if Google OAuth is available
   */
  isGoogleOAuthAvailable(): boolean {
    return this.initialized && !!window.google?.accounts?.id;
  }

  /**
   * Emit login error event
   */
  private emitLoginError(): void {
    window.dispatchEvent(new CustomEvent('google-login-error'));
  }

  /**
   * Revoke Google OAuth token
   */
  revokeGoogleToken(hint?: string): void {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      if (hint) {
        window.google.accounts.id.revoke(hint, (done: any) => {
          console.log('Google token revoked:', done);
        });
      }
    }
  }
}