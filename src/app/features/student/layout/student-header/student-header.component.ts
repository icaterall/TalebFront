import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../../../core/services/i18n.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './student-header.component.html',
  styleUrls: ['./student-header.component.scss'],
})
export class StudentHeaderComponent implements OnInit, OnChanges {
  @Input() isMobile = false;
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  private i18n = inject(I18nService);
  private authService = inject(AuthService);
  private router = inject(Router);

  user: any = null;
  showProfileMenu = false;

  get currentLanguage(): string {
    return this.i18n.current === 'ar' ? 'EN' : 'ع';
  }

  get isRTL(): boolean {
    return this.i18n.current === 'ar';
  }

  get userName(): string {
    return this.user?.name || this.user?.email || 'Student';
  }

  get userInitials(): string {
    if (!this.user?.name) return 'S';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  get userPhoto(): string | null {
    return this.user?.photo || this.user?.profile_photo || this.user?.avatar || null;
  }

  ngOnInit(): void {
    // Universal authentication and role validation
    if (!this.authService.validateAuthAndRole('Student')) {
      return; // Validation failed, user will be redirected automatically
    }

    this.user = this.authService.getCurrentUser();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isMobile']) {
      // Handle mobile changes if needed
    }
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  async toggleLanguage(): Promise<void> {
    const newLang = this.i18n.current === 'ar' ? 'en' : 'ar';
    await this.i18n.setLang(newLang);
    // Reposition menu if it's open
    if (this.showProfileMenu) {
      this.adjustMenuPosition();
    }
  }

  onProfile(): void {
    this.router.navigateByUrl('/student/profile');
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  onAvatarClick(): void {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      this.adjustMenuPosition();
    }
  }

  private adjustMenuPosition(): void {
    setTimeout(() => {
      const menu = document.querySelector('.profile-menu') as HTMLElement;
      if (menu) {
        const isRTL = this.i18n.current === 'ar';
        if (isRTL) {
          // For RTL, position menu to the left of avatar
          menu.style.right = 'auto';
          menu.style.left = '0';
          menu.style.textAlign = 'right';
        } else {
          // For LTR, position menu to the right of avatar
          menu.style.right = '0';
          menu.style.left = 'auto';
          menu.style.textAlign = 'left';
        }
      }
    }, 0);
  }

  onProfileSettings(): void {
    this.showProfileMenu = false;
    this.router.navigateByUrl('/student/profile');
  }

  onSignOut(): void {
    this.showProfileMenu = false;
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const profileMenu = document.querySelector('.profile-menu');
    const avatarContainer = document.querySelector('.avatar-container');
    
    if (profileMenu && !profileMenu.contains(target) && !avatarContainer?.contains(target)) {
      this.showProfileMenu = false;
    }
  }
}
