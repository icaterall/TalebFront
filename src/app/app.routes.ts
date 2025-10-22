import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards/onboarding.guard';
import { AccountTypeGuard } from './core/guards/account-type.guard';
import { StudentRegistrationGuard } from './core/guards/student-registration.guard';

export const appRoutes: Routes = [
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
    path: 'student/dashboard',
    loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
    canActivate: [OnboardingGuard],
  },
  {
    path: 'student/profile',
    loadComponent: () => import('./features/student/profile/student-profile.component').then(m => m.StudentProfileComponent),
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
    canActivate: [OnboardingGuard],
  },
  {
    path: 'auth/reset-password/:token',
    loadComponent: () => import('./features/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./layouts/features/landing-page/landing-page.component').then(m => m.LandingPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
