import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleOAuthSimpleService {
  private readonly GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual Google Client ID
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Simple Google OAuth login using popup window
   */
  loginWithGoogle(): void {
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('openid email profile');
    const responseType = 'code';
    const state = this.generateState();
    
    // Store state for verification
    sessionStorage.setItem('google_oauth_state', state);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=${responseType}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;

    // Open popup window
    const popup = window.open(
      authUrl,
      'google-login',
      'width=500,height=600,scrollbars=yes,resizable=yes,top=100,left=100'
    );

    // Listen for popup completion
    this.listenForPopupCompletion(popup);
  }

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback(code: string, state: string): void {
    // Verify state
    const storedState = sessionStorage.getItem('google_oauth_state');
    if (state !== storedState) {
      console.error('Invalid state parameter');
      return;
    }

    // Clear stored state
    sessionStorage.removeItem('google_oauth_state');

    // Exchange code for token
    this.exchangeCodeForToken(code);
  }

  /**
   * Exchange authorization code for access token
   */
  private exchangeCodeForToken(code: string): void {
    const tokenData = {
      code: code,
      redirectUri: window.location.origin
    };

    this.http.post<any>(`${this.baseUrl}/auth/google-oauth-callback`, tokenData)
      .subscribe({
        next: (response) => {
          console.log('Google OAuth successful:', response);
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
          console.error('Google OAuth failed:', error);
          // TODO: Handle login error
        }
      });
  }

  /**
   * Listen for popup completion
   */
  private listenForPopupCompletion(popup: Window | null): void {
    if (!popup) return;

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Check if we have the authorization code in URL
        this.checkForAuthCode();
      }
    }, 1000);
  }

  /**
   * Check for authorization code in URL
   */
  private checkForAuthCode(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return;
    }

    if (code && state) {
      this.handleOAuthCallback(code, state);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
