import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AccountTypeGuard implements CanActivate {

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
      console.log('AccountTypeGuard: User not authenticated, redirecting to home');
      this.router.navigate(['/']);
      return false;
    }

    // If user already has a role, redirect based on onboarding step
    if (user.role && user.role !== '') {
      console.log('AccountTypeGuard: User already has role:', user.role);
      
      // Check onboarding step
      if (user.onboarding_step === 'need_teacher_form') {
        console.log('AccountTypeGuard: Redirecting to teacher setup');
        this.router.navigate(['/teacher/setup']);
        return false;
      } else if (user.onboarding_step === 'complete') {
        console.log('AccountTypeGuard: User has completed onboarding, redirecting to appropriate dashboard');
        if (user.role === 'Student') {
          console.log('AccountTypeGuard: Redirecting student to student dashboard');
          this.router.navigate(['/student/dashboard']);
        } else if (user.role === 'Teacher') {
          console.log('AccountTypeGuard: Redirecting teacher to teacher dashboard');
          this.router.navigate(['/teacher']);
        } else {
          console.log('AccountTypeGuard: Redirecting to generic dashboard');
          this.router.navigate(['/dashboard']);
        }
        return false;
      }
    }

    // Additional check: If user has completed onboarding, they should not access account-type page
    if (user.onboarding_step === 'complete') {
      console.log('AccountTypeGuard: User has completed onboarding, preventing access to account-type page');
      if (user.role === 'Student') {
        this.router.navigate(['/student/dashboard']);
      } else if (user.role === 'Teacher') {
        this.router.navigate(['/teacher']);
      } else {
        this.router.navigate(['/dashboard']);
      }
      return false;
    }

    // User is authenticated and needs role selection
    console.log('AccountTypeGuard: Allowing access to account-type page');
    return true;
  }
}

