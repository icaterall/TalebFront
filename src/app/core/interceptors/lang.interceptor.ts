// src/app/core/interceptors/lang.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

function readStorage(key: string): 'ar' | 'en' | null {
  try {
    const s = sessionStorage.getItem(key) || localStorage.getItem(key);
    return s === 'en' || s === 'ar' ? s : null;
  } catch { return null; }
}

export const langInterceptor: HttpInterceptorFn = (req, next) => {
  // 1) Skip translation files and other static assets
  if (req.url.includes('/assets/i18n/')) {
    return next(req);
  }

  // 2) Resolve language without injecting I18nService (avoid cycles during init)
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  const doc = inject(DOCUMENT);

  let lang: 'ar' | 'en' = 'ar';

  if (isBrowser) {
    // priority: <html lang> → storage → default
    const attr = doc?.documentElement?.getAttribute('lang');
    if (attr === 'en' || attr === 'ar') lang = attr;
    else {
      const stored = readStorage('anataleb.lang');
      if (stored) lang = stored;
    }
  }

  // 3) Don’t override if caller already set a header
  if (req.headers.has('Accept-Language')) {
    return next(req);
  }

  // 4) Clone with the header
  const cloned = req.clone({ setHeaders: { 'Accept-Language': lang } });
  return next(cloned);
};
