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

      window.google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false, // Disable FedCM for localhost compatibility
        ux_mode: 'popup', // Use popup instead of redirect
        context: 'signin'
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
      // Use popup mode for better localhost compatibility
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to manual popup
          this.openGooglePopup();
        }
      });
    } catch (error) {
      console.error('Error with Google prompt:', error);
      this.toastr.error(
        this.translate.instant('authModal.genericError'),
        this.translate.instant('authModal.error')
      );
      this.emitLoginError();
      // Don't fallback to popup if there's an error
    }
  }

  /**
   * Check if Google OAuth is available
   */
  isGoogleOAuthAvailable(): boolean {
    return this.isReady();
  }


  /**
   * Emit login error event to reset loading state
   */
  private emitLoginError(): void {
    // Dispatch a custom event that the login modal can listen to
    window.dispatchEvent(new CustomEvent('google-login-error'));
  }

  private openGooglePopup(): void {
    // Fallback method using popup window
    const popup = window.open(
      `https://accounts.google.com/oauth/authorize?client_id=${this.GOOGLE_CLIENT_ID}&response_type=id_token&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(window.location.origin)}&nonce=${Date.now()}`,
      'google-login',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for popup messages
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.idToken) {
        this.handleCredentialResponse({ credential: event.data.idToken });
        window.removeEventListener('message', messageListener);
      }
    };

    window.addEventListener('message', messageListener);

    // Check if popup was closed
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  }

  /**
   * Render Google sign-in button
   */
  renderGoogleButton(elementId: string): void {
    if (window.google) {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%'
        }
      );
    }
  }
}
