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

      // Initialize GIS for One Tap (auto-prompt)
      window.google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleOneTapResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false, // Disable FedCM to avoid AbortError
        ux_mode: 'popup',
        context: 'signin',
        locale: currentLang
      });

      // Initialize OAuth 2.0 Code Client for manual sign-in
      this.initializeCodeClient();
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
      this.toastr.error(
        this.translate.instant('authModal.googleNotInitialized'),
        this.translate.instant('authModal.error')
      );
    }
  }

  private initializeCodeClient(): void {
    try {
      window.google.accounts.oauth2.initCodeClient({
        client_id: this.GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: this.handleCodeResponse.bind(this)
      });
    } catch (error) {
      console.error('Error initializing OAuth Code Client:', error);
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
   * Handle One Tap response (auto-prompt)
   */
  private handleOneTapResponse(response: any): void {
    if (response.credential) {
      this.sendTokenToBackend(response.credential);
    }
  }

  /**
   * Handle OAuth Code response (manual sign-in)
   */
  private handleCodeResponse(response: any): void {
    if (response.code) {
      // Exchange code for token
      this.exchangeCodeForToken(response.code);
    }
  }

  /**
   * Exchange authorization code for ID token
   */
  private exchangeCodeForToken(code: string): void {
    this.http.post<any>(`${this.baseUrl}/auth/google-code-exchange`, { code })
      .subscribe({
        next: (response) => {
          if (response.idToken) {
            this.sendTokenToBackend(response.idToken);
          }
        },
        error: (error) => {
          console.error('Code exchange failed:', error);
          this.toastr.error(
            this.translate.instant('authModal.genericError'),
            this.translate.instant('authModal.error')
          );
        }
      });
  }

  /**
   * Send Google token to backend for verification
   */
  private sendTokenToBackend(idToken: string): void {
    this.http.post<any>(`${this.baseUrl}/auth/google`, { idToken })
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
   * Initialize One Tap auto-prompt (called once on modal open)
   */
  initOneTapAutoPrompt(): void {
    if (!this.isReady()) {
      console.warn('Google Identity Services not ready');
      return;
    }

    try {
      window.google.accounts.id.prompt((notification: any) => {
        // Handle One Tap dismissal - do not retry
        if (notification.isNotDisplayed() || 
            notification.isSkippedMoment() || 
            notification.getMomentType() === 'dismissed') {
          console.log('One Tap dismissed by user');
          // Emit event to reset loading state
          window.dispatchEvent(new CustomEvent('google-login-error'));
          return;
        }
      });
    } catch (error) {
      console.error('One Tap initialization failed:', error);
      window.dispatchEvent(new CustomEvent('google-login-error'));
    }
  }

  /**
   * Get Google ID token for manual sign-in
   */
  getGoogleIdToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isReady()) {
        reject(new Error('Google Identity Services not ready'));
        return;
      }

      try {
        // Use manual popup for sign-in
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || 
              notification.isSkippedMoment() || 
              notification.getMomentType() === 'dismissed') {
            reject(new Error('Google sign-in cancelled'));
            return;
          }
        });

        // Set up callback for credential response
        window.google.accounts.id.initialize({
          client_id: this.GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.credential) {
              resolve(response.credential);
            } else {
              reject(new Error('No credential received'));
            }
          },
          use_fedcm_for_prompt: false, // Disable FedCM to avoid AbortError
          ux_mode: 'popup',
          context: 'signin',
          locale: this.getCurrentLanguage()
        });

      } catch (error) {
        reject(error);
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
