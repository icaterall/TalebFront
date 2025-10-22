import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private onboardingState: OnboardingStateService,
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

    // Check local onboarding state first (takes precedence during onboarding)
    const localState = this.onboardingState.getState();
    
    if (localState && localState.step !== 'complete') {
      console.log('OnboardingGuard: Found local onboarding state', localState);
      
      // Redirect based on local onboarding step
      switch (localState.step) {
        case 'select_role':
          if (state.url !== '/account-type') {
            this.router.navigate(['/account-type']);
            return false;
          }
          return true;
        
        case 'enter_dob':
          if (state.url !== '/account-type') {
            this.router.navigate(['/account-type']);
            return false;
          }
          return true;
        
        case 'student_registration':
          if (state.url !== '/student/registration') {
            this.router.navigate(['/student/registration']);
            return false;
          }
          return true;
        
        case 'teacher_setup':
          // For now, allow access to teacher routes
          // In the future, redirect to a specific setup page
          if (!state.url.startsWith('/teacher')) {
            this.router.navigate(['/teacher']);
            return false;
          }
          return true;
      }
    }

    // Fallback to server-side onboarding checks
    // If user needs role selection
    if (this.authService.needsRoleSelection()) {
      this.router.navigate(['/account-type']);
      return false;
    }

    // If user needs teacher setup
    if (this.authService.needsTeacherSetup()) {
      // For now, allow access to teacher routes
      if (!state.url.startsWith('/teacher')) {
        this.router.navigate(['/teacher']);
        return false;
      }
    }

    // User has completed onboarding - check if they should be redirected to appropriate dashboard
    if (user && user.onboarding_step === 'complete') {
      if (user.role === 'Student' && !state.url.startsWith('/student')) {
        console.log('OnboardingGuard: Completed student accessing non-student route, redirecting to student dashboard');
        this.router.navigate(['/student/dashboard']);
        return false;
      } else if (user.role === 'Teacher' && !state.url.startsWith('/teacher')) {
        console.log('OnboardingGuard: Completed teacher accessing non-teacher route, redirecting to teacher dashboard');
        this.router.navigate(['/teacher']);
        return false;
      }
    }

    // User has completed onboarding
    return true;
  }
}
