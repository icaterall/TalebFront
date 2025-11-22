import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleOAuthService } from '../../../core/services/google-oauth.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-callback-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>{{ currentLang === 'ar' ? 'جارٍ معالجة تسجيل الدخول...' : 'Processing login...' }}</p>
      </div>
    </div>
  `,
  styles: [`
    .google-callback-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
    }
    
    .loading-spinner {
      text-align: center;
      
      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e2e8f0;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1rem;
      }
      
      p {
        color: #64748b;
        font-size: 1rem;
        margin: 0;
      }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private googleOAuth = inject(GoogleOAuthService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private i18nService = inject(I18nService);

  get currentLang(): string {
    return this.i18nService.current;
  }

  ngOnInit(): void {
    // Check for authorization code in query params
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.handleError(error);
        return;
      }

      if (code) {
        this.handleCallback(code, state);
      } else {
        // If no code, check for credential response (popup mode)
        // This might be handled by the service directly
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      }
    });
  }

  private handleCallback(code: string, state?: string): void {
    // For OAuth flow with authorization code, we need to exchange it for tokens
    // The backend should handle the code exchange
    // For now, if we receive a code, we'll need to handle it via the backend
    // Check if this is an idToken (from popup flow) or code (from redirect flow)
    
    // If it's a code, we might need a different endpoint
    // For now, redirect to home and let the service handle it
    // The Google OAuth service uses popup mode, so this callback might not be used
    // But we'll handle it gracefully
    
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1000);
  }

  private handleError(error: string): void {
    console.error('Google OAuth error:', error);
    this.toastr.error(
      this.currentLang === 'ar' 
        ? 'حدث خطأ أثناء تسجيل الدخول' 
        : 'An error occurred during login'
    );
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000);
  }
}

