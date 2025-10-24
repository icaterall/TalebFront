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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | import('@angular/router').UrlTree {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.log('❌ No user → redirect to login');
      return this.router.createUrlTree(['/login']);       // ✅ redirect to public login route
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('❌ No token → redirect to login');
      return this.router.createUrlTree(['/login']);       // ✅ redirect to public login route
    }

    try {
      const exp = JSON.parse(atob(token.split('.')[1]))?.exp;
      if (exp && exp < Math.floor(Date.now()/1000)) {
        console.log('❌ Token expired → redirect to login');
        return this.router.createUrlTree(['/login']);     // ✅ redirect to public login route
      }
    } catch {
      console.log('❌ Invalid token → redirect to login');
      return this.router.createUrlTree(['/login']);      // ✅ redirect to public login route
    }

    const local = this.onboardingState.getState();
    if (local && local.step !== 'complete') {
      switch (local.step) {
        case 'select_role':
        case 'enter_dob':
          return state.url === '/account-type'
            ? true
            : this.router.createUrlTree(['/account-type']);           // ✅
        case 'student_registration':
          return state.url === '/student/registration'
            ? true
            : this.router.createUrlTree(['/student/registration']);    // ✅
        case 'teacher_setup':
          return state.url.startsWith('/teacher')
            ? true
            : this.router.createUrlTree(['/teacher']);                 // ✅
      }
    }

    if (this.authService.needsRoleSelection()) {
      return this.router.createUrlTree(['/account-type']);             // ✅
    }

    if (this.authService.needsTeacherSetup() && !state.url.startsWith('/teacher')) {
      return this.router.createUrlTree(['/teacher']);                  // ✅
    }

    if (user?.onboarding_step === 'complete') {
      if (user.role === 'Student' && !state.url.startsWith('/student')) {
        return this.router.createUrlTree(['/student/dashboard']);      // ✅
      }
      if (user.role === 'Teacher' && !state.url.startsWith('/teacher')) {
        return this.router.createUrlTree(['/teacher']);                // ✅
      }
    }

    return true;
  }
}
