import { Component, inject, HostListener, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService, User } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FooterComponent } from '../../shared/footer/footer.component';
import { Subscription } from 'rxjs';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-account-type-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, FooterComponent],
  templateUrl: './account-type-page.component.html',
  styleUrls: ['./account-type-page.component.scss']
})
export class AccountTypePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly el = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  
  private userSubscription?: Subscription;

  showDateOfBirth = false;
  showTeacherDashboard = false;
  selectedYear = '';
  selectedMonth = '';
  selectedDay = '';
  showInfo = false;

  // Header: current user info
  user: User | null = null;

  ngOnInit() {
    // Subscribe to user changes for reactive updates
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('Account type page - user updated:', user);
      this.user = user;
      this.cdr.detectChanges(); // Manually trigger change detection
    });
  }

  ngOnDestroy() {
    // Clean up subscription
    this.userSubscription?.unsubscribe();
  }
  get userName(): string {
    return (this.user?.name || this.user?.email || '').toString();
  }
  get userEmail(): string {
    return this.user?.email || '';
  }
  get userAvatarUrl(): string {
    return this.user?.profile_photo_url || 'assets/default-avatar.png';
  }
  get hasAvatar(): boolean {
    return !!this.user?.profile_photo_url;
  }
  get userInitials(): string {
    const name = this.userName.trim();
    if (!name) return '';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || '';
    return (first + last).toUpperCase();
  }

  // Language button like teacher header
  get currentLanguage(): string {
    return this.currentLang.toUpperCase();
  }
  get languageButtonText(): string {
    // If current is RTL (ar), show EN; otherwise show Arabic letter
    return this.currentLang === 'ar' ? 'EN' : 'ع';
  }
  get languageClass(): 'ar' | 'en' {
    return this.currentLang === 'ar' ? 'ar' : 'en';
  }
  toggleLanguage() {
    const next = this.currentLang === 'ar' ? 'en' : 'ar';
    this.setLang(next as any);
  }

  // Placeholder for hamburger in header (no sidebar here)
  onToggle() {}

  // Avatar menu
  showUserMenu = false;
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }
  logout() {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.showUserMenu) return;
    const target = event.target as HTMLElement;
    if (!this.el.nativeElement.contains(target)) {
      this.showUserMenu = false;
    }
  }

  get currentLang(): Lang { 
    return this.i18n.current; 
  }

  async setLang(next: Lang) {
    await this.i18n.setLang(next);
  }

  async choose(type: 'Teacher' | 'Student') {
    console.log('Selected account type:', type);
    console.log('Current user before update:', this.user);
    
    try {
      // Try to update user role in backend
      console.log('Calling updateRole with:', type);
      const response = await this.authService.updateRole(type).toPromise();
      console.log('Update role response:', response);
      
      if (!response) {
        throw new Error('No response from server');
      }
      
      // Update local user state
      this.authService.storeAuthData(response.user, this.authService.getToken()!, this.authService.getRefreshToken()!);
      console.log('Auth data stored, user updated');
      
    } catch (error) {
      console.error('Error updating role:', error);
      console.error('Error details:', error);
      
      // Fallback: Update user locally without backend call
      console.log('Backend call failed, updating user locally as fallback');
      if (this.user) {
        const updatedUser = { ...this.user, role: type };
        this.authService.storeAuthData(updatedUser, this.authService.getToken()!, this.authService.getRefreshToken()!);
        console.log('User updated locally with role:', type);
      }
      
      // Show warning but continue
      this.toastr.warning('Backend connection failed, but continuing with local update');
    }
    
    // Navigate based on role (this runs regardless of backend success/failure)
    if (type === 'Student') {
      console.log('Showing date of birth form');
      this.showDateOfBirth = true;
      this.cdr.detectChanges(); // Force change detection
    } else if (type === 'Teacher') {
      console.log('Navigating to teacher setup');
      this.router.navigate(['/teacher/setup']);
    }
  }

  getYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i >= currentYear - 100; i--) {
      years.push(i.toString());
    }
    return years;
  }

  getMonths() {
    const isArabic = this.currentLang === 'ar';
    return [
      { value: '01', label: isArabic ? 'يناير' : 'January' },
      { value: '02', label: isArabic ? 'فبراير' : 'February' },
      { value: '03', label: isArabic ? 'مارس' : 'March' },
      { value: '04', label: isArabic ? 'أبريل' : 'April' },
      { value: '05', label: isArabic ? 'مايو' : 'May' },
      { value: '06', label: isArabic ? 'يونيو' : 'June' },
      { value: '07', label: isArabic ? 'يوليو' : 'July' },
      { value: '08', label: isArabic ? 'أغسطس' : 'August' },
      { value: '09', label: isArabic ? 'سبتمبر' : 'September' },
      { value: '10', label: isArabic ? 'أكتوبر' : 'October' },
      { value: '11', label: isArabic ? 'نوفمبر' : 'November' },
      { value: '12', label: isArabic ? 'ديسمبر' : 'December' }
    ];
  }

  getDays() {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i.toString().padStart(2, '0'));
    }
    return days;
  }

  isContinueDisabled() {
    return !this.selectedYear || !this.selectedMonth || !this.selectedDay;
  }

  continue() {
    if (!this.isContinueDisabled()) {
      this.router.navigate(['/signup'], {
        queryParams: { 
          type: 'student',
          year: this.selectedYear,
          month: this.selectedMonth,
          day: this.selectedDay
        }
      });
    }
  }

  goBack() {
    this.showDateOfBirth = false;
    this.selectedYear = '';
    this.selectedMonth = '';
    this.selectedDay = '';
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
  }
}
