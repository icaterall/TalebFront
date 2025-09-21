// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { APP_INITIALIZER } from '@angular/core';
import { I18nService } from './core/services/i18n.service';

import { ToastrModule } from 'ngx-toastr';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';

function getStartupLang(): 'ar' | 'en' {
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  const v = w?.__ANATALEB_STARTUP_LANG__;
  return (v === 'en' || v === 'ar') ? v : 'ar';
}

function initI18n(i18n: I18nService) {
  return () => i18n.init();
}

const isServer = typeof window === 'undefined';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withPreloading(PreloadAllModules)
    ),
    provideHttpClient(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
      lang: getStartupLang(),
      fallbackLang: 'en'
    }),
    { provide: APP_INITIALIZER, useFactory: initI18n, deps: [I18nService], multi: true },

    ...(isServer ? [provideNoopAnimations()] : [provideAnimations()]),
    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-bottom-center',
        preventDuplicates: true,
        timeOut: 4000,
        progressBar: true,
      })
    ),
  ]
};
