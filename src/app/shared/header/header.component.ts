import { ChangeDetectionStrategy, Component, HostListener, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);

  // Read-only snapshot of the current lang (service is the single source of truth)
  get currentLang(): Lang { return this.i18n.current; }

  // Toggle language via the service (persists to sessionStorage + flips dir/lang)
  setLang(next: Lang) {
    this.i18n.setLang(next);
  }

  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.toggle('no-scroll', this.isMenuOpen);
    }
  }

  closeMobileMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('no-scroll');
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.closeMobileMenu(); }
}
