import { Injectable, inject, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleOAuthService {
  private readonly GOOGLE_CLIENT_ID = environment.googleClientId || 'YOUR_GOOGLE_CLIENT_ID';
  private readonly baseUrl = environment.apiUrl;
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Check if Google Identity Services is ready
   */
  isReady(): boolean {
    return isPlatformBrowser(this.platformId) && !!(window.google?.accounts?.id);
  }

  /**
   * Initialize Google OAuth (now that script is loaded statically)
   */
  initializeGoogle(): Promise<void> {
    return new Promise((resolve) => {
      if (!isPlatformBrowser(this.platformId)) {
        resolve();
        return;
      }

      const tryInit = () => {
        if (!this.isReady()) {
          // Retry a few times if script hasn't finished loading yet
          setTimeout(tryInit, 100);
          return;
        }
        
        try {
          this.setupGoogleAuth();
          resolve();
        } catch (error) {
          console.warn('Google OAuth setup failed:', error);
          resolve(); // Don't reject, just continue without Google OAuth
        }
      };

      tryInit();
    });
  }

  private setupGoogleAuth(): void {
    try {
      // Check if client ID is valid before initializing
      if (this.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || !this.GOOGLE_CLIENT_ID) {
        console.error('Google Client ID not configured');
        this.toastr.error(
          this.translate.instant('authModal.googleClientIdNotConfigured'),
          this.translate.instant('authModal.error')
        );
        return;
      }

      // Get current language for Google Identity Services
      const currentLang = this.getCurrentLanguage();

      window.google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false, // Disable FedCM for localhost compatibility
        ux_mode: 'popup', // Use popup instead of redirect
        context: 'signin',
        locale: currentLang // Set the language for Google OAuth UI
      });
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
      this.toastr.error(
        this.translate.instant('authModal.googleNotInitialized'),
        this.translate.instant('authModal.error')
      );
    }
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

  /**
   * Handle Google OAuth credential response
   */
  private handleCredentialResponse(response: any): void {
    if (response.credential) {
      this.sendTokenToBackend(response.credential);
    }
  }

  /**
   * Send Google token to backend for verification
   */
  private sendTokenToBackend(idToken: string): void {
    this.http.post<any>(`${this.baseUrl}/auth/google-login`, { idToken })
      .subscribe({
        next: (response) => {
          console.log('Google login successful:', response);
          // Store tokens
          if (response.token) {
            localStorage.setItem('authToken', response.token);
          }
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          // TODO: Handle successful login (redirect, emit event, etc.)
        },
        error: (error) => {
          console.error('Google login failed:', error);
          this.toastr.error(
            this.translate.instant('authModal.genericError'),
            this.translate.instant('authModal.error')
          );
        }
      });
  }

  /**
   * Trigger Google OAuth login
   */
  loginWithGoogle(): void {
    // Check if client ID is valid
    if (this.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || !this.GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured');
      this.toastr.error(
        this.translate.instant('authModal.googleClientIdNotConfigured'),
        this.translate.instant('authModal.error')
      );
      this.emitLoginError();
      return;
    }

    if (!this.isReady()) {
      console.warn('Google Identity Services not ready');
      this.toastr.error(
        this.translate.instant('authModal.googleNotInitialized'),
        this.translate.instant('authModal.error')
      );
      this.emitLoginError();
      return;
    }

    try {
      // Use Google Identity Services prompt (no fallback to old OAuth)
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Error with Google prompt:', error);
      this.toastr.error(
        this.translate.instant('authModal.genericError'),
        this.translate.instant('authModal.error')
      );
      this.emitLoginError();
    }
  }

  /**
   * Check if Google OAuth is available
   */
  isGoogleOAuthAvailable(): boolean {
    return this.isReady();
  }


  /**
   * Render Google sign-in button using GIS
   */
  renderGoogleButton(element: HTMLElement): void {
    if (!this.isReady()) {
      console.warn('Google Identity Services not ready for button rendering');
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
        width: '100%'
      });
    } catch (error) {
      console.error('Error rendering Google button:', error);
    }
  }

  /**
   * Emit login error event to reset loading state
   */
  private emitLoginError(): void {
    // Dispatch a custom event that the login modal can listen to
    window.dispatchEvent(new CustomEvent('google-login-error'));
  }

}
