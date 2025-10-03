import { Component, OnInit, Output, EventEmitter } from '@angular/core';
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
  
  // B) Structure & schedule
  term?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  
  // C) Access & ownership
  visibility: string;
  institution?: string;
  coTeachers: string[];
  
  // D) Grading & policies
  gradingPolicy?: string;
  passingThreshold?: number;
  lateSubmissionRule?: string;
  
  // E) Description & tags
  description?: string;
  tags: string[];
  
  // F) Quick start
  createFirstSection: boolean;
  sectionName?: string;
  meetingPattern?: string;
  starterContent: string;
}

@Component({
  selector: 'app-create-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './create-course-form.component.html',
  styleUrls: ['./create-course-form.component.scss']
})
export class CreateCourseFormComponent implements OnInit {
  @Output() courseCreated = new EventEmitter<CourseFormData>();
  @Output() cancelled = new EventEmitter<void>();

  courseForm!: FormGroup;
  isSubmitting = false;
  selectedIcon = '';
  showUnsavedWarning = false;
  private initialFormValue: any;

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

  terms = [
    { value: 'current', label: 'onb.createCourse.options.terms.current' },
    { value: 'spring2024', label: 'onb.createCourse.options.terms.spring2024' },
    { value: 'summer2024', label: 'onb.createCourse.options.terms.summer2024' },
    { value: 'fall2024', label: 'onb.createCourse.options.terms.fall2024' },
    { value: 'custom', label: 'onb.createCourse.options.terms.custom' }
  ];

  visibilityOptions = [
    { value: 'private', label: 'onb.createCourse.options.visibility.private', desc: 'onb.createCourse.options.visibility.privateDesc' },
    { value: 'shareable', label: 'onb.createCourse.options.visibility.shareable', desc: 'onb.createCourse.options.visibility.shareableDesc' },
    { value: 'library', label: 'onb.createCourse.options.visibility.library', desc: 'onb.createCourse.options.visibility.libraryDesc' },
    { value: 'institution', label: 'onb.createCourse.options.visibility.institution', desc: 'onb.createCourse.options.visibility.institutionDesc' }
  ];

  institutions = [
    { value: 'personal', label: 'onb.createCourse.options.institutions.personal' },
    { value: 'university1', label: 'onb.createCourse.options.institutions.university1' },
    { value: 'school1', label: 'onb.createCourse.options.institutions.school1' }
  ];

  gradingPolicies = [
    { value: 'points', label: 'onb.createCourse.options.gradingPolicies.points' },
    { value: 'percentage', label: 'onb.createCourse.options.gradingPolicies.percentage' },
    { value: 'passfail', label: 'onb.createCourse.options.gradingPolicies.passfail' }
  ];

  lateSubmissionRules = [
    { value: 'accept', label: 'onb.createCourse.options.lateSubmissionRules.accept' },
    { value: 'penalty', label: 'onb.createCourse.options.lateSubmissionRules.penalty' },
    { value: 'close', label: 'onb.createCourse.options.lateSubmissionRules.close' }
  ];

  starterContentOptions = [
    { value: 'empty', label: 'onb.createCourse.options.starterContent.empty', desc: 'onb.createCourse.options.starterContent.emptyDesc' },
    { value: 'template', label: 'onb.createCourse.options.starterContent.template', desc: 'onb.createCourse.options.starterContent.templateDesc' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    // Store initial form value to detect changes
    this.initialFormValue = this.courseForm.value;
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

      // B) Structure & schedule
      term: new FormControl(''),
      startDate: new FormControl(today.toISOString().split('T')[0]),
      endDate: new FormControl(endDate.toISOString().split('T')[0]),
      timezone: new FormControl(''), // Will be set from user profile

      // C) Access & ownership
      visibility: new FormControl('private', Validators.required),
      institution: new FormControl('personal'),
      coTeachers: new FormArray([]),

      // D) Grading & policies
      gradingPolicy: new FormControl(''),
      passingThreshold: new FormControl(60, [Validators.min(0), Validators.max(100)]),
      lateSubmissionRule: new FormControl(''),

      // E) Description & tags
      description: new FormControl(''),
      tags: new FormArray([]),

      // F) Quick start
      createFirstSection: new FormControl(true),
      sectionName: new FormControl('Section A'),
      meetingPattern: new FormControl(''),
      starterContent: new FormControl('empty')
    });
  }

  get coTeachersArray(): FormArray {
    return this.courseForm.get('coTeachers') as FormArray;
  }

  get tagsArray(): FormArray {
    return this.courseForm.get('tags') as FormArray;
  }

  addCoTeacher(): void {
    this.coTeachersArray.push(new FormControl('', [Validators.email]));
  }

  removeCoTeacher(index: number): void {
    this.coTeachersArray.removeAt(index);
  }

  addTag(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value && !this.tagsArray.value.includes(value)) {
      this.tagsArray.push(new FormControl(value));
      input.value = '';
    }
  }

  removeTag(index: number): void {
    this.tagsArray.removeAt(index);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag(event);
    }
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
    this.cancelled.emit();
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