import { Component, inject, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService, User } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { GeographyService } from '../../core/services/geography.service';
import { EducationService } from '../../core/services/education.service';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FooterComponent } from '../../shared/footer/footer.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';
import { getUserInitials } from '../../shared/utils/user-initials.util';
import { getProfilePhotoUrl } from '../../core/utils/profile-photo.util';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-account-type-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, FooterComponent, NgSelectModule],
  templateUrl: './account-type-page.component.html',
  styleUrls: ['./account-type-page.component.scss']
})
export class AccountTypePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly geographyService = inject(GeographyService);
  private readonly educationService = inject(EducationService);
  private readonly toastr = inject(ToastrService);
  private readonly el = inject(ElementRef);
  
  private userSubscription?: Subscription;

  showDateOfBirth = false;
  showStudentForm = false;
  showTeacherDashboard = false;
  
  private _selectedYear = '';
  private _selectedMonth = '';
  private _selectedDay = '';
  
  // Cached arrays for dropdowns
  years: string[] = [];
  months: Array<{ value: string; label: string }> = [];
  days: string[] = [];
  
  get selectedYear() { return this._selectedYear; }
  set selectedYear(value: string) {
    this._selectedYear = value;
    this.updateDaysArray(); // Update days when year changes
    this.validateAndAdjustDay();
    this.saveDateOfBirthProgress();
  }
  
  get selectedMonth() { return this._selectedMonth; }
  set selectedMonth(value: string) {
    this._selectedMonth = value;
    this.updateDaysArray(); // Update days when month changes
    this.validateAndAdjustDay();
    this.saveDateOfBirthProgress();
  }
  
  get selectedDay() { return this._selectedDay; }
  set selectedDay(value: string) {
    this._selectedDay = value;
    this.saveDateOfBirthProgress();
  }
  
  showInfo = false;

  // Student form data
  studentForm = {
    fullName: '',
    countryId: null as number | null,
    stateId: null as number | null,
    educationStageId: null as number | null,
    gender: '',
    locale: 'ar'
  };

  // Form validation errors
  studentFormErrors: any = {};

  // Data arrays
  countries: any[] = [];
  states: any[] = [];
  educationStages: any[] = [];
  isSubmitting = false;

  // Loading states
  loadingCountries = false;
  loadingStates = false;
  loadingEducationStages = false;

  // Header: current user info
  user: User | null = null;

  ngOnInit() {
    // Initialize dropdown arrays
    this.initializeDropdowns();
    
    // Subscribe to user changes for reactive updates
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('Account type page - user updated:', user);
      this.user = user;
      // Angular's automatic change detection will handle the update
    });
    
    // Test IP detection
    console.log('🔍 Testing IP detection on component init...');
    this.testIPDetection();

    // Restore onboarding state from localStorage
    this.restoreOnboardingState();
  }
  
  /**
   * Initialize dropdown arrays (called once)
   */
  private initializeDropdowns(): void {
    // Initialize years
    const currentYear = new Date().getFullYear();
    this.years = [];
    for (let i = currentYear - 3; i >= currentYear - 100; i--) {
      this.years.push(i.toString());
    }
    
    // Initialize months
    this.updateMonthsArray();
    
    // Initialize days
    this.updateDaysArray();
  }
  
  /**
   * Update months array (can change with language)
   */
  private updateMonthsArray(): void {
    const isArabic = this.currentLang === 'ar';
    this.months = [
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
  
  /**
   * Update days array based on selected month and year
   */
  private updateDaysArray(): void {
    const maxDays = this.getMaxDaysInMonth();
    this.days = [];
    for (let i = 1; i <= maxDays; i++) {
      this.days.push(i.toString().padStart(2, '0'));
    }
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
    const photoUrl = this.user?.profile_photo_url || this.user?.profile_photo;
    return getProfilePhotoUrl(photoUrl) || 'assets/default-avatar.png';
  }
  get hasAvatar(): boolean {
    return !!(this.user?.profile_photo_url || this.user?.profile_photo);
  }
  get userInitials(): string {
    return getUserInitials(this.userName);
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
    // Update month labels when language changes
    this.updateMonthsArray();
    
    // Reload data from backend if student form is visible
    if (this.showStudentForm) {
      this.reloadStudentFormData();
    }
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

    // If onboarding is complete, don't restore anything here
    if (state.step === 'complete') {
      return;
    }

    // If user selected Student role but hasn't completed DOB, show DOB form
    if (state.step === 'enter_dob' && state.selectedRole === 'Student') {
      this.showDateOfBirth = true;
      
      // Restore DOB fields if they were partially filled (without triggering save)
      if (state.dateOfBirth) {
        console.log('Restoring partially filled DOB:', state.dateOfBirth);
        this._selectedYear = state.dateOfBirth.year || '';
        this._selectedMonth = state.dateOfBirth.month || '';
        this._selectedDay = state.dateOfBirth.day || '';
      }
    }

    // If user has entered DOB and needs to fill out student registration form
    if (state.step === 'student_registration' && state.selectedRole === 'Student' && state.dateOfBirth) {
      console.log('Restoring student registration form with DOB:', state.dateOfBirth);
      
      // Restore DOB
      this._selectedYear = state.dateOfBirth.year;
      this._selectedMonth = state.dateOfBirth.month;
      this._selectedDay = state.dateOfBirth.day;
      
      // Show student registration form
      this.showDateOfBirth = false;
      this.showStudentForm = true;
      
      // Load form data
      this.loadStudentFormData();
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
      const dobData = {
        year: this._selectedYear,
        month: this._selectedMonth,
        day: this._selectedDay
      };
      console.log('Saving DOB progress to localStorage:', dobData);
      this.onboardingState.updateState({
        dateOfBirth: dobData
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
      // Angular's automatic change detection will update the view
    } else if (type === 'Teacher') {
      console.log('Updating role to Teacher');
      this.authService.updateRole('Teacher').subscribe({
        next: (response) => {
          console.log('Teacher role updated successfully');
          
          // Update the stored user data with the response
          if (response.user) {
            this.authService.updateCurrentUser(response.user);
          }
          
          // Navigate to teacher dashboard
          this.router.navigateByUrl('/teacher');
        },
        error: (error) => {
          console.error('Role update error:', error);
          this.toastr.error('Failed to update role. Please try again.');
        }
      });
    }
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
    
    // Show student registration form
    this.showStudentForm = true;
    this.loadStudentFormData();
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

  /**
   * Test IP detection service
   */
  testIPDetection() {
    console.log('=== MANUAL IP DETECTION TEST ===');
    this.geographyService.detectCountryByIP().subscribe({
      next: (countryCode) => {
        console.log('✅ IP Detection Result:', countryCode);
        if (countryCode) {
          console.log(`✅ Success! Detected country code: ${countryCode}`);
        } else {
          console.log('⚠️ IP detection returned null - service may be blocked or unavailable');
        }
      },
      error: (error) => {
        console.error('❌ IP Detection Error:', error);
      }
    });
  }

  goBackToDateOfBirth() {
    this.showStudentForm = false;
    this.showDateOfBirth = true;
  }

  /**
   * Reload student form data when language changes
   */
  private reloadStudentFormData() {
    console.log('Reloading student form data for language:', this.currentLang);
    
    // Save current selections
    const currentCountryId = this.studentForm.countryId;
    const currentStateId = this.studentForm.stateId;
    const currentEducationStageId = this.studentForm.educationStageId;
    
    // Reload countries
    this.loadingCountries = true;
    this.geographyService.getCountries().subscribe({
      next: (response) => {
        console.log('Countries reloaded:', response.countries.length, 'countries');
        this.countries = response.countries;
        this.loadingCountries = false;
        
        // Restore country selection if it was set
        if (currentCountryId) {
          this.studentForm.countryId = currentCountryId;
          
          // Reload states if country was selected
          this.loadingStates = true;
          this.geographyService.getStatesByCountry(currentCountryId).subscribe({
            next: (statesResponse) => {
              console.log('States reloaded:', statesResponse.states.length, 'states');
              this.states = statesResponse.states;
              this.loadingStates = false;
              
              // Restore state selection if it was set
              if (currentStateId) {
                this.studentForm.stateId = currentStateId;
              }
            },
            error: (error) => {
              console.error('Error reloading states:', error);
              this.loadingStates = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error reloading countries:', error);
        this.loadingCountries = false;
      }
    });
    
    // Reload education stages
    const age = this.calculateAge();
    if (age !== null) {
      this.loadingEducationStages = true;
      this.educationService.getStagesByAge(age, 'student').subscribe({
        next: (response) => {
          console.log('Education stages reloaded:', response.stages.length, 'stages');
          this.educationStages = response.stages;
          this.loadingEducationStages = false;
          
          // Restore education stage selection if it was set
          if (currentEducationStageId) {
            this.studentForm.educationStageId = currentEducationStageId;
          }
        },
        error: (error) => {
          console.error('Error reloading education stages:', error);
          this.loadingEducationStages = false;
        }
      });
    }
  }

  /**
   * Load data for student registration form
   */
  async loadStudentFormData() {
    try {
      // Start IP detection early (parallel with countries loading)
      console.log('Starting IP detection...');
      const ipDetectionPromise = this.geographyService.detectCountryByIP().toPromise();
      
      // Load countries
      this.loadingCountries = true;
      console.log('Loading countries...');
      this.geographyService.getCountries().subscribe({
        next: async (response) => {
          console.log('Countries loaded:', response.countries.length, 'countries');
          this.countries = response.countries;
          this.loadingCountries = false;
          
          // Wait for IP detection and auto-select country
          try {
            console.log('Waiting for IP detection result...');
            const countryCode = await ipDetectionPromise;
            console.log('IP detection returned country code:', countryCode);
            
            if (countryCode && this.countries.length > 0) {
              console.log('Looking up country ID for code:', countryCode);
              console.log('Available country codes:', this.countries.map(c => c.iso_code).join(', '));
              
              const countryId = this.geographyService.getCountryIdByCode(countryCode, this.countries);
              console.log('Found country ID:', countryId);
              
              if (countryId) {
                console.log(`Auto-detected country: ${countryCode}, setting to ID: ${countryId}`);
                // ng-select bindValue="id" expects number type, not string
                this.studentForm.countryId = countryId;
                console.log('Country form value set to:', this.studentForm.countryId);
                // Trigger change detection manually to ensure ng-select updates
                setTimeout(() => {
                  // Automatically load states for detected country
                  this.onCountryChange();
                }, 100);
              } else {
                console.log(`Country code ${countryCode} not found in database`);
              }
            } else {
              console.log('Could not auto-select: countryCode =', countryCode, ', countries.length =', this.countries.length);
            }
          } catch (error) {
            console.error('Error in IP detection:', error);
            console.log('Could not auto-detect country, user will select manually');
          }
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          this.toastr.error('Failed to load countries');
          this.loadingCountries = false;
        }
      });

      // Load education stages based on age
      const age = this.calculateAge();
      if (age !== null) {
        this.loadingEducationStages = true;
        this.educationService.getStagesByAge(age, 'student').subscribe({
          next: (response) => {
            console.log('Education stages loaded:', response.stages);
            this.educationStages = response.stages;
            this.loadingEducationStages = false;
          },
          error: (error) => {
            console.error('Error loading education stages:', error);
            this.toastr.error('Failed to load education stages');
            this.loadingEducationStages = false;
          }
        });
      } else {
        console.warn('Cannot load education stages: age is null');
        this.educationStages = [];
      }

      // Pre-fill form with user data
      if (this.user) {
        this.studentForm.fullName = this.user.name || '';
        this.studentForm.locale = this.user.locale || 'ar';
      }
    } catch (error) {
      console.error('Error loading student form data:', error);
    }
  }

  /**
   * Handle country selection change
   */
  onCountryChange() {
    // Clear state selection and states list
    this.studentForm.stateId = null;
    this.states = [];
    
    if (this.studentForm.countryId) {
      console.log('Loading states for country:', this.studentForm.countryId);
      this.loadingStates = true;
      this.geographyService.getStatesByCountry(this.studentForm.countryId).subscribe({
        next: (response) => {
          console.log('States loaded:', response.states);
          this.states = response.states;
          this.loadingStates = false;
        },
        error: (error) => {
          console.error('Error loading states:', error);
          this.toastr.error('Failed to load states');
          this.loadingStates = false;
        }
      });
    } else {
      // No country selected, ensure states are empty and not loading
      this.states = [];
      this.loadingStates = false;
    }
  }

  /**
   * Submit student registration form
   */
  async submitStudentForm() {
    // Clear previous errors
    this.studentFormErrors = {};

    // Validate form
    if (!this.validateStudentForm()) {
      return;
    }

    this.isSubmitting = true;

    try {
      // Prepare submission data
      const submissionData = {
        name: this.studentForm.fullName,
        date_of_birth: `${this._selectedYear}-${this._selectedMonth}-${this._selectedDay}`,
        country_id: this.studentForm.countryId!,
        state_id: this.studentForm.stateId,
        education_stage_id: this.studentForm.educationStageId!,
        gender: this.studentForm.gender,
        locale: this.studentForm.locale,
        profile_photo_url: null, // No profile photo at this stage
        role: 'Student'
      };

      // Submit to backend
      this.authService.completeStudentRegistration(submissionData).subscribe({
        next: (response) => {
          this.toastr.success('Registration completed successfully!');
          
          // Update the stored user data with the response
          if (response.user) {
            this.authService.updateCurrentUser(response.user);
          }
          
          // Clear onboarding state
          this.onboardingState.clearState();
          
          // Navigate to student dashboard
          this.router.navigateByUrl('/student/dashboard');
        },
        error: (error) => {
          console.error('Registration error:', error);
          this.toastr.error('Registration failed. Please try again.');
          this.isSubmitting = false; // Re-enable the button on error
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      this.toastr.error('Registration failed. Please try again.');
      this.isSubmitting = false;
    }
  }

  /**
   * Validate student registration form
   */
  private validateStudentForm(): boolean {
    let isValid = true;

    // Validate full name
    if (!this.studentForm.fullName || this.studentForm.fullName.trim().length === 0) {
      this.studentFormErrors.fullName = 'Full name is required';
      isValid = false;
    } else if (this.studentForm.fullName.length > 255) {
      this.studentFormErrors.fullName = 'Full name must be 255 characters or less';
      isValid = false;
    }

    // Validate gender (mandatory)
    if (!this.studentForm.gender) {
      this.studentFormErrors.gender = 'Gender is required';
      isValid = false;
    }

    // Validate country
    if (!this.studentForm.countryId) {
      this.studentFormErrors.country = 'Country is required';
      isValid = false;
    }

    // Validate state (if country has states)
    if (this.studentForm.countryId && this.states.length > 0 && !this.studentForm.stateId) {
      this.studentFormErrors.state = 'State is required';
      isValid = false;
    }

    // Validate education stage
    if (!this.studentForm.educationStageId) {
      this.studentFormErrors.educationStage = 'Education stage is required';
      isValid = false;
    }

    return isValid;
  }

}
