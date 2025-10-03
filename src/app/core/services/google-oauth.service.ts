import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleOAuthService {
  private readonly GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual client ID

  constructor(private http: HttpClient) {}

  /**
   * Initialize Google OAuth
   */
  initializeGoogle(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: this.GOOGLE_CLIENT_ID,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: false
        });
        resolve();
      } else {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.google.accounts.id.initialize({
            client_id: this.GOOGLE_CLIENT_ID,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: false
          });
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      }
    });
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
    this.http.post<any>('/api/auth/google-login', { idToken })
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
          // TODO: Handle login error
        }
      });
  }

  /**
   * Trigger Google OAuth login
   */
  loginWithGoogle(): void {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      console.error('Google Identity Services not initialized');
    }
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
