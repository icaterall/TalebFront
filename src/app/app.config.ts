// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom, ErrorHandler } from '@angular/core';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { APP_INITIALIZER } from '@angular/core';
import { I18nService } from './core/services/i18n.service';
import { ToastrModule } from 'ngx-toastr';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';

// ⬇️ import these
import { RECAPTCHA_V3_SITE_KEY } from 'ng-recaptcha-2';
import { environment } from '../environments/environment';
import { langInterceptor } from './core/interceptors/lang.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Global error handler to prevent hanging
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('❌ Global error:', error);
    // Dispatch ready event even on error to prevent infinite loading
    if (typeof window !== 'undefined' && !(window as any).anatalebReadySent) {
      (window as any).anatalebReadySent = true;
      console.log('⚠️ Error detected, forcing app reveal to prevent hang');
      window.dispatchEvent(new Event('AnatalebReady'));
    }
  }
}

function getStartupLang(): 'ar' | 'en' {
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  const v = w?.__ANATALEB_STARTUP_LANG__;
  return (v === 'en' || v === 'ar') ? v : 'ar'; // Default to Arabic
}

function initI18n(i18n: I18nService) { 
  return () => {
    console.time('appInit-i18n');
    const promise = i18n.init();
    promise.finally(() => {
      console.timeEnd('appInit-i18n');
    });
    return promise;
  };
}

const isServer = typeof window === 'undefined';

export const appConfig: ApplicationConfig = {
  providers: [
    // Global error handler to prevent infinite hangs
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    
    provideRouter(
      appRoutes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withPreloading(PreloadAllModules)
      // Note: enableTracing is not available in the new router configuration
      // Use browser dev tools Network tab or console logs for debugging
    ),
    provideHttpClient(withInterceptors([langInterceptor, authInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
      lang: getStartupLang(),
      fallbackLang: 'ar'
    }),
    { provide: APP_INITIALIZER, useFactory: initI18n, deps: [I18nService], multi: true },

    ...(isServer ? [provideNoopAnimations()] : [provideAnimations()]),
    importProvidersFrom(ToastrModule.forRoot({
      positionClass: 'toast-top-center',
      newestOnTop: true,
      preventDuplicates: true,
      closeButton: true,
      progressBar: false,
      timeOut: 4000,
      extendedTimeOut: 1000,
      easeTime: 150,
    })),

    // ✅ reCAPTCHA v3 site key provider (GLOBAL)
    { provide: RECAPTCHA_V3_SITE_KEY, useValue: environment.recaptchaSiteKey },
  ]
};