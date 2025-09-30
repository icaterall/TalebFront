import { ChangeDetectionStrategy, Component, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { Router } from '@angular/router';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule, LoginModalComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  isMenuOpen = false;
  isSwitchingLang = false; // To prevent multiple clicks during transition
  showLoginModal = false;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  // Read-only snapshot of the current lang (service is the single source of truth)
  get currentLang(): Lang { 
    return this.i18n.current; 
  }

  // Toggle language via the service (persists to sessionStorage + flips dir/lang)
async setLang(next: Lang) {
  if (this.isSwitchingLang) return;
  this.isSwitchingLang = true;

  try {
    // ensure the drawer isn't left open when dir flips
    this.closeMobileMenu();

    await this.i18n.setLang(next);
    this.cdr.detectChanges();

    if (isPlatformBrowser(this.platformId)) {
      // force reflow so [dir] swap fully applies
      void this.document.documentElement.offsetHeight;
    }
  } finally {
    this.isSwitchingLang = false;
    this.cdr.markForCheck();
  }
}


toggleMobileMenu() {
  this.isMenuOpen = !this.isMenuOpen;
  if (isPlatformBrowser(this.platformId)) {
    this.document.body.classList.toggle('no-scroll', this.isMenuOpen);
  }
  this.cdr.markForCheck(); // <- ensure the [class.open] binding updates immediately
}
closeMobileMenu() {
  if (!this.isMenuOpen) return;
  this.isMenuOpen = false;
  if (isPlatformBrowser(this.platformId)) {
    this.document.body.classList.remove('no-scroll');
  }
  this.cdr.markForCheck();
}

  onLogin() {
    this.showLoginModal = true;
    this.cdr.markForCheck();
  }
  
  onJoinFree() {
    this.router.navigate(['/choose-account-type']);
  }
  
  onCloseLoginModal() {
    this.showLoginModal = false;
    this.cdr.markForCheck();
  }
  
  onSwitchToSignup() {
    this.showLoginModal = false;
    this.router.navigate(['/choose-account-type']);
    this.cdr.markForCheck();
  }
  
  onForgotPassword() {
    // TODO: Implement forgot password modal or navigation
    console.log('Forgot password');
  }
  @HostListener('document:keydown.escape')
  onEsc() { 
    this.closeMobileMenu(); 
  }

@HostListener('window:resize')
onResize() {
  if (isPlatformBrowser(this.platformId) && window.innerWidth > 1060) {
    this.closeMobileMenu();
  }
}
get isRtl(): boolean {
  return this.document?.documentElement?.dir === 'rtl';
}

get drawerTransform(): string {
  // closed position depends on writing-direction
  return this.isMenuOpen ? 'translateX(0)'
                         : (this.isRtl ? 'translateX(100%)' : 'translateX(-100%)');
}
}