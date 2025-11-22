import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards/onboarding.guard';
import { AccountTypeGuard } from './core/guards/account-type.guard';
import { StudentRegistrationGuard } from './core/guards/student-registration.guard';
import { DashboardRedirectGuard } from './core/guards/dashboard-redirect.guard';
import { LandingPageGuard } from './core/guards/landing-page.guard';

export const appRoutes: Routes = [
  // Public routes (with landing page guard to redirect authenticated users)
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./layouts/features/landing-page/landing-page.component').then(m => m.LandingPageComponent),
    canActivate: [LandingPageGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./layouts/features/landing-page/landing-page.component').then(m => m.LandingPageComponent),
    canActivate: [LandingPageGuard],
  },
  {
    path: 'auth/reset-password/:token',
    loadComponent: () => import('./features/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'auth/google-callback',
    loadComponent: () => import('./features/auth/google-callback/google-callback.component').then(m => m.GoogleCallbackComponent),
  },
  
  // Protected routes (with guards)
  {
    path: 'account-type',
    loadComponent: () => import('./features/account-type-page/account-type-page.component').then(m => m.AccountTypePageComponent),
    canActivate: [AccountTypeGuard],
  },
  {
    path: 'student/registration',
    loadComponent: () => import('./features/student/registration/student-registration.component').then(m => m.StudentRegistrationComponent),
    canActivate: [StudentRegistrationGuard],
  },
  {
    path: 'student',
    loadChildren: () => import('./features/student/student.routes').then(m => m.STUDENT_ROUTES),
    canActivate: [OnboardingGuard],
  },
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then(m => m.TEACHER_ROUTES),
    canActivate: [OnboardingGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./layouts/features/dashboard/pages/home/dashboard-home.component').then(m => m.DashboardHomeComponent),
    canActivate: [DashboardRedirectGuard],
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: '',
  },
];
