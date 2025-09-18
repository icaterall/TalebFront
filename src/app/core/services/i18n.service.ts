import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

type Lang = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'anataleb.lang';
  private readonly isBrowser: boolean;

  private _lang$ = new BehaviorSubject<Lang>('ar');
  readonly lang$ = this._lang$.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** SSR-safe: only read sessionStorage in the browser */
  private readSaved(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const v = sessionStorage.getItem(this.STORAGE_KEY);
      return v === 'ar' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  /** SSR-safe: don’t rely on window; globalThis exists but we only read it in browser */
  private readInlineStartup(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const v = (globalThis as any).__ANATALEB_STARTUP_LANG__;
      return v === 'ar' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  /** Apply lang/dir to <html>. Works on server (Domino) and browser. */
  private apply(lang: Lang): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.doc.documentElement.setAttribute('lang', lang);
    this.doc.documentElement.setAttribute('dir', dir);
  }

  /** Called via APP_INITIALIZER. Promise makes Angular wait before first paint. */
  async init(): Promise<void> {
    // Priority: session value → inline boot value → default 'ar'
    const initial: Lang =
      this.readSaved() ??
      this.readInlineStartup() ??
      'ar';

    this._lang$.next(initial);
    this.apply(initial);
    this.translate.setDefaultLang(initial);

    // On the browser, wait for translations to load to avoid flicker.
    // On the server, skip waiting for HTTP to avoid window/DOM issues.
    if (this.isBrowser) {
      await firstValueFrom(this.translate.use(initial));
    }
  }

  /** Public API used by header toggle */
  setLang(lang: Lang): void {
    if (lang !== 'ar' && lang !== 'en') return;
    this._lang$.next(lang);
    this.apply(lang);
    this.translate.use(lang);
    if (this.isBrowser) {
      try { sessionStorage.setItem(this.STORAGE_KEY, lang); } catch {}
    }
  }

  get current(): Lang { return this._lang$.value; }
}
