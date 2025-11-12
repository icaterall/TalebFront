import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cover-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cover-image.component.html',
  styleUrls: ['./cover-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoverImageComponent {
  @Input() courseCoverPreview: string | null = null;
  @Input() defaultCourseCover: string = '';
  @Input() courseCoverUploading = false;
  @Input() courseCoverDeleting = false;
  @Input() courseCoverUploadProgress = 0;
  @Input() courseCoverUploadError: string | null = null;
  @Input() hasCustomCourseCover = false;
  @Input() coverImageLoaded = false;
  @Input() currentLang: string = 'en';

  @Output() readonly select = new EventEmitter<Event>();
  @Output() readonly openDelete = new EventEmitter<void>();
  @Output() readonly confirmDelete = new EventEmitter<void>();
  @Output() readonly imageLoad = new EventEmitter<void>();
  @Output() readonly imageError = new EventEmitter<void>();

  readonly uploadIcon = '⬆️';
  readonly deleteIcon = '✕';

  get isArabic(): boolean {
    return this.currentLang?.toLowerCase().startsWith('ar') ?? false;
  }

  get progressLabel(): string {
    if (this.courseCoverDeleting) {
      return this.isArabic ? 'جاري الحذف' : 'Deleting';
    }
    return this.isArabic ? 'جاري الرفع' : 'Uploading';
  }

  get progressValue(): number {
    if (this.courseCoverUploadProgress <= 0) {
      return 0;
    }
    if (this.courseCoverUploadProgress >= 100) {
      return 100;
    }
    return Math.round(this.courseCoverUploadProgress);
  }

  get placeholderTitle(): string {
    return this.isArabic ? 'أضف صورة غلاف' : 'Add a cover image';
  }

  get placeholderHint(): string {
    return this.isArabic ? 'PNG أو JPG حتى 5 ميجابايت' : 'PNG or JPG up to 5 MB';
  }

  get removeLabel(): string {
    return this.isArabic ? 'حذف صورة الغلاف' : 'Remove cover';
  }

  get uploadErrorLabel(): string {
    return this.courseCoverUploadError ?? '';
  }

  onFileSelected(event: Event): void {
    this.select.emit(event);
  }

  onRemoveClicked(event: Event): void {
    event.stopPropagation();
    this.openDelete.emit();
  }

  onImageLoad(): void {
    this.imageLoad.emit();
  }

  onImageError(): void {
    this.imageError.emit();
  }
}
