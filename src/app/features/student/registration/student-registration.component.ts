import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { AuthService, User } from '../../../core/services/auth.service';
import { OnboardingStateService } from '../../../core/services/onboarding-state.service';
import { GeographyService, Country, State } from '../../../core/services/geography.service';
import { EducationService, EducationStage } from '../../../core/services/education.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FooterComponent } from '../../../shared/footer/footer.component';

@Component({
  selector: 'app-student-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FooterComponent],
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.scss']
})
export class StudentRegistrationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly geographyService = inject(GeographyService);
  private readonly educationService = inject(EducationService);
  private readonly i18n = inject(I18nService);
  private readonly toastr = inject(ToastrService);

  registrationForm!: FormGroup;
  user: User | null = null;
  
  // Data for dropdowns
  countries: Country[] = [];
  states: State[] = [];
  educationStages: EducationStage[] = [];
  
  // Loading states
  loading = false;
  loadingCountries = false;
  loadingStates = false;
  loadingStages = false;
  
  // Computed values
  studentAge: number | null = null;
  schoolYear: string = '';
  birthDate: Date | null = null;
  
  // Gender options
  genderOptions = [
    { value: 'Male', labelEn: 'Male', labelAr: 'ذكر' },
    { value: 'Female', labelEn: 'Female', labelAr: 'أنثى' },
    { value: 'Other', labelEn: 'Other', labelAr: 'آخر' },
    { value: 'PreferNotToSay', labelEn: 'Prefer not to say', labelAr: 'أفضل عدم الإجابة' }
  ];
  
  // Language options
  languageOptions = [
    { value: 'ar', labelEn: 'Arabic', labelAr: 'العربية' },
    { value: 'en', labelEn: 'English', labelAr: 'الإنجليزية' }
  ];

  ngOnInit(): void {
    // Universal authentication validation (no role required for registration)
    if (!this.authService.validateAuthAndRole()) {
      return; // Validation failed, user will be redirected automatically
    }

    this.user = this.authService.getCurrentUser();
    
    // Get birth date from onboarding state
    const onboardingData = this.onboardingState.getState();
    
    if (!onboardingData?.dateOfBirth || !onboardingData.dateOfBirth.year) {
      this.toastr.error('Please select your date of birth first');
      this.router.navigateByUrl('/account-type');
      return;
    }
    
    // Parse birth date
    const { year, month, day } = onboardingData.dateOfBirth;
    this.birthDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    
    // Calculate school age
    this.studentAge = this.educationService.calculateSchoolAge(this.birthDate);
    this.schoolYear = this.educationService.getCurrentSchoolYear();
    
    console.log('Student age for school year', this.schoolYear, ':', this.studentAge);
    
    // Initialize form
    this.initializeForm();
    
    // Load data
    this.loadCountries();
    this.loadEducationStages();
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      country_id: ['', Validators.required],
      state_id: [''],
      education_stage_id: ['', Validators.required],
      gender: [''],
      locale: [this.i18n.current || 'ar', Validators.required],
      profile_photo_url: ['', this.urlValidator]
    });
    
    // Watch country changes to load states
    this.registrationForm.get('country_id')?.valueChanges.subscribe(countryId => {
      this.onCountryChange(countryId);
    });
  }

  private urlValidator(control: any) {
    if (!control.value) return null;
    
    try {
      new URL(control.value);
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  private loadCountries(): void {
    this.loadingCountries = true;
    this.geographyService.getCountries().subscribe({
      next: (response) => {
        this.countries = response.countries;
        this.loadingCountries = false;
        
        // Auto-detect country (placeholder - would use IP geolocation)
        // For now, we could pre-select based on user's previous data or leave empty
      },
      error: (error) => {
        console.error('Error loading countries:', error);
        this.toastr.error('Failed to load countries');
        this.loadingCountries = false;
      }
    });
  }

  private loadEducationStages(): void {
    if (this.studentAge === null) return;
    
    this.loadingStages = true;
    this.educationService.getStagesByAge(this.studentAge, 'student').subscribe({
      next: (response) => {
        this.educationStages = response.stages.sort((a, b) => a.sort_order - b.sort_order);
        this.loadingStages = false;
        
        // If only one stage, auto-select but still show for confirmation
        if (this.educationStages.length === 1) {
          this.registrationForm.patchValue({
            education_stage_id: this.educationStages[0].id
          });
        }
        
        if (this.educationStages.length === 0) {
          this.toastr.warning(
            this.currentLang === 'ar'
              ? 'لا توجد مراحل تعليمية متاحة لعمرك'
              : 'No education stages available for your age'
          );
        }
      },
      error: (error) => {
        console.error('Error loading education stages:', error);
        this.toastr.error('Failed to load education stages');
        this.loadingStages = false;
      }
    });
  }

  private onCountryChange(countryId: string): void {
    if (!countryId) {
      this.states = [];
      this.registrationForm.get('state_id')?.clearValidators();
      this.registrationForm.get('state_id')?.setValue('');
      return;
    }
    
    // Load states for the selected country
    // Backend will return empty array if country has no states
    this.loadStates(parseInt(countryId));
  }

  private loadStates(countryId: number): void {
    this.loadingStates = true;
    this.geographyService.getStatesByCountry(countryId).subscribe({
      next: (response) => {
        this.states = response.states;
        this.loadingStates = false;
        
        // Set validation based on whether country has states
        if (this.states.length > 0) {
          this.registrationForm.get('state_id')?.setValidators([Validators.required]);
        } else {
          this.registrationForm.get('state_id')?.clearValidators();
          this.registrationForm.get('state_id')?.setValue('');
        }
        this.registrationForm.get('state_id')?.updateValueAndValidity();
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.toastr.error('Failed to load states');
        this.loadingStates = false;
        this.states = [];
        this.registrationForm.get('state_id')?.clearValidators();
        this.registrationForm.get('state_id')?.setValue('');
        this.registrationForm.get('state_id')?.updateValueAndValidity();
      }
    });
  }

  get currentLang(): 'ar' | 'en' {
    return this.i18n.current;
  }

  get selectedCountry(): Country | undefined {
    const countryId = this.registrationForm.get('country_id')?.value;
    return this.countries.find(c => c.id.toString() === countryId);
  }

  get showStates(): boolean {
    return this.states.length > 0;
  }

  getGenderLabel(option: any): string {
    return this.currentLang === 'ar' ? option.labelAr : option.labelEn;
  }

  getLanguageLabel(option: any): string {
    return this.currentLang === 'ar' ? option.labelAr : option.labelEn;
  }

  getStageDisplayName(stage: EducationStage): string {
    return stage.name;
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.toastr.error(
        this.currentLang === 'ar'
          ? 'الرجاء ملء جميع الحقول المطلوبة'
          : 'Please fill all required fields'
      );
      return;
    }
    
    if (!this.birthDate) {
      this.toastr.error('Birth date is missing');
      return;
    }
    
    this.loading = true;
    
    // Prepare submission data
    const formValue = this.registrationForm.value;
    const submissionData = {
      name: formValue.name.trim(),
      date_of_birth: this.birthDate.toISOString().split('T')[0], // YYYY-MM-DD format
      country_id: parseInt(formValue.country_id),
      state_id: formValue.state_id ? parseInt(formValue.state_id) : null,
      education_stage_id: parseInt(formValue.education_stage_id),
      gender: formValue.gender || null,
      locale: formValue.locale,
      profile_photo_url: formValue.profile_photo_url?.trim() || null,
      role: 'Student'
    };
    
    console.log('Submitting student registration:', submissionData);
    
    // Call backend to complete registration
    this.authService.completeStudentRegistration(submissionData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        
        // Update local user
        this.authService.storeAuthData(
          response.user,
          this.authService.getToken()!,
          this.authService.getRefreshToken()!
        );
        
        // Clear onboarding state
        this.onboardingState.clearState();
        
        // Show success message
        this.toastr.success(
          this.currentLang === 'ar'
            ? 'تم إكمال التسجيل بنجاح!'
            : 'Registration completed successfully!'
        );
        
        this.loading = false;
        
        // Navigate to student dashboard
        this.router.navigateByUrl('/student/dashboard');
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.loading = false;
        
        // Handle specific errors
        if (error.error?.message) {
          this.toastr.error(error.error.message);
        } else if (error.error?.errors) {
          // Validation errors from backend
          const errors = error.error.errors;
          Object.keys(errors).forEach(key => {
            this.toastr.error(errors[key][0]);
          });
        } else {
          this.toastr.error(
            this.currentLang === 'ar'
              ? 'حدث خطأ أثناء التسجيل'
              : 'An error occurred during registration'
          );
        }
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('/account-type');
  }
}

