import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { AuthService, User } from '../../../core/services/auth.service';
import { GeographyService, Country, State } from '../../../core/services/geography.service';
import { EducationService, EducationStage } from '../../../core/services/education.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FooterComponent],
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.scss']
})
export class StudentProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly geographyService = inject(GeographyService);
  private readonly educationService = inject(EducationService);
  private readonly i18n = inject(I18nService);
  private readonly toastr = inject(ToastrService);
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  profileForm!: FormGroup;
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
  birthDate: Date | null = null;
  
  // Gender options
  genderOptions = [
    { value: 'Male', labelEn: 'Male', labelAr: 'ذكر' },
    { value: 'Female', labelEn: 'Female', labelAr: 'أنثى' },
    { value: 'Other', labelEn: 'Other', labelAr: 'آخر' },
    { value: 'Prefer not to say', labelEn: 'Prefer not to say', labelAr: 'أفضل عدم الإجابة' }
  ];
  
  // Language options
  languageOptions = [
    { value: 'ar', labelEn: 'Arabic', labelAr: 'العربية' },
    { value: 'en', labelEn: 'English', labelAr: 'الإنجليزية' }
  ];

  ngOnInit(): void {
    // Universal authentication and role validation
    if (!this.authService.validateAuthAndRole('Student')) {
      return; // Validation failed, user will be redirected automatically
    }

    this.user = this.authService.getCurrentUser();
    
    // Initialize form
    this.initializeForm();
    
    // Load data
    this.loadCountries();
    this.loadEducationStages();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      name: [this.user?.name || '', [Validators.required, Validators.maxLength(255)]],
      date_of_birth: [this.user?.dob || '', Validators.required],
      country_id: [this.user?.country_id || '', Validators.required],
      state_id: [this.user?.state_id || ''],
      education_stage_id: [this.user?.education_stage_id || '', Validators.required],
      gender: [this.user?.gender || ''],
      locale: [this.user?.locale || this.i18n.current, Validators.required],
      profile_photo_url: [this.user?.profile_photo_url || '', this.urlValidator]
    });
    
    // Watch country changes to load states
    this.profileForm.get('country_id')?.valueChanges.subscribe(countryId => {
      this.onCountryChange(countryId);
    });

    // Watch date changes to calculate age and load appropriate education stages
    this.profileForm.get('date_of_birth')?.valueChanges.subscribe(dateValue => {
      this.onDateChange(dateValue);
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
      this.profileForm.get('state_id')?.clearValidators();
      this.profileForm.get('state_id')?.setValue('');
      return;
    }
    
    this.loadStates(parseInt(countryId));
  }

  private loadStates(countryId: number): void {
    this.loadingStates = true;
    this.geographyService.getStatesByCountry(countryId).subscribe({
      next: (response) => {
        this.states = response.states;
        this.loadingStates = false;
        
        if (this.states.length > 0) {
          this.profileForm.get('state_id')?.setValidators([Validators.required]);
        } else {
          this.profileForm.get('state_id')?.clearValidators();
          this.profileForm.get('state_id')?.setValue('');
        }
        this.profileForm.get('state_id')?.updateValueAndValidity();
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.toastr.error('Failed to load states');
        this.loadingStates = false;
        this.states = [];
        this.profileForm.get('state_id')?.clearValidators();
        this.profileForm.get('state_id')?.setValue('');
        this.profileForm.get('state_id')?.updateValueAndValidity();
      }
    });
  }

  private onDateChange(dateValue: string): void {
    if (!dateValue) {
      this.studentAge = null;
      this.educationStages = [];
      return;
    }

    this.birthDate = new Date(dateValue);
    this.studentAge = this.educationService.calculateSchoolAge(this.birthDate);
    this.loadEducationStages();
  }

  get currentLang(): 'ar' | 'en' {
    return this.i18n.current;
  }

  get selectedCountry(): Country | undefined {
    const countryId = this.profileForm.get('country_id')?.value;
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
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastr.error(
        this.currentLang === 'ar'
          ? 'الرجاء ملء جميع الحقول المطلوبة'
          : 'Please fill all required fields'
      );
      return;
    }
    
    this.loading = true;
    
    // Prepare submission data
    const formValue = this.profileForm.value;
    const submissionData = {
      name: formValue.name.trim(),
      date_of_birth: formValue.date_of_birth,
      country_id: parseInt(formValue.country_id),
      state_id: formValue.state_id ? parseInt(formValue.state_id) : null,
      education_stage_id: parseInt(formValue.education_stage_id),
      gender: formValue.gender || null,
      locale: formValue.locale,
      profile_photo_url: formValue.profile_photo_url?.trim() || null
    };
    
    console.log('Updating student profile:', submissionData);
    
    // Call backend to update profile
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Accept-Language': this.currentLang
    });

    this.http.put(`${environment.apiUrl}/auth/students/profile`, submissionData, { headers }).subscribe({
      next: (response: any) => {
        console.log('Profile update successful:', response);
        
        // Update local user data
        this.authService.storeAuthData(
          response.user,
          this.authService.getToken()!,
          this.authService.getRefreshToken()!
        );
        
        // Show success message
        this.toastr.success(
          this.currentLang === 'ar'
            ? 'تم تحديث الملف الشخصي بنجاح!'
            : 'Profile updated successfully!'
        );
        
        this.loading = false;
        
        // Navigate to student dashboard
        this.router.navigateByUrl('/student/dashboard');
      },
      error: (error) => {
        console.error('Profile update error:', error);
        this.loading = false;
        
        // Handle specific errors
        if (error.error?.message) {
          this.toastr.error(error.error.message);
        } else if (error.error?.errors) {
          const errors = error.error.errors;
          Object.keys(errors).forEach(key => {
            this.toastr.error(errors[key][0]);
          });
        } else {
          this.toastr.error(
            this.currentLang === 'ar'
              ? 'حدث خطأ أثناء تحديث الملف الشخصي'
              : 'An error occurred while updating profile'
          );
        }
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('/student/dashboard');
  }
}
