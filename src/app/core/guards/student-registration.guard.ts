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
      this.router.navigateByUrl('/');
      return false;
    }

    // If user doesn't have Student role, redirect to account-type
    if (user.role !== 'Student') {
      this.router.navigateByUrl('/account-type');
      return false;
    }

    // If user has already completed onboarding, redirect to dashboard
    if (user.onboarding_step === 'complete') {
      this.router.navigateByUrl('/dashboard');
      return false;
    }

    // User is authenticated, has Student role, and needs to complete registration
    return true;
  }
}

