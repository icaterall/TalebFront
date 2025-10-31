import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class LocaleSyncService {
  private readonly isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private i18nService: I18nService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.authService.currentUser$
      .pipe(
        map(user => user?.locale ?? null),
        distinctUntilChanged()
      )
      .subscribe(locale => {
        if (!locale) {
          return;
        }

        const normalized = locale === 'ar' ? 'ar' : 'en';

        if (this.isBrowser) {
          try {
            localStorage.setItem('anataleb.lang', normalized);
          } catch (error) {
            console.error('Failed to cache locale preference', error);
          }
        }

        if (this.i18nService.current !== normalized) {
          void this.i18nService.setLang(normalized);
        }
      });
  }

  init(): Promise<void> {
    return Promise.resolve();
  }
}
