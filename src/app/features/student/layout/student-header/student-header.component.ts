import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { I18nService } from '../../../../core/services/i18n.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-header',
  standalone: true,
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

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isMobile']) {
      console.log('Header isMobile changed:', this.isMobile);
    }
  }

  onMenuToggle(): void {
    console.log('Header toggle clicked, isMobile:', this.isMobile);
    this.menuToggle.emit();
  }

  async toggleLanguage(): Promise<void> {
    const newLang = this.i18n.current === 'ar' ? 'en' : 'ar';
    await this.i18n.setLang(newLang);
  }

  onProfile(): void {
    this.router.navigate(['/student/profile']);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
