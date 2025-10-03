import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface CourseFormData {
  // A) Course basics
  courseName: string;
  subject: string;
  grade: string;
  category?: string;
  primaryLanguage: string;
  courseIcon?: string;
  coverImage?: string;
  
  // C) Access & ownership
  visibility: string;
  
  // F) Quick section
  createFirstSection: boolean;
  sectionName?: string;
}

@Component({
  selector: 'app-create-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './create-course-form.component.html',
  styleUrls: ['./create-course-form.component.scss']
})
export class CreateCourseFormComponent implements OnInit, OnDestroy {
  @Output() courseCreated = new EventEmitter<CourseFormData>();
  @Output() cancelled = new EventEmitter<void>();

  courseForm!: FormGroup;
  isSubmitting = false;
  selectedIcon = '';
  showUnsavedWarning = false;
  private initialFormValue: any;
  
  // Cover image properties
  coverImagePreview: string | null = null;
  coverImageFile: File | null = null;
  defaultCoverImage = '/assets/default-course-cover.svg'; // Default placeholder image

  // Options for dropdowns
  subjects = [
    { value: 'math', label: 'onb.createCourse.options.subjects.math' },
    { value: 'science', label: 'onb.createCourse.options.subjects.science' },
    { value: 'english', label: 'onb.createCourse.options.subjects.english' },
    { value: 'it', label: 'onb.createCourse.options.subjects.it' },
    { value: 'history', label: 'onb.createCourse.options.subjects.history' },
    { value: 'geography', label: 'onb.createCourse.options.subjects.geography' },
    { value: 'art', label: 'onb.createCourse.options.subjects.art' },
    { value: 'physical', label: 'onb.createCourse.options.subjects.physical' },
    { value: 'other', label: 'onb.createCourse.options.subjects.other' }
  ];

  grades = [
    { value: 'grade5', label: 'onb.createCourse.options.grades.grade5' },
    { value: 'grade6', label: 'onb.createCourse.options.grades.grade6' },
    { value: 'grade7', label: 'onb.createCourse.options.grades.grade7' },
    { value: 'grade8', label: 'onb.createCourse.options.grades.grade8' },
    { value: 'grade9', label: 'onb.createCourse.options.grades.grade9' },
    { value: 'grade10', label: 'onb.createCourse.options.grades.grade10' },
    { value: 'grade11', label: 'onb.createCourse.options.grades.grade11' },
    { value: 'grade12', label: 'onb.createCourse.options.grades.grade12' },
    { value: 'university', label: 'onb.createCourse.options.grades.university' },
    { value: 'adult', label: 'onb.createCourse.options.grades.adult' }
  ];

  categories = [
    { value: 'stem', label: 'onb.createCourse.options.categories.stem' },
    { value: 'humanities', label: 'onb.createCourse.options.categories.humanities' },
    { value: 'languages', label: 'onb.createCourse.options.categories.languages' },
    { value: 'skills', label: 'onb.createCourse.options.categories.skills' },
    { value: 'arts', label: 'onb.createCourse.options.categories.arts' },
    { value: 'sports', label: 'onb.createCourse.options.categories.sports' }
  ];

  languages = [
    { value: 'arabic', label: 'onb.createCourse.options.languages.arabic' },
    { value: 'english', label: 'onb.createCourse.options.languages.english' },
    { value: 'french', label: 'onb.createCourse.options.languages.french' },
    { value: 'spanish', label: 'onb.createCourse.options.languages.spanish' },
    { value: 'german', label: 'onb.createCourse.options.languages.german' },
    { value: 'italian', label: 'onb.createCourse.options.languages.italian' },
    { value: 'portuguese', label: 'onb.createCourse.options.languages.portuguese' },
    { value: 'russian', label: 'onb.createCourse.options.languages.russian' },
    { value: 'chinese', label: 'onb.createCourse.options.languages.chinese' },
    { value: 'japanese', label: 'onb.createCourse.options.languages.japanese' },
    { value: 'korean', label: 'onb.createCourse.options.languages.korean' },
    { value: 'hindi', label: 'onb.createCourse.options.languages.hindi' },
    { value: 'urdu', label: 'onb.createCourse.options.languages.urdu' },
    { value: 'turkish', label: 'onb.createCourse.options.languages.turkish' },
    { value: 'persian', label: 'onb.createCourse.options.languages.persian' },
    { value: 'both', label: 'onb.createCourse.options.languages.both' },
    { value: 'multilingual', label: 'onb.createCourse.options.languages.multilingual' },
    { value: 'arabicClassical', label: 'onb.createCourse.options.languages.arabicClassical' },
    { value: 'arabicModern', label: 'onb.createCourse.options.languages.arabicModern' },
    { value: 'arabicDialect', label: 'onb.createCourse.options.languages.arabicDialect' },
    { value: 'englishUS', label: 'onb.createCourse.options.languages.englishUS' },
    { value: 'englishUK', label: 'onb.createCourse.options.languages.englishUK' },
    { value: 'englishAU', label: 'onb.createCourse.options.languages.englishAU' },
    { value: 'spanishES', label: 'onb.createCourse.options.languages.spanishES' },
    { value: 'spanishMX', label: 'onb.createCourse.options.languages.spanishMX' },
    { value: 'frenchFR', label: 'onb.createCourse.options.languages.frenchFR' },
    { value: 'frenchCA', label: 'onb.createCourse.options.languages.frenchCA' },
    { value: 'portugueseBR', label: 'onb.createCourse.options.languages.portugueseBR' },
    { value: 'portuguesePT', label: 'onb.createCourse.options.languages.portuguesePT' },
    { value: 'chineseSimplified', label: 'onb.createCourse.options.languages.chineseSimplified' },
    { value: 'chineseTraditional', label: 'onb.createCourse.options.languages.chineseTraditional' }
  ];


