import { ChangeDetectionStrategy, Component, HostListener, inject, ChangeDetectorRef } from '@angular/core';
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
  isMenuOpen = false;
  isSwitchingLang = false; // To prevent multiple clicks during transition

  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);

  // Read-only snapshot of the current lang (service is the single source of truth)
  get currentLang(): Lang { 
    return this.i18n.current; 
  }

  // Toggle language via the service (persists to sessionStorage + flips dir/lang)
  async setLang(next: Lang) {
    if (this.isSwitchingLang) return; // Prevent multiple clicks
    
    this.isSwitchingLang = true;
    
    try {
      // Call the async setLang method
      await this.i18n.setLang(next);
      
      // Force change detection to update the UI
      this.cdr.detectChanges();
      
      // Optional: Add a small delay for visual feedback
      if (isPlatformBrowser(this.platformId)) {
        // Force a layout recalculation to ensure RTL/LTR is applied
        this.document.documentElement.offsetHeight;
      }
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
    // Implement your login logic here
    console.log('Log In clicked');
  }
  onJoinFree() {
    // Implement your login logic here
    console.log('Log In clicked');
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
}