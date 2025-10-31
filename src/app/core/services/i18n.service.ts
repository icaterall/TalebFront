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
    
    // Listen for user locale changes (avoid circular dependency with AuthService)
    if (this.isBrowser) {
      window.addEventListener('userLocaleChanged', ((event: CustomEvent<{ locale: string }>) => {
        const locale = event.detail?.locale;
        if (locale === 'ar' || locale === 'en') {
          this.syncWithUserLocale().catch(err => {
            console.error('Failed to sync language with user locale:', err);
          });
        }
      }) as EventListener);
    }
  }

  /** SSR-safe: only read localStorage in the browser */
  private readSaved(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const v = localStorage.getItem(this.STORAGE_KEY);
      return v === 'ar' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  /** Read persisted user locale from cached user profile */
  private readUserLocale(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) return null;
      const user = JSON.parse(storedUser);
      const locale = user?.locale;
      return locale === 'en' ? 'en' : locale === 'ar' ? 'ar' : null;
    } catch {
      return null;
    }
  }

  /** SSR-safe: detect browser language preference */
  private readBrowserLang(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const browserLang = navigator.language || (navigator as any).userLanguage;
      if (browserLang) {
        // Check for English variants (en, en-US, en-GB, etc.)
        if (browserLang.startsWith('en')) return 'en';
        // Check for Arabic variants (ar, ar-SA, ar-EG, etc.)
        if (browserLang.startsWith('ar')) return 'ar';
      }
      return null;
    } catch {
      return null;
    }
  }

  /** SSR-safe: don't rely on window; globalThis exists but we only read it in browser */
  private readInlineStartup(): Lang | null {
    if (!this.isBrowser) return null;
    try {
      const v = (globalThis as any).__ANATALEB_STARTUP_LANG__;
      return v === 'ar' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  /** Apply lang/dir to <html> and body. Works on server (Domino) and browser. */
  private apply(lang: Lang): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Apply to HTML element
    this.doc.documentElement.setAttribute('lang', lang);
    this.doc.documentElement.setAttribute('dir', dir);
    
    // Apply to body for CSS hooks
    if (this.doc.body) {
      if (dir === 'rtl') {
        this.doc.body.classList.add('rtl');
        this.doc.body.setAttribute('dir', 'rtl');
      } else {
        this.doc.body.classList.remove('rtl');
        this.doc.body.setAttribute('dir', 'ltr');
      }
    }
  }

  /** Called via APP_INITIALIZER. Promise makes Angular wait before first paint. */
  async init(): Promise<void> {
    try {
      // Priority: user profile → inline boot value → saved → browser → fallback 'ar'
      const userLocale = this.readUserLocale();
      const inline = this.readInlineStartup();
      const saved = this.readSaved();
      const browserLang = this.readBrowserLang();

      const initial: Lang = userLocale ?? inline ?? saved ?? browserLang ?? 'ar';

      this._lang$.next(initial);
      this.apply(initial);
      // Set default language to the initial language, with 'ar' as ultimate fallback
      this.translate.setDefaultLang(initial);

      if (this.isBrowser) {
        // Ensure storage reflects the language being used
        try {
          localStorage.setItem(this.STORAGE_KEY, initial);
        } catch {
          // Ignore storage errors (Safari private mode, etc.)
        }
        await firstValueFrom(this.translate.use(initial));
      } else {
        this.translate.use(initial);
      }
    } catch (error) {
      console.error('I18nService initialization failed:', error);
    }
  }

  /** Public API used by header toggle - THIS IS THE KEY FIX */
  async setLang(lang: Lang): Promise<void> {
    if (lang !== 'ar' && lang !== 'en') return;
    
    const previousLang = this._lang$.value; // Save previous language BEFORE updating
    console.log('Setting language to:', lang); // Debug log
    console.log('Current language before change:', previousLang);
    
    // Save to storage FIRST (before updating BehaviorSubject)
    // This ensures the interceptor reads the correct language immediately
    if (this.isBrowser) {
      try { 
        localStorage.setItem(this.STORAGE_KEY, lang);
        console.log('Language saved to storage:', lang); // Debug log
        
        // Also update sessionStorage as a backup (langInterceptor checks both)
        sessionStorage.setItem(this.STORAGE_KEY, lang);
      } catch (e) {
        console.error('Failed to save language to storage:', e);
      }
    }
    
    // Update the BehaviorSubject AFTER storage is updated
    this._lang$.next(lang);
    
    // Apply the language and direction changes
    this.apply(lang);
    
    // Update translation service
  console.log('Loading translations for:', lang);
  await firstValueFrom(this.translate.use(lang));
  console.log('Translations loaded for:', lang);
  console.log('Translation service current lang:', this.translate.currentLang);
  console.log('Translation service default lang:', this.translate.defaultLang);
    
    // Dispatch event after a short delay to ensure DOM and storage are fully updated
    // This ensures country and stage names are reloaded in the new language
    if (this.isBrowser) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('languageChanged', { 
          detail: { lang, previousLang } 
        }));
      }, 100); // 100ms delay to ensure all updates are applied
    }
  }

  get current(): Lang { 
    return this._lang$.value; 
  }

  /** Clear language storage and reset to default */
  clearLanguageStorage(): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('Language storage cleared');
      } catch (e) {
        console.error('Failed to clear language storage:', e);
      }
    }
  }

  /** Force reset language to English */
  async forceResetToEnglish(): Promise<void> {
    console.log('Force resetting to English');
    this.clearLanguageStorage();
    await this.setLang('en');
  }

  /** Manually reload translations for current language */
  async reloadTranslations(): Promise<void> {
    const currentLang = this._lang$.value;
    console.log('Reloading translations for:', currentLang);
    
    // Force reload the translation files
    await firstValueFrom(this.translate.reloadLang(currentLang));
    console.log('Translations reloaded for:', currentLang);
  }

  /** Sync language with user's locale preference (called after user data is loaded) */
  async syncWithUserLocale(): Promise<void> {
    const userLocale = this.readUserLocale();
    if (!userLocale) {
      // No user logged in, keep current language
      return;
    }
    
    const currentLang = this._lang$.value;
    if (userLocale !== currentLang) {
      console.log(`Syncing language from user preference: ${userLocale} (was ${currentLang})`);
      await this.setLang(userLocale);
    }
  }
}