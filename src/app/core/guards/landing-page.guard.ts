import { Injectable, OnInit } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, NavigationEnd } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LandingPageGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  private redirectCount = 0;
  private readonly MAX_REDIRECTS = 5;

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Circuit breaker: prevent infinite redirect loops
    this.redirectCount++;
    if (this.redirectCount > this.MAX_REDIRECTS) {
      console.error('⚠️ Too many redirects detected in LandingPageGuard, allowing access to prevent loop');
      this.redirectCount = 0;
      return true;
    }

    const user = this.authService.getCurrentUser();
    
    // If not authenticated, allow access to landing page
    if (!user) {
      this.redirectCount = 0; // Reset on successful path
      return true;
    }

    // If user is authenticated, redirect based on their status
    if (user.onboarding_step === 'complete') {
      // User has completed onboarding, redirect to appropriate dashboard
      if (user.role === 'Student') {
        this.router.navigateByUrl('/student/dashboard');
        return false;
      } else if (user.role === 'Teacher') {
        this.router.navigateByUrl('/teacher');
        return false;
      }
    }

    // If user needs role selection, redirect to account type page
    if (this.authService.needsRoleSelection()) {
      this.router.navigateByUrl('/account-type');
      return false;
    }

    // If user needs teacher setup, redirect to teacher routes
    if (this.authService.needsTeacherSetup()) {
      this.router.navigateByUrl('/teacher');
      return false;
    }

    // If user needs student registration, redirect to student registration
    if (user.onboarding_step === 'student_registration') {
      this.router.navigateByUrl('/student/registration');
      return false;
    }

    // Fallback: redirect to generic dashboard
    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
