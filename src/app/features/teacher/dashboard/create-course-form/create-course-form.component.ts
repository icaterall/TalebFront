import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface CourseFormData {
  // A) Course basics
  courseName: string;
  subject: string;
  grade: string;
  category: string;
  primaryLanguage: string;
  courseIcon: string;
  courseColor: string;
  
  // B) Structure & schedule
  term: string;
  startDate: string;
  endDate: string;
  timezone: string;
  
  // C) Access & ownership
  visibility: string;
  institution: string;
  coTeachers: string[];
  
  // D) Grading & policies
  gradingPolicy: string;
  passingThreshold: number;
  lateSubmissionRule: string;
  
  // E) Description & tags
  description: string;
  tags: string[];
  
  // F) Quick start
  createFirstSection: boolean;
  sectionName: string;
  starterContent: string;
}

@Component({
  selector: 'app-create-course-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './create-course-form.component.html',
  styleUrls: ['./create-course-form.component.scss']
})
export class CreateCourseFormComponent implements OnInit {
  @Output() courseCreated = new EventEmitter<CourseFormData>();
  @Output() cancelled = new EventEmitter<void>();

  courseForm!: FormGroup;
  isSubmitting = false;

  // Form options
  subjects = [
    { value: 'math', label: 'createCourse.options.subjects.math' },
    { value: 'science', label: 'createCourse.options.subjects.science' },
    { value: 'english', label: 'createCourse.options.subjects.english' },
    { value: 'it', label: 'createCourse.options.subjects.it' },
    { value: 'history', label: 'createCourse.options.subjects.history' },
    { value: 'geography', label: 'createCourse.options.subjects.geography' },
    { value: 'art', label: 'createCourse.options.subjects.art' },
    { value: 'music', label: 'createCourse.options.subjects.music' },
    { value: 'physical', label: 'createCourse.options.subjects.physical' },
    { value: 'other', label: 'createCourse.options.subjects.other' }
  ];

  grades = [
    { value: 'grade5', label: 'createCourse.options.grades.grade5' },
    { value: 'grade6', label: 'createCourse.options.grades.grade6' },
    { value: 'grade7', label: 'createCourse.options.grades.grade7' },
    { value: 'grade8', label: 'createCourse.options.grades.grade8' },
    { value: 'grade9', label: 'createCourse.options.grades.grade9' },
    { value: 'grade10', label: 'createCourse.options.grades.grade10' },
    { value: 'grade11', label: 'createCourse.options.grades.grade11' },
    { value: 'grade12', label: 'createCourse.options.grades.grade12' },
    { value: 'university', label: 'createCourse.options.grades.university' },
    { value: 'adult', label: 'createCourse.options.grades.adult' }
  ];

  categories = [
    { value: 'stem', label: 'createCourse.options.categories.stem' },
    { value: 'humanities', label: 'createCourse.options.categories.humanities' },
    { value: 'languages', label: 'createCourse.options.categories.languages' },
    { value: 'skills', label: 'createCourse.options.categories.skills' },
    { value: 'arts', label: 'createCourse.options.categories.arts' },
    { value: 'sports', label: 'createCourse.options.categories.sports' }
  ];

  languages = [
    { value: 'arabic', label: 'createCourse.options.languages.arabic' },
    { value: 'english', label: 'createCourse.options.languages.english' },
    { value: 'both', label: 'createCourse.options.languages.both' }
  ];

