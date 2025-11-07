import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class UniversalAuthService {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  /**
   * Universal method to validate authentication and role for any component
   * @param requiredRole - The role required to access the page (optional)
   * @param showToast - Whether to show error toast messages (default: true)
   * @returns boolean - true if valid, false if invalid
   */
  validateAccess(requiredRole?: string, showToast: boolean = true): boolean {

    // Use the universal validation from AuthService
    const isValid = this.authService.validateAuthAndRole(requiredRole);
    
    if (!isValid && showToast) {
      if (requiredRole) {
        this.toastr.error(`This page is for ${requiredRole}s only`);
      } else {
        this.toastr.error('Please login first');
      }
    }
    
    return isValid;
  }

  /**
   * Quick check if user is authenticated (no role validation)
   * @returns boolean - true if authenticated, false if not
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if user has specific role
   * @param role - The role to check for
   * @returns boolean - true if user has the role, false if not
   */
  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  /**
   * Get current user
   * @returns User | null - The current user or null
   */
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  /**
   * Get current user's role
   * @returns string | undefined - The user's role or undefined
   */
  getCurrentRole(): string | undefined {
    return this.authService.getCurrentRole();
  }

  /**
   * Get access token
   * @returns string | null
   */
  getAccessToken(): string | null {
    return this.authService.getAccessToken();
  }

  /**
   * Force logout with custom message
   * @param reason - The reason for logout
   */
  forceLogout(reason: string = 'Authentication failed'): void {
    this.authService.forceLogout(reason);
  }
}
