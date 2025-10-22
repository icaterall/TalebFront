import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardRedirectGuard implements CanActivate {

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
      console.log('DashboardRedirectGuard: User not authenticated, redirecting to home');
      this.router.navigate(['/']);
      return false;
    }

    // If user has completed onboarding, redirect to appropriate dashboard
    if (user.onboarding_step === 'complete') {
      console.log('DashboardRedirectGuard: User has completed onboarding, redirecting to appropriate dashboard');
      if (user.role === 'Student') {
        console.log('DashboardRedirectGuard: Redirecting student to student dashboard');
        this.router.navigate(['/student/dashboard']);
        return false;
      } else if (user.role === 'Teacher') {
        console.log('DashboardRedirectGuard: Redirecting teacher to teacher dashboard');
        this.router.navigate(['/teacher']);
        return false;
      }
    }

    // If user needs role selection, redirect to account type page
    if (this.authService.needsRoleSelection()) {
      console.log('DashboardRedirectGuard: User needs role selection, redirecting to account-type');
      this.router.navigate(['/account-type']);
      return false;
    }

    // If user needs teacher setup, redirect to teacher routes
    if (this.authService.needsTeacherSetup()) {
      console.log('DashboardRedirectGuard: User needs teacher setup, redirecting to teacher');
      this.router.navigate(['/teacher']);
      return false;
    }

    // Allow access to generic dashboard (fallback)
    console.log('DashboardRedirectGuard: Allowing access to generic dashboard');
    return true;
  }
}
