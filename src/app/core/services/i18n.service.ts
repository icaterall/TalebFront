import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

type Lang = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'anataleb.lang';
  private readonly isBrowser: boolean;

  private _lang$ = new BehaviorSubject<Lang>('en');
  readonly lang$ = this._lang$.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
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
      // Priority: session value → browser language → inline boot value → default 'en'
      const saved = this.readSaved();
      const browser = this.readBrowserLang();
      const inline = this.readInlineStartup();
      
      const initial: Lang = saved ?? browser ?? inline ?? 'en';
      
      console.log('Language initialization:', {
        saved,
        browser,
        inline,
        initial
      });

      this._lang$.next(initial);
      this.apply(initial);
      this.translate.setDefaultLang('en'); // Set fallback
      
      // Set the default language first
      this.translate.setDefaultLang('en');
      console.log('Default language set to: en');
      
      // Then use the initial language
      this.translate.use(initial);
      console.log('Using initial language:', initial);

      // On the browser, wait for translations to load to avoid flicker.
      // On the server, skip waiting for HTTP to avoid window/DOM issues.
      if (this.isBrowser) {
        await firstValueFrom(this.translate.use(initial));
        console.log('Translation loaded for:', initial);
      }
    } catch (error) {
      console.error('I18nService initialization failed:', error);
    }
  }

  /** Public API used by header toggle - THIS IS THE KEY FIX */
  async setLang(lang: Lang): Promise<void> {
    if (lang !== 'ar' && lang !== 'en') return;
    
    console.log('Setting language to:', lang); // Debug log
    console.log('Current language before change:', this._lang$.value);
    
    // Update the BehaviorSubject
    this._lang$.next(lang);
    
    // Apply the language and direction changes
    this.apply(lang);
    
    // Update translation service
    console.log('Loading translations for:', lang);
    await firstValueFrom(this.translate.use(lang));
    console.log('Translations loaded for:', lang);
    
    // Verify the translation service has the correct language
    console.log('Translation service current lang:', this.translate.currentLang);
    console.log('Translation service default lang:', this.translate.defaultLang);
    
    // Test a translation to see if it's working
    const testTranslation = this.translate.instant('student.student');
    console.log('Test translation result for student.student:', testTranslation);
    
    // Test sidebar translation
    const sidebarTest = this.translate.instant('student.sidebar.dashboard');
    console.log('Test translation result for student.sidebar.dashboard:', sidebarTest);
    
    // Save to storage
    if (this.isBrowser) {
      try { 
        localStorage.setItem(this.STORAGE_KEY, lang);
        console.log('Language saved to storage:', lang); // Debug log
      } catch (e) {
        console.error('Failed to save language to storage:', e);
      }
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
}