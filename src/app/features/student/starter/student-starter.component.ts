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

  loading = false;
  smartSix: Category[] = [];
  allCategories: Category[] = [];
  selectedCategory: Category | null = null;
  selectedCategoryId: number | null = null;

  student: any = null;
  
  get currentLang(): 'ar' | 'en' { return this.i18n.current; }
  get isRTL(): boolean { return this.currentLang === 'ar'; }
  get canContinue(): boolean { return this.selectedCategory !== null; }

  ngOnInit(): void {
    if (!this.universalAuth.validateAccess('Student')) return;
    this.student = this.universalAuth.getCurrentUser();
    this.loadSmartSix();
    this.loadAllCategories();
  }

  private loadSmartSix(): void {
    const stage_id = this.student?.education_stage_id ?? this.student?.stage_id;
    if (!stage_id) return;

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

  isSelected(category: Category): boolean {
    return this.selectedCategory?.id === category.id;
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
    this.router.navigateByUrl('/student/wizard/name');
  }

  getCategoryName(cat: Category): string {
    return this.currentLang === 'ar' ? cat.name_ar : cat.name_en;
  }
}

