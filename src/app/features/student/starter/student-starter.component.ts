import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { AiBuilderService, CourseDraft } from '../../../core/services/ai-builder.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';

interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order?: number;
}

@Component({
  selector: 'app-student-starter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule],
  templateUrl: './student-starter.component.html',
  styleUrls: ['./student-starter.component.scss']
})
export class StudentStarterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly ai = inject(AiBuilderService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly baseUrl = environment.apiUrl;
  
  private languageChangeSubscription?: Subscription;

  // Step 1: Category Selection
  loading = false;
  smartSix: Category[] = [];
  allCategories: Category[] = [];
  selectedCategory: Category | null = null;
  selectedCategoryId: number | null = null;

  student: any = null;
  profileLoaded = false;
  
  // Localized labels pulled from backend
  localizedCountryName: string | null = null;
  localizedStageName: string | null = null;

  get currentLang(): 'ar' | 'en' { return this.i18n.current; }
  get isRTL(): boolean { return this.currentLang === 'ar'; }
  get canContinue(): boolean { return this.selectedCategory !== null; }

  get countryName(): string {
    // Always use localized name from backend (based on current Accept-Language header)
    if (this.localizedCountryName && this.localizedCountryName.trim()) {
      return this.localizedCountryName;
    }
    // Fallback to raw names based on current language
    const student = this.student as any;
    if (this.currentLang === 'ar' && student?.country_name_ar) {
      return student.country_name_ar;
    }
    if (student?.country_name_en) {
      return student.country_name_en;
    }
    if (student?.country_name) {
      return student.country_name;
    }
    return this.currentLang === 'ar' ? 'الدولة' : 'Country';
  }

  get stageName(): string {
    // Always use localized name from backend (based on current Accept-Language header)
    if (this.localizedStageName && this.localizedStageName.trim()) {
      return this.localizedStageName;
    }
    // Fallback to raw names based on current language
    const student = this.student as any;
    if (this.currentLang === 'ar' && student?.stage_name_ar) {
      return student.stage_name_ar;
    }
    if (student?.stage_name_en) {
      return student.stage_name_en;
    }
    if (student?.education_stage_name || student?.stage_name) {
      return student.education_stage_name || student.stage_name;
    }
    return this.currentLang === 'ar' ? 'غير محددة' : 'Not set';
  }

  ngOnInit(): void {
    if (!this.universalAuth.validateAccess('Student')) return;
    this.student = this.universalAuth.getCurrentUser();
    
    // Load profile first, then fetch categories based on profile data
    this.loadProfileFromBackend();
    this.loadAllCategories();
    
    // Subscribe to language changes from I18nService to reload profile
    // Skip the first emission (current value) and only react to actual changes
    this.languageChangeSubscription = this.i18n.lang$.pipe(skip(1)).subscribe(lang => {
      console.log('Language changed to:', lang, '- Reloading profile with localized country/stage names');
      // Use a delay to ensure Accept-Language header is updated via interceptor
      // The interceptor reads from storage, which should be updated by now
      setTimeout(() => {
        this.loadProfileFromBackend();
      }, 500); // Increased delay to ensure storage is updated
    });
    
    // Also listen for window events (for compatibility)
    if (typeof window !== 'undefined') {
      window.addEventListener('languageChanged', ((event: CustomEvent<{ lang: string }>) => {
        const { lang } = event.detail;
        console.log('Language changed via window event to:', lang, '- Reloading profile with localized country/stage names');
        setTimeout(() => {
          this.loadProfileFromBackend();
        }, 500); // Match the delay from the observable subscription
      }) as EventListener);
    }
  }

  ngOnDestroy(): void {
    if (this.languageChangeSubscription) {
      this.languageChangeSubscription.unsubscribe();
    }
  }

  private loadProfileFromBackend(): void {
    this.loading = true;
    // Use /profile/me endpoint which returns localized country and stage names
    // The Accept-Language header is automatically added by langInterceptor
    console.log('Loading profile with language:', this.currentLang);
    this.http.get<any>(`${this.baseUrl}/profile/me`)
      .subscribe({
        next: (res) => {
          if (res) {
            console.log('Profile loaded - localized_country_name:', res.localized_country_name, 'localized_stage_name:', res.localized_stage_name);
            
            // Update student data from backend response
            this.student = {
              ...this.student,
              ...res
            };
            
            // Extract localized names (these are based on current Accept-Language header)
            // Backend returns name_ar when Accept-Language is 'ar', name_en otherwise
            this.localizedCountryName = res.localized_country_name || null;
            this.localizedStageName = res.localized_stage_name || null;
            
            console.log('Updated localized names - country:', this.localizedCountryName, 'stage:', this.localizedStageName);
            
            this.profileLoaded = true;
            this.loading = false;
            
            // Force change detection to update the view with new localized names
            this.cdr.detectChanges();
            
            // Now that we have the profile, fetch categories based on stage_id
            this.loadSmartSix();
          }
        },
        error: (err) => {
          console.error('Failed to load profile:', err);
          this.loading = false;
          
          // Handle 401 errors gracefully - user may need to re-authenticate
          if (err.status === 401) {
            this.universalAuth.forceLogout('Session expired. Please login again.');
          } else {
            // Fallback to localStorage data if API fails
            this.profileLoaded = true;
            this.loadSmartSix();
          }
        }
      });
  }

  private loadSmartSix(): void {
    const stage_id = this.student?.education_stage_id ?? this.student?.stage_id;
    if (!stage_id) {
      console.warn('No stage_id found in user profile');
      this.loading = false;
      return;
    }

    this.loading = true;
    this.http.get<{categories: Category[]}>(`${this.baseUrl}/categories/suggestions/${stage_id}`)
      .subscribe({
        next: (res) => {
          this.smartSix = res.categories || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load Smart Six categories:', err);
          this.smartSix = [];
          this.loading = false;
        }
      });
  }

  private loadAllCategories(): void {
    this.http.get<{categories: Category[]}>(`${this.baseUrl}/categories`)
      .subscribe({
        next: (res) => {
          this.allCategories = res.categories || [];
        },
        error: (err) => {
          console.error('Failed to load all categories:', err);
          this.allCategories = [];
        }
      });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.selectedCategoryId = category.id;
  }

  onNgSelectChange(): void {
    if (this.selectedCategoryId) {
      this.selectedCategory = this.allCategories.find(cat => cat.id === this.selectedCategoryId) || null;
    } else {
      this.selectedCategory = null;
    }
  }

  skipToTopMatch(): void {
    if (this.smartSix.length > 0) {
      this.selectedCategory = this.smartSix[0];
      this.selectedCategoryId = this.smartSix[0].id;
      this.continue();
    }
  }

  continue(): void {
    if (!this.canContinue || !this.selectedCategory) return;

    // Step 1 Complete: Save category to draft
    const draft: Partial<CourseDraft> = {
      version: 1,
      stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
      country_id: this.student?.country_id,
      locale: this.currentLang,
      category_id: this.selectedCategory.id,
      category_name: this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en,
      last_saved_at: new Date().toISOString()
    };

    this.ai.saveDraft(draft);
    
    // Move to Step 2: Course Basics (Name, Subject, Unit Map)
    this.router.navigateByUrl('/student/wizard/basics');
  }

  getCategoryName(cat: Category): string {
    return this.currentLang === 'ar' ? cat.name_ar : cat.name_en;
  }
}

