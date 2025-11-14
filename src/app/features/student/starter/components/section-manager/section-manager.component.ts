import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Section } from '../../../../../core/services/ai-builder.service';

@Component({
  selector: 'app-section-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './section-manager.component.html',
  styleUrls: ['./section-manager.component.scss']
})
export class SectionManagerComponent {
  @Input() sections: (Section & { available?: boolean })[] = [];
  @Input() activeSectionId: string | null = null;
  @Input() editingSectionId: string | null = null;
  @Input() editingSectionValue: string = '';
  @Input() currentLang: 'ar' | 'en' = 'en';
  @Input() isRTL: boolean = false;
  
  @Output() sectionSelected = new EventEmitter<string>();
  @Output() sectionEdit = new EventEmitter<{ id: string; value: string }>();
  @Output() sectionEditSave = new EventEmitter<string>();
  @Output() sectionEditCancel = new EventEmitter<void>();
  @Output() sectionMenuOpen = new EventEmitter<string>();
  @Output() sectionDelete = new EventEmitter<Section>();
  @Output() sectionToggleAvailability = new EventEmitter<string>();
  @Output() addNewSection = new EventEmitter<void>();

  selectSection(sectionId: string): void {
    this.sectionSelected.emit(sectionId);
  }

  startEditingSection(section: Section): void {
    this.sectionEdit.emit({ id: section.id, value: section.name });
  }

  saveSection(sectionId: string): void {
    this.sectionEditSave.emit(sectionId);
  }

  cancelEditingSection(): void {
    this.sectionEditCancel.emit();
  }

  openSectionMenu(sectionId: string): void {
    this.sectionMenuOpen.emit(sectionId);
  }

  deleteSection(section: Section): void {
    this.sectionDelete.emit(section);
  }

  toggleSectionAvailability(sectionId: string): void {
    this.sectionToggleAvailability.emit(sectionId);
  }

  onAddNewSection(): void {
    this.addNewSection.emit();
  }

  getSectionNumber(index: number): string {
    return (index + 1).toString();
  }

  get addSectionText(): string {
    return this.currentLang === 'ar' ? 'إضافة قسم' : 'Add Section';
  }

  get editText(): string {
    return this.currentLang === 'ar' ? 'تعديل' : 'Edit';
  }

  get deleteText(): string {
    return this.currentLang === 'ar' ? 'حذف' : 'Delete';
  }

  get availableText(): string {
    return this.currentLang === 'ar' ? 'متاح' : 'Available';
  }

  get unavailableText(): string {
    return this.currentLang === 'ar' ? 'غير متاح' : 'Unavailable';
  }
}
