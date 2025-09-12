import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      // IMPORTANT: use a relative prefix so it works in dev & prod
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',   // not /assets/...
        suffix: '.json'
      }),
      lang: 'ar',
      fallbackLang: 'en'
    })
  ]
};
