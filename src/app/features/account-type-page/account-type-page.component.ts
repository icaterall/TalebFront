import { Component, inject, HostListener, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService, User } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
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
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly toastr = inject(ToastrService);
  private readonly el = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  
  private userSubscription?: Subscription;

  showDateOfBirth = false;
  showTeacherDashboard = false;
  
  private _selectedYear = '';
  private _selectedMonth = '';
  private _selectedDay = '';
  
  get selectedYear() { return this._selectedYear; }
  set selectedYear(value: string) {
    this._selectedYear = value;
    this.validateAndAdjustDay(); // Check if current day is still valid
    this.saveDateOfBirthProgress();
    this.cdr.detectChanges(); // Update age display
  }
  
  get selectedMonth() { return this._selectedMonth; }
  set selectedMonth(value: string) {
    this._selectedMonth = value;
    this.validateAndAdjustDay(); // Check if current day is still valid
    this.saveDateOfBirthProgress();
    this.cdr.detectChanges(); // Update age display
  }
  
  get selectedDay() { return this._selectedDay; }
  set selectedDay(value: string) {
    this._selectedDay = value;
    this.saveDateOfBirthProgress();
    this.cdr.detectChanges(); // Update age display
  }
  
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

    // Restore onboarding state from localStorage
    this.restoreOnboardingState();
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
    // Clear onboarding state when logging out
    this.onboardingState.clearState();
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

  /**
   * Restore onboarding state from localStorage
   */
  private restoreOnboardingState(): void {
    const state = this.onboardingState.getState();
    
    if (!state) {
      return; // No saved state, show role selection
    }

    console.log('Restoring onboarding state:', state);

    // If user selected Student role but hasn't completed DOB, show DOB form
    if (state.step === 'enter_dob' && state.selectedRole === 'Student') {
      this.showDateOfBirth = true;
      
      // Restore DOB fields if they were partially filled (without triggering save)
      if (state.dateOfBirth) {
        this._selectedYear = state.dateOfBirth.year || '';
        this._selectedMonth = state.dateOfBirth.month || '';
        this._selectedDay = state.dateOfBirth.day || '';
      }
      
      this.cdr.detectChanges();
    }
  }

  /**
   * Validate and adjust day if it becomes invalid after month/year change
   */
  private validateAndAdjustDay(): void {
    if (!this._selectedDay || !this._selectedMonth) {
      return;
    }

    const maxDays = this.getMaxDaysInMonth();
    const currentDay = parseInt(this._selectedDay, 10);

    // If current day exceeds max days in month, reset it
    if (currentDay > maxDays) {
      this._selectedDay = '';
      console.log(`Day ${currentDay} is invalid for selected month/year. Resetting day selection.`);
    }
  }

  /**
   * Save partial date of birth progress to localStorage
   */
  private saveDateOfBirthProgress(): void {
    // Only save if we're on the DOB step
    if (this.showDateOfBirth) {
      this.onboardingState.updateState({
        dateOfBirth: {
          year: this._selectedYear,
          month: this._selectedMonth,
          day: this._selectedDay
        }
      });
    }
  }

  async choose(type: 'Teacher' | 'Student') {
    console.log('Selected account type:', type);
    
    // Save the role selection to localStorage (not to backend yet)
    this.onboardingState.saveRoleSelection(type);
    console.log('Role saved to localStorage:', type);
    
    // Navigate based on role
    if (type === 'Student') {
      console.log('Showing date of birth form');
      this.showDateOfBirth = true;
      this.cdr.detectChanges(); // Force change detection
    } else if (type === 'Teacher') {
      console.log('Navigating to teacher dashboard');
      this.router.navigate(['/teacher']);
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
    // Calculate maximum days based on selected month and year
    const maxDays = this.getMaxDaysInMonth();
    const days = [];
    for (let i = 1; i <= maxDays; i++) {
      days.push(i.toString().padStart(2, '0'));
    }
    return days;
  }

  /**
   * Get maximum days in the selected month
   */
  private getMaxDaysInMonth(): number {
    if (!this._selectedMonth) {
      return 31; // Default to 31 if no month selected
    }

    const month = parseInt(this._selectedMonth, 10);
    const year = this._selectedYear ? parseInt(this._selectedYear, 10) : new Date().getFullYear();

    // Months with 31 days: Jan, Mar, May, Jul, Aug, Oct, Dec
    if ([1, 3, 5, 7, 8, 10, 12].includes(month)) {
      return 31;
    }
    
    // Months with 30 days: Apr, Jun, Sep, Nov
    if ([4, 6, 9, 11].includes(month)) {
      return 30;
    }
    
    // February - check for leap year
    if (month === 2) {
      return this.isLeapYear(year) ? 29 : 28;
    }

    return 31; // Fallback
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Validate the selected date
   */
  private validateDate(): boolean {
    if (!this._selectedYear || !this._selectedMonth || !this._selectedDay) {
      return false;
    }

    const year = parseInt(this._selectedYear, 10);
    const month = parseInt(this._selectedMonth, 10);
    const day = parseInt(this._selectedDay, 10);

    // Check if date is valid
    const date = new Date(year, month - 1, day);
    
    // Verify the date components match (JavaScript Date auto-corrects invalid dates)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return false;
    }

    // Check if date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return false;
    }

    return true;
  }

  /**
   * Calculate age based on selected date of birth
   */
  calculateAge(): number | null {
    if (!this._selectedYear || !this._selectedMonth || !this._selectedDay) {
      return null;
    }

    const year = parseInt(this._selectedYear, 10);
    const month = parseInt(this._selectedMonth, 10);
    const day = parseInt(this._selectedDay, 10);

    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  /**
   * Get age display text
   */
  get ageDisplay(): string | null {
    const age = this.calculateAge();
    if (age === null) {
      return null;
    }
    
    const isArabic = this.currentLang === 'ar';
    
    if (age === 0) {
      return isArabic ? 'أقل من سنة' : 'Less than 1 year';
    } else if (age === 1) {
      return isArabic ? 'سنة واحدة' : '1 year old';
    } else if (age === 2) {
      return isArabic ? 'سنتان' : '2 years old';
    } else if (age <= 10) {
      return isArabic ? `${age} سنوات` : `${age} years old`;
    } else {
      return isArabic ? `${age} سنة` : `${age} years old`;
    }
  }

  isContinueDisabled() {
    return !this.selectedYear || !this.selectedMonth || !this.selectedDay || !this.validateDate();
  }

  continue() {
    if (this.isContinueDisabled()) {
      this.toastr.error(
        this.currentLang === 'ar' 
          ? 'الرجاء إدخال تاريخ ميلاد صحيح' 
          : 'Please enter a valid date of birth'
      );
      return;
    }

    // Validate date one more time
    if (!this.validateDate()) {
      this.toastr.error(
        this.currentLang === 'ar' 
          ? 'تاريخ الميلاد غير صحيح' 
          : 'Invalid date of birth'
      );
      return;
    }

    // Save date of birth to localStorage
    this.onboardingState.saveDateOfBirth(
      this.selectedYear,
      this.selectedMonth,
      this.selectedDay
    );
    console.log('Date of birth saved to localStorage');
    
    // Navigate to next step (e.g., student dashboard or additional setup)
    // For now, navigate to signup or dashboard based on your flow
    this.router.navigate(['/signup'], {
      queryParams: { 
        type: 'student',
        year: this.selectedYear,
        month: this.selectedMonth,
        day: this.selectedDay
      }
    });
  }

  goBack() {
    // Clear the date of birth but keep the role selection
    this.showDateOfBirth = false;
    this._selectedYear = '';
    this._selectedMonth = '';
    this._selectedDay = '';
    
    // Update state to go back to role selection
    this.onboardingState.updateState({ 
      step: 'select_role',
      dateOfBirth: undefined
    });
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
  }
}
