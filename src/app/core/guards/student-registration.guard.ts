import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class StudentRegistrationGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getCurrentUser();
    
    // If not authenticated, redirect to landing page
    if (!user) {
      console.log('StudentRegistrationGuard: User not authenticated, redirecting to home');
      this.router.navigate(['/']);
      return false;
    }

    // If user doesn't have Student role, redirect to account-type
    if (user.role !== 'Student') {
      console.log('StudentRegistrationGuard: User is not a student, redirecting to account-type');
      this.router.navigate(['/account-type']);
      return false;
    }

    // If user has already completed onboarding, redirect to dashboard
    if (user.onboarding_step === 'complete') {
      console.log('StudentRegistrationGuard: User completed onboarding, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return false;
    }

    // User is authenticated, has Student role, and needs to complete registration
    console.log('StudentRegistrationGuard: Allowing access to student registration');
    return true;
  }
}

