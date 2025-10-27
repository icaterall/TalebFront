import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';

@Injectable({
  providedIn: 'root'
})
export class AccountTypeGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private onboardingState: OnboardingStateService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getCurrentUser();
    
    // Debug: Log user state
    console.log('AccountTypeGuard - User state:', {
      hasUser: !!user,
      role: user?.role,
      onboarding_step: user?.onboarding_step,
      currentUrl: state.url
    });
    
    // If not authenticated, redirect to landing page
    if (!user) {
      console.log('AccountTypeGuard - No user, redirecting to home');
      this.router.navigateByUrl('/');
      return false;
    }

    // If user already has a role, redirect based on onboarding step
    if (user.role && user.role !== '') {
      console.log('AccountTypeGuard - User has role:', user.role);
      
      // Check onboarding step - handle null/undefined cases
      const onboardingStep = user.onboarding_step || 'need_role';
      
      // If user has completed onboarding on server side, clear any stale local state
      if (onboardingStep === 'complete') {
        const local = this.onboardingState.getState();
        if (local && local.step !== 'complete') {
          console.log('AccountTypeGuard - Clearing stale local onboarding state');
          this.onboardingState.clearState();
        }
      }
      
      if (onboardingStep === 'need_teacher_form') {
        console.log('AccountTypeGuard - Redirecting to teacher setup');
        this.router.navigateByUrl('/teacher/setup');
        return false;
      } else if (onboardingStep === 'complete') {
        console.log('AccountTypeGuard - User completed onboarding, redirecting to dashboard');
        if (user.role === 'Student') {
          console.log('AccountTypeGuard - Redirecting student to student dashboard');
          this.router.navigateByUrl('/student/dashboard');
        } else if (user.role === 'Teacher') {
          console.log('AccountTypeGuard - Redirecting teacher to teacher dashboard');
          this.router.navigateByUrl('/teacher');
        } else {
          console.log('AccountTypeGuard - Redirecting to generic dashboard');
          this.router.navigateByUrl('/dashboard');
        }
        return false;
      }
    }

    // Additional check: If user has completed onboarding, they should not access account-type page
    const onboardingStep = user.onboarding_step || 'need_role';
    if (onboardingStep === 'complete') {
      console.log('AccountTypeGuard - Duplicate check: User completed onboarding');
      if (user.role === 'Student') {
        this.router.navigateByUrl('/student/dashboard');
      } else if (user.role === 'Teacher') {
        this.router.navigateByUrl('/teacher');
      } else {
        this.router.navigateByUrl('/dashboard');
      }
      return false;
    }

    // User is authenticated and needs role selection
    console.log('AccountTypeGuard - Allowing access to account-type page');
    return true;
  }
}

