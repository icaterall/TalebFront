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
      this.router.navigateByUrl('/');
      return false;
    }

    // If user has completed onboarding, redirect to appropriate dashboard
    if (user.onboarding_step === 'complete') {
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

    // Allow access to generic dashboard (fallback)
    return true;
  }
}
