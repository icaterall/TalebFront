import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then(m => m.TEACHER_ROUTES),
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