  courseIcons = ['📚', '🧮', '🔬', '🌍', '🎨', '💻', '📖', '🎵', '🏃', '🔬', '📊', '🎯'];
  courseColors = ['#4f46e5', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#7c2d12', '#be185d'];

  terms = [
    { value: 'current', label: 'createCourse.options.terms.current' },
    { value: 'spring2024', label: 'createCourse.options.terms.spring2024' },
    { value: 'summer2024', label: 'createCourse.options.terms.summer2024' },
    { value: 'fall2024', label: 'createCourse.options.terms.fall2024' },
    { value: 'custom', label: 'createCourse.options.terms.custom' }
  ];

  timezones = [
    { value: 'UTC+4', label: 'UTC+4 (Gulf Standard Time)' },
    { value: 'UTC+3', label: 'UTC+3 (Eastern European Time)' },
    { value: 'UTC+0', label: 'UTC+0 (Greenwich Mean Time)' },
    { value: 'UTC-5', label: 'UTC-5 (Eastern Standard Time)' },
    { value: 'UTC-8', label: 'UTC-8 (Pacific Standard Time)' }
  ];

  visibilityOptions = [
    { 
      value: 'private', 
      label: 'createCourse.options.visibility.private',
      description: 'createCourse.options.visibility.privateDesc'
    },
    { 
      value: 'shareable', 
      label: 'createCourse.options.visibility.shareable',
      description: 'createCourse.options.visibility.shareableDesc'
    },
    { 
      value: 'library', 
      label: 'createCourse.options.visibility.library',
      description: 'createCourse.options.visibility.libraryDesc'
    },
    { 
      value: 'institution', 
      label: 'createCourse.options.visibility.institution',
      description: 'createCourse.options.visibility.institutionDesc'
    }
  ];

  institutions = [
    { value: 'personal', label: 'createCourse.options.institutions.personal' },
    { value: 'university1', label: 'createCourse.options.institutions.university1' },
    { value: 'school1', label: 'createCourse.options.institutions.school1' }
  ];

  gradingPolicies = [
    { value: 'points', label: 'createCourse.options.gradingPolicies.points' },
    { value: 'percentage', label: 'createCourse.options.gradingPolicies.percentage' },
    { value: 'passfail', label: 'createCourse.options.gradingPolicies.passfail' }
  ];

  lateSubmissionRules = [
    { value: 'accept', label: 'createCourse.options.lateSubmissionRules.accept' },
    { value: 'penalty', label: 'createCourse.options.lateSubmissionRules.penalty' },
    { value: 'close', label: 'createCourse.options.lateSubmissionRules.close' }
  ];

  starterContentOptions = [
    { 
      value: 'empty', 
      label: 'createCourse.options.starterContent.empty',
      description: 'createCourse.options.starterContent.emptyDesc'
    },
    { 
      value: 'template', 
      label: 'createCourse.options.starterContent.template',
      description: 'createCourse.options.starterContent.templateDesc'
    }
  ];

  // Dynamic arrays for chips
  coTeachers: string[] = [];
  tags: string[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setDefaultValues();
  }

  private initializeForm(): void {
    this.courseForm = this.fb.group({
      // A) Course basics
      courseName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      subject: ['', Validators.required],
      grade: ['', Validators.required],
      category: [''],
      primaryLanguage: ['', Validators.required],
      courseIcon: ['📚'],
      courseColor: ['#4f46e5'],
      
      // B) Structure & schedule
      term: [''],
      startDate: [''],
      endDate: [''],
      timezone: ['UTC+4'],
      
      // C) Access & ownership
      visibility: ['private', Validators.required],
      institution: [''],
      
      // D) Grading & policies
      gradingPolicy: [''],
      passingThreshold: [60],
      lateSubmissionRule: [''],
      
      // E) Description & tags
      description: [''],
      
      // F) Quick start
      createFirstSection: [true],
      sectionName: ['Section A'],
      starterContent: ['empty']
    });

    // Add conditional validators
    this.courseForm.get('institution')?.setValidators([
      this.conditionalRequiredValidator('visibility', 'institution')
    ]);

    this.courseForm.get('passingThreshold')?.setValidators([
      this.conditionalRequiredValidator('gradingPolicy', 'percentage')
    ]);
  }

  private setDefaultValues(): void {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 84); // +12 weeks

    this.courseForm.patchValue({
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      visibility: 'private',
      createFirstSection: true,
      sectionName: 'Section A',
      starterContent: 'empty'
    });
  }

  private conditionalRequiredValidator(controlName: string, requiredValue: string) {
    return (control: AbstractControl) => {
      const parent = control.parent;
      if (parent && parent.get(controlName)?.value === requiredValue) {
        return Validators.required(control);
      }
      return null;
    };
  }

  getFieldError(fieldName: string): string {
    const field = this.courseForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'createCourse.validation.required';
      }
      if (field.errors['minlength']) {
        return 'createCourse.validation.minLength';
      }
      if (field.errors['maxlength']) {
        return 'createCourse.validation.maxLength';
      }
      if (field.errors['email']) {
        return 'createCourse.validation.email';
      }
    }
    return '';
  }

  selectIcon(icon: string): void {
    this.courseForm.patchValue({ courseIcon: icon });
  }

  selectColor(color: string): void {
    this.courseForm.patchValue({ courseColor: color });
  }

  addCoTeacher(event: any): void {
    const input = event.target as HTMLInputElement;
    const email = input.value.trim();
    
    if (email && this.isValidEmail(email) && !this.coTeachers.includes(email)) {
      this.coTeachers.push(email);
      input.value = '';
    }
  }

  removeCoTeacher(email: string): void {
    this.coTeachers = this.coTeachers.filter(e => e !== email);
  }

  addTag(event: any): void {
    const input = event.target as HTMLInputElement;
    const tag = input.value.trim();
    
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSubmit(): void {
    if (this.courseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formData: CourseFormData = {
        ...this.courseForm.value,
        coTeachers: this.coTeachers,
        tags: this.tags
      };

      // Simulate API call
      setTimeout(() => {
        this.isSubmitting = false;
        this.courseCreated.emit(formData);
      }, 1500);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.courseForm.controls).forEach(key => {
        this.courseForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  // AI helper methods (for future implementation)
  suggestCourseName(): void {
    const subject = this.courseForm.get('subject')?.value;
    const grade = this.courseForm.get('grade')?.value;
    
    if (subject && grade) {
      // AI suggestion logic would go here
      const suggestions = this.generateAISuggestions(subject, grade);
      // Show suggestions to user
    }
  }

  private generateAISuggestions(subject: string, grade: string): string[] {
    // This would integrate with an AI service
    return [
      `${subject} Fundamentals - ${grade}`,
      `Advanced ${subject} - ${grade}`,
      `${subject} Mastery Course - ${grade}`
    ];
  }
}
