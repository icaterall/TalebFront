import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order?: number;
}

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './category-selector.component.html',
  styleUrls: ['./category-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategorySelectorComponent {
  @Input() smartSix: Category[] = [];
  @Input() allCategories: Category[] = [];
  @Input() loading = false;
  @Input() currentLang: string = 'en';
  @Input() isRTL = false;

  @Input()
  set selectedCategoryId(value: number | null) {
    this.selectedCategoryIdInternal = value ?? null;
  }
  get selectedCategoryId(): number | null {
    return this.selectedCategoryIdInternal;
  }

  @Output() readonly selectedCategoryIdChange = new EventEmitter<number | null>();
  @Output() readonly categorySelected = new EventEmitter<Category>();

  readonly trackByCategoryId = (_: number, category: Category) => category.id;

  selectedCategoryIdInternal: number | null = null;

  get labelKey(): 'name_ar' | 'name_en' {
    return this.isArabic ? 'name_ar' : 'name_en';
  }

  get isArabic(): boolean {
    return this.currentLang?.toLowerCase().startsWith('ar') ?? false;
  }

  get dropdownPlaceholder(): string {
    if (this.loading) {
      return this.isArabic ? 'جاري التحميل...' : 'Loading...';
    }
    return this.isArabic ? 'اختر تصنيفاً' : 'Select a category';
  }

  get quickPickLabel(): string {
    return this.isArabic ? 'تصنيفات مقترحة' : 'Suggested categories';
  }

  get dropdownLabel(): string {
    return this.isArabic ? 'كل التصنيفات' : 'All categories';
  }

  handleSelectedIdChange(categoryId: number | null): void {
    this.selectedCategoryIdInternal = categoryId ?? null;
    this.selectedCategoryIdChange.emit(this.selectedCategoryIdInternal);

    if (categoryId == null) {
      return;
    }

    const category = this.allCategories.find(cat => cat.id === categoryId);
    if (category) {
      this.categorySelected.emit(category);
    }
  }

  handleQuickPick(category: Category): void {
    if (!category) {
      return;
    }

    this.selectedCategoryIdInternal = category.id;
    this.selectedCategoryIdChange.emit(category.id);
    this.categorySelected.emit(category);
  }

  getCategoryName(category: Category | null | undefined): string {
    if (!category) {
      return '';
    }

    if (this.isArabic) {
      return category.name_ar || category.name_en || '';
    }

    return category.name_en || category.name_ar || '';
  }
}
