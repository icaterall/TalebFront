import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  isMenuOpen = false;
  currentLang: Lang = 'ar';
  constructor(
    private i18n: TranslateService,
    @Inject(PLATFORM_ID) private platformId: object
  ) { this.setLang((this.i18n.currentLang as Lang) || 'ar'); }

  toggleMobileMenu(){ this.isMenuOpen = !this.isMenuOpen;
    if (isPlatformBrowser(this.platformId)) document.body.classList.toggle('no-scroll', this.isMenuOpen);
  }
  closeMobileMenu(){ if (!this.isMenuOpen) return;
    this.isMenuOpen = false; if (isPlatformBrowser(this.platformId)) document.body.classList.remove('no-scroll');
  }
  @HostListener('document:keydown.escape') onEsc(){ this.closeMobileMenu(); }

  setLang(lang: Lang) {
    this.currentLang = lang; this.i18n.use(lang);
    if (!isPlatformBrowser(this.platformId)) return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
    document.body.classList.toggle('rtl', dir==='rtl');
  }
}