  visibilityOptions = [
    { value: 'private', label: 'onb.createCourse.options.visibility.private', desc: 'onb.createCourse.options.visibility.privateDesc' },
    { value: 'public', label: 'onb.createCourse.options.visibility.public', desc: 'onb.createCourse.options.visibility.publicDesc' },
    { value: 'institution', label: 'onb.createCourse.options.visibility.institution', desc: 'onb.createCourse.options.visibility.institutionDesc' }
  ];


  ngOnInit(): void {
    this.initializeForm();
    // Store initial form value to detect changes
    this.initialFormValue = this.courseForm.value;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Watch for checkbox changes to update validation
    this.courseForm.get('createFirstSection')?.valueChanges.subscribe(checked => {
      this.updateSectionNameValidation(checked);
    });
    
    // Set initial validation based on checkbox state
    this.updateSectionNameValidation(this.courseForm.get('createFirstSection')?.value);
  }

  ngOnDestroy(): void {
    // Restore body scroll when component is destroyed
    document.body.style.overflow = '';
  }

  private initializeForm(): void {
    const today = new Date();
    const endDate = new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000); // +12 weeks

    this.courseForm = new FormGroup({
      // A) Course basics
      courseName: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]),
      subject: new FormControl('', Validators.required),
      grade: new FormControl('', Validators.required),
      category: new FormControl(''),
      primaryLanguage: new FormControl('', Validators.required),
      courseIcon: new FormControl(''),
      coverImage: new FormControl(''),

      // C) Access & ownership
      visibility: new FormControl('private', Validators.required),

      // F) Quick section
      createFirstSection: new FormControl(true),
      sectionName: new FormControl('')
    });
  }

  private updateSectionNameValidation(checked: boolean): void {
    const sectionNameControl = this.courseForm.get('sectionName');
    if (checked) {
      sectionNameControl?.setValidators([Validators.required, Validators.minLength(1)]);
    } else {
      sectionNameControl?.clearValidators();
    }
    sectionNameControl?.updateValueAndValidity();
  }



  onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancel();
    }
  }

  selectIcon(icon: string): void {
    this.selectedIcon = icon;
    this.courseForm.patchValue({ courseIcon: icon });
  }

  onCloseClick(): void {
    if (this.hasUnsavedChanges()) {
      this.showUnsavedWarning = true;
    } else {
      this.cancel();
    }
  }

  hideUnsavedWarning(): void {
    this.showUnsavedWarning = false;
  }

  confirmClose(): void {
    this.showUnsavedWarning = false;
    this.cancel();
  }

  private hasUnsavedChanges(): boolean {
    const currentValue = this.courseForm.value;
    return JSON.stringify(currentValue) !== JSON.stringify(this.initialFormValue);
  }

  onSubmit(): void {
    if (this.courseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      // Simulate API call
      setTimeout(() => {
        const formData: CourseFormData = this.courseForm.value;
        this.courseCreated.emit(formData);
        this.isSubmitting = false;
      }, 1500);
    } else {
      this.courseForm.markAllAsTouched();
    }
  }

  cancel(): void {
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
    this.cancelled.emit();
  }

  // Cover image methods
  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type (only images)
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file only.');
        input.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB.');
        input.value = '';
        return;
      }
      
      this.coverImageFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverImagePreview = e.target?.result as string;
        this.courseForm.patchValue({ coverImage: this.coverImagePreview });
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage(): void {
    this.coverImagePreview = null;
    this.coverImageFile = null;
    this.courseForm.patchValue({ coverImage: '' });
    
    // Reset file input
    const fileInput = document.getElementById('coverImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  resetCoverImage(): void {
    this.coverImagePreview = null;
    this.coverImageFile = null;
    this.courseForm.patchValue({ coverImage: this.defaultCoverImage });
    
    // Reset file input
    const fileInput = document.getElementById('coverImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.courseForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'onb.createCourse.validation.required';
      }
      if (field.errors['minlength']) {
        return 'onb.createCourse.validation.minLength';
      }
      if (field.errors['maxlength']) {
        return 'onb.createCourse.validation.maxLength';
      }
      if (field.errors['email']) {
        return 'onb.createCourse.validation.email';
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.courseForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}