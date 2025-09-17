import { Routes, PreloadAllModules } from '@angular/router';
import { withInMemoryScrolling, withViewTransitions, provideRouter, withPreloading } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';


// Lazy page loaders
const Landing = () => import('./layouts/features/landing-page/landing-page.component').then(m => m.LandingPageComponent);
const NotFound = () => import('./layouts/features/error-page/error-page.component').then(m => m.ErrorPageComponent);
const DashboardHome = () => import('./layouts/features/dashboard/pages/home/dashboard-home.component').then(m => m.DashboardHomeComponent);

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', loadComponent: Landing, title: 'ANATALEB' },
      { path: 'about', loadComponent: Landing, data: { simple: true } }, // example stub
    ]
  },
  {
    path: 'app',
    component: DashboardLayoutComponent,
    // canActivate: [authGuard], // add when ready
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: DashboardHome, title: 'Dashboard' },
      // more dashboard pages here...
    ]
  },
  { path: '**', redirectTo: '' }
];

// In app.config.ts add withPreloading & options (see below).
