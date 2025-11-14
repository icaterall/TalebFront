import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStep } from '../../types/wizard.types';

@Component({
  selector: 'app-wizard-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wizard-progress.component.html',
  styleUrls: ['./wizard-progress.component.scss']
})
export class WizardProgressComponent {
  @Input() currentStep: WizardStep = 1;
  @Input() step2Locked: boolean = false;
  @Input() currentLang: 'ar' | 'en' = 'en';

  readonly steps = [
    {
      number: 1,
      nameEn: 'Course Basics',
      nameAr: 'أساسيات المادة الدراسية'
    },
    {
      number: 2,
      nameEn: 'Building Sections',
      nameAr: 'بناء الاقسام'
    },
    {
      number: 3,
      nameEn: 'Review & Publish',
      nameAr: 'مراجعة ونشر'
    }
  ];

  getStepClass(stepNumber: number): string {
    const classes = [];
    
    if (stepNumber === 1) {
      if (this.step2Locked || this.currentStep > 1) {
        classes.push('completed');
      } else if (this.currentStep === 1 && !this.step2Locked) {
        classes.push('current');
      }
    } else if (stepNumber === 2) {
      if (this.currentStep > 2) {
        classes.push('completed');
      } else if (this.currentStep === 2) {
        classes.push('current');
      } else {
        classes.push('pending');
      }
    } else if (stepNumber === 3) {
      classes.push('pending');
    }
    
    return classes.join(' ');
  }

  isStepCompleted(stepNumber: number): boolean {
    if (stepNumber === 1) {
      return this.step2Locked || this.currentStep > 1;
    }
    return this.currentStep > stepNumber;
  }

  getStepName(step: any): string {
    return this.currentLang === 'ar' ? step.nameAr : step.nameEn;
  }
}
