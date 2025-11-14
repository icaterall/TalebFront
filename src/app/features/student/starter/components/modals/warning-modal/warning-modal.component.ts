import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { WarningModalType } from '../../../types/wizard.types';

@Component({
  selector: 'app-warning-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './warning-modal.component.html',
  styleUrls: ['./warning-modal.component.scss']
})
export class WarningModalComponent {
  @Input() show: boolean = false;
  @Input() modalType: WarningModalType = null;
  @Input() currentLang: 'ar' | 'en' = 'en';
  @Input() isRTL: boolean = false;
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get title(): string {
    if (this.modalType === 'goBack') {
      return this.currentLang === 'ar' 
        ? 'هل أنت متأكد من العودة؟' 
        : 'Are you sure you want to go back?';
    }
    if (this.modalType === 'deleteContent') {
      return this.currentLang === 'ar' 
        ? 'حذف المحتوى؟' 
        : 'Delete Content?';
    }
    return '';
  }

  get message(): string {
    if (this.modalType === 'goBack') {
      return this.currentLang === 'ar'
        ? 'سيتم حذف جميع الأقسام والمحتوى الذي أضفته. هذا الإجراء لا يمكن التراجع عنه.'
        : 'All sections and content you\'ve added will be deleted. This action cannot be undone.';
    }
    if (this.modalType === 'deleteContent') {
      return this.currentLang === 'ar'
        ? 'هل أنت متأكد من حذف هذا المحتوى؟ لا يمكن التراجع عن هذا الإجراء.'
        : 'Are you sure you want to delete this content? This action cannot be undone.';
    }
    return '';
  }

  get confirmText(): string {
    if (this.modalType === 'deleteContent') {
      return this.currentLang === 'ar' ? 'حذف' : 'Delete';
    }
    return this.currentLang === 'ar' ? 'نعم، العودة' : 'Yes, Go Back';
  }

  get cancelText(): string {
    return this.currentLang === 'ar' ? 'إلغاء' : 'Cancel';
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
