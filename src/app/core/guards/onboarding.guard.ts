import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {
  private authService = inject(AuthService);
  private onboardingState = inject(OnboardingStateService);
  private router = inject(Router);
  private redirectCount = 0;
  private readonly MAX_REDIRECTS = 5;

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | import('@angular/router').UrlTree {
    // Circuit breaker: prevent infinite redirect loops
    this.redirectCount++;
    if (this.redirectCount > this.MAX_REDIRECTS) {
      console.error('⚠️ Too many redirects detected in OnboardingGuard, allowing access to prevent loop');
      this.redirectCount = 0;
      return true;
    }

    const user = this.authService.getCurrentUser();

    // Debug: Log user state
    console.log('OnboardingGuard - User state:', {
      hasUser: !!user,
      role: user?.role,
      onboarding_step: user?.onboarding_step,
      currentUrl: state.url
    });

    if (!user) {
      console.log('OnboardingGuard - No user, redirecting to login');
      return this.router.createUrlTree(['/login']);       // ✅ redirect to public login route
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('OnboardingGuard - No token, redirecting to login');
      return this.router.createUrlTree(['/login']);       // ✅ redirect to public login route
    }

    try {
      const exp = JSON.parse(atob(token.split('.')[1]))?.exp;
      if (exp && exp < Math.floor(Date.now()/1000)) {
        console.log('OnboardingGuard - Token expired, redirecting to login');
        return this.router.createUrlTree(['/login']);     // ✅ redirect to public login route
      }
    } catch {
      console.log('OnboardingGuard - Invalid token, redirecting to login');
      return this.router.createUrlTree(['/login']);      // ✅ redirect to public login route
    }

    const local = this.onboardingState.getState();
    console.log('OnboardingGuard - Local onboarding state:', local);
    
    // If user has completed onboarding on server side, clear any stale local state
    if (user?.onboarding_step === 'complete') {
      if (local && local.step !== 'complete') {
        console.log('OnboardingGuard - Clearing stale local onboarding state');
        this.onboardingState.clearState();
      }
    }
    
    if (local && local.step !== 'complete') {
      console.log('OnboardingGuard - Local state not complete, checking step:', local.step);
      switch (local.step) {
        case 'select_role':
        case 'enter_dob':
          console.log('OnboardingGuard - Redirecting to account-type');
          return state.url === '/account-type'
            ? true
            : this.router.createUrlTree(['/account-type']);           // ✅
        case 'student_registration':
          console.log('OnboardingGuard - Redirecting to student registration');
          return state.url === '/student/registration'
            ? true
            : this.router.createUrlTree(['/student/registration']);    // ✅
        case 'teacher_setup':
          console.log('OnboardingGuard - Redirecting to teacher');
          return state.url.startsWith('/teacher')
            ? true
            : this.router.createUrlTree(['/teacher']);                 // ✅
      }
    }

    if (this.authService.needsRoleSelection()) {
      console.log('OnboardingGuard - User needs role selection, redirecting to account-type');
      return this.router.createUrlTree(['/account-type']);             // ✅
    }

    if (this.authService.needsTeacherSetup() && !state.url.startsWith('/teacher')) {
      console.log('OnboardingGuard - User needs teacher setup, redirecting to teacher');
      return this.router.createUrlTree(['/teacher']);                  // ✅
    }

    // Handle onboarding step with fallback for null/undefined
    const onboardingStep = user?.onboarding_step || 'need_role';
    if (onboardingStep === 'complete') {
      console.log('OnboardingGuard - User completed onboarding, checking role and URL');
      if (user.role === 'Student' && !state.url.startsWith('/student')) {
        console.log('OnboardingGuard - Redirecting student to student dashboard');
        return this.router.createUrlTree(['/student/dashboard']);      // ✅
      }
      if (user.role === 'Teacher' && !state.url.startsWith('/teacher')) {
        console.log('OnboardingGuard - Redirecting teacher to teacher dashboard');
        return this.router.createUrlTree(['/teacher']);                // ✅
      }
    }

    console.log('OnboardingGuard - Allowing access');
    return true;
  }
}
