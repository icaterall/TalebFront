import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    this.http.post<any>('/api/auth/apple-login', { idToken, userInfo })
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
          // TODO: Handle login error
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
        });
    } else {
      console.error('Apple Sign In not initialized');
    }
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
