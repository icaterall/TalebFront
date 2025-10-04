// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
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

function getStartupLang(): 'ar' | 'en' {
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  const v = w?.__ANATALEB_STARTUP_LANG__;
  return (v === 'en' || v === 'ar') ? v : 'en'; // Default to English instead of Arabic
}
function initI18n(i18n: I18nService) { return () => i18n.init(); }

const isServer = typeof window === 'undefined';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withPreloading(PreloadAllModules)
    ),
    provideHttpClient(withInterceptors([langInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
      lang: getStartupLang(),
      fallbackLang: 'en'
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
