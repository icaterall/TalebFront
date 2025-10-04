import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

declare global {
  interface Window {
    AppleID: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AppleOAuthService {
  private readonly APPLE_CLIENT_ID = 'YOUR_APPLE_CLIENT_ID'; // Replace with your actual client ID
  private readonly APPLE_REDIRECT_URI = 'YOUR_REDIRECT_URI'; // Replace with your actual redirect URI
  private readonly baseUrl = environment.apiUrl;
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  constructor(private http: HttpClient) {}

  /**
   * Initialize Apple OAuth
   */
  initializeApple(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.AppleID) {
        window.AppleID.auth.init({
          clientId: this.APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: this.APPLE_REDIRECT_URI,
          state: 'apple_signin',
          usePopup: true,
          responseMode: 'form_post'
        });
        resolve();
      } else {
        // Load Apple Sign In script
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        script.onload = () => {
          window.AppleID.auth.init({
            clientId: this.APPLE_CLIENT_ID,
            scope: 'name email',
            redirectURI: this.APPLE_REDIRECT_URI,
            state: 'apple_signin',
            usePopup: true,
            responseMode: 'form_post'
          });
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Apple Sign In script'));
        document.head.appendChild(script);
      }
    });
  }

  /**
   * Handle Apple OAuth response
   */
  private handleAppleResponse(response: any): void {
    if (response.authorization && response.authorization.id_token) {
      this.sendTokenToBackend(response.authorization.id_token, response.user);
    }
  }

  /**
   * Send Apple token to backend for verification
   */
  private sendTokenToBackend(idToken: string, userInfo: any = null): void {
    this.http.post<any>(`${this.baseUrl}/auth/apple-login`, { idToken, userInfo })
      .subscribe({
        next: (response) => {
          console.log('Apple login successful:', response);
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
          console.error('Apple login failed:', error);
          this.toastr.error(
            this.translate.instant('authModal.genericError'),
            this.translate.instant('authModal.error')
          );
        }
      });
  }

  /**
   * Trigger Apple OAuth login
   */
  loginWithApple(): void {
    if (window.AppleID) {
      window.AppleID.auth.signIn()
        .then((response: any) => {
          this.handleAppleResponse(response);
        })
        .catch((error: any) => {
          console.error('Apple Sign In failed:', error);
          this.toastr.error(
            this.translate.instant('authModal.genericError'),
            this.translate.instant('authModal.error')
          );
          this.emitLoginError();
        });
    } else {
      console.error('Apple Sign In not initialized');
      this.toastr.error(
        this.translate.instant('authModal.appleNotInitialized'),
        this.translate.instant('authModal.error')
      );
      this.emitLoginError();
    }
  }

  /**
   * Emit login error event to reset loading state
   */
  private emitLoginError(): void {
    // Dispatch a custom event that the login modal can listen to
    window.dispatchEvent(new CustomEvent('apple-login-error'));
  }

  /**
   * Render Apple sign-in button
   */
  renderAppleButton(elementId: string): void {
    if (window.AppleID) {
      window.AppleID.auth.renderButton({
        element: document.getElementById(elementId),
        type: 'sign in',
        theme: 'black',
        style: 'black',
        height: 48,
        width: '100%',
        borderRadius: 6
      });
    }
  }
}
