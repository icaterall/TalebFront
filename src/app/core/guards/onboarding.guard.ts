import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getCurrentUser();
    
    // If not authenticated, allow access (will be handled by auth guard)
    if (!user) {
      return true;
    }

    // If user needs role selection
    if (this.authService.needsRoleSelection()) {
      this.router.navigate(['/account-type']);
      return false;
    }

    // If user needs teacher setup
    if (this.authService.needsTeacherSetup()) {
      // Allow access to teacher setup page
      if (state.url !== '/teacher/setup') {
        this.router.navigate(['/teacher/setup']);
        return false;
      }
    }

    // User has completed onboarding
    return true;
  }
}
