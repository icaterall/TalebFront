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
        console.log('AccountTypeGuard: Redirecting to dashboard');
        this.router.navigate(['/dashboard']);
        return false;
      }
    }

    // User is authenticated and needs role selection
    console.log('AccountTypeGuard: Allowing access to account-type page');
    return true;
  }
}

