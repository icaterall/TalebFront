import { Routes, PreloadAllModules } from '@angular/router';
import { withInMemoryScrolling, withViewTransitions, provideRouter, withPreloading } from '@angular/router';




export const routes: Routes = [
 { path: '', loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule)},
 
  { path: '**', redirectTo: '' }
];

// In app.config.ts add withPreloading & options (see below).
