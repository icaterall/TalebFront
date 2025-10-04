import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards/onboarding.guard';

export const appRoutes: Routes = [
  {
    path: 'account-type',
    loadComponent: () => import('./features/account-type-page/account-type-page.component').then(m => m.AccountTypePageComponent),
  },
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then(m => m.TEACHER_ROUTES),
    canActivate: [OnboardingGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
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
