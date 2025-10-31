import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { AiBuilderService, CourseDraft } from '../../../core/services/ai-builder.service';
import { HttpClient } from '@angular/common/http';

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
export class StudentStarterComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly ai = inject(AiBuilderService);
  private readonly http = inject(HttpClient);

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
    if (this.localizedCountryName) return this.localizedCountryName;
    const c = (this.student as any)?.country_name;
    if (typeof c === 'string' && c.trim()) return c;
    return this.currentLang === 'ar' ? 'الدولة' : 'Country';
  }

  get stageName(): string {
    if (this.localizedStageName) return this.localizedStageName;
    const s = (this.student as any)?.education_stage_name ?? (this.student as any)?.stage_name;
    if (typeof s === 'string' && s.trim()) return s;
    return this.currentLang === 'ar' ? 'غير محددة' : 'Not set';
  }

  ngOnInit(): void {
    if (!this.universalAuth.validateAccess('Student')) return;
    this.student = this.universalAuth.getCurrentUser();
    
    // Load profile first, then fetch categories based on profile data
    this.loadProfileFromBackend();
    this.loadAllCategories();
  }

  private loadProfileFromBackend(): void {
    this.loading = true;
    this.http.get<any>('/api/v1/auth/me', { withCredentials: true })
      .subscribe({
        next: (res) => {
          if (res && res.user) {
            // Update student data from backend response
            this.student = {
              ...this.student,
              ...res.user
            };
            
            // Extract localized names
            this.localizedCountryName = res.user.localized_country_name || null;
            this.localizedStageName = res.user.localized_stage_name || null;
            
            this.profileLoaded = true;
            
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
    this.http.get<{categories: Category[]}>(`/api/v1/categories/suggestions/${stage_id}`)
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
    this.http.get<{categories: Category[]}>('/api/v1/categories')
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

