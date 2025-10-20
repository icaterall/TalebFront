import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards/onboarding.guard';

export const appRoutes: Routes = [
  {
    path: 'account-type',
    loadComponent: () => import('./features/account-type-page/account-type-page.component').then(m => m.AccountTypePageComponent),
  },
  {
    path: 'student/registration',
    loadComponent: () => import('./features/student/registration/student-registration.component').then(m => m.StudentRegistrationComponent),
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
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./layouts/features/landing-page/landing-page.component').then(m => m.LandingPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
