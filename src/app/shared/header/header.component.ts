// header.component.ts
import {
  ChangeDetectionStrategy, Component, HostListener, HostBinding,
  inject, ChangeDetectorRef, ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  // === existing fields ===
  isMenuOpen = false;
  isSwitchingLang = false;
 isSticky = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly el = inject(ElementRef<HTMLElement>);

  // === STICKY: bind sticky-on to host ===
  @HostBinding('class.sticky-on') sticky = false;

  // run once to set the initial state (equivalent to window load)
  ngAfterViewInit() {

  }

  @HostListener('window:scroll')
  onScroll() {
    this.isSticky = window.scrollY > 10;
  }



  // === optional: replicate the navbar toggler behavior from template ===
  // template toggled .mobile-menu-open on the header when navbar-toggler clicked.
  // If your toggler lives inside this component, just flip a HostBinding too:
  @HostBinding('class.mobile-menu-open') get mobileMenuOpenClass() {
    return this.isMenuOpen;
  }

  // === your existing API (unchanged) ===
  get currentLang(): Lang { return this.i18n.current; }

  async setLang(next: Lang) {
    if (this.isSwitchingLang) return;
    this.isSwitchingLang = true;
    try {
      await this.i18n.setLang(next);
      this.cdr.detectChanges();
      if (isPlatformBrowser(this.platformId)) this.document.documentElement.offsetHeight;
    } finally {
      this.isSwitchingLang = false;
      this.cdr.detectChanges();
    }
  }

  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.classList.toggle('no-scroll', this.isMenuOpen);
    }
  }

  closeMobileMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.classList.remove('no-scroll');
    }
  }

  onLogin() { console.log('Log In clicked'); }
  onJoinFree() { console.log('Join Free clicked'); }

  @HostListener('document:keydown.escape') onEsc() { this.closeMobileMenu(); }
  @HostListener('window:resize') onResize() {
    if (isPlatformBrowser(this.platformId) && window.innerWidth > 1060) {
      this.closeMobileMenu();
    }
  }
}
