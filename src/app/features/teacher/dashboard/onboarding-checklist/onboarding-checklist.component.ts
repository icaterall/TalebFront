import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AnimateOnIntersectDirective } from '../animate-on-intersect.directive';
import { RippleDirective } from '../ripple.directive';

// Onboarding types (course-centric)
export type StepKey = 'createCourse' | 'addSection' | 'inviteStudents' | 'addFirstItem';
export interface OnbStep {
  key: StepKey;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  required: boolean;
  done: boolean;
  action: () => void;
  // Dynamic data for "after" state
  courseName?: string;
  courseDetails?: string;
  sectionNames?: string[];
  sectionCount?: number;
  studentCount?: number;
  itemCount?: number;
  itemTypes?: string[];
}

@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AnimateOnIntersectDirective,
    RippleDirective
  ],
  templateUrl: './onboarding-checklist.component.html',
  styleUrls: ['./onboarding-checklist.component.scss']
})
export class OnboardingChecklistComponent {
  @Input() steps: OnbStep[] = [];
  @Input() progressPct: number = 0;
  @Output() stepCompleted = new EventEmitter<StepKey>();
  @Output() stepAction = new EventEmitter<StepKey>();

  // Check if a step is unlocked (can be interacted with)
  isStepUnlocked(stepIndex: number): boolean {
    if (stepIndex === 0) return true; // First step always unlocked
    return this.steps.slice(0, stepIndex).every(s => s.done);
  }

  // Get dynamic step title based on completion state
  getStepTitle(step: OnbStep): string {
    if (!step.done) {
      return step.titleKey; // Use translation key for "before" state
    }

    // Return translation key for "after" state
    switch (step.key) {
      case 'createCourse':
        return 'onb.createCourse.afterTitle';
      case 'addSection':
        return 'onb.addSection.afterTitle';
      case 'inviteStudents':
        return 'onb.invite.afterTitle';
      case 'addFirstItem':
        return 'onb.addItem.afterTitle';
      default:
        return step.titleKey;
    }
  }

  // Get dynamic step description based on completion state
  getStepDescription(step: OnbStep): string {
    if (!step.done) {
      return step.descKey; // Use translation key for "before" state
    }

    // Return translation key for "after" state
    switch (step.key) {
      case 'createCourse':
        return 'onb.createCourse.afterDesc';
      case 'addSection':
        return 'onb.addSection.afterDesc';
      case 'inviteStudents':
        return 'onb.invite.afterDesc';
      case 'addFirstItem':
        return 'onb.addItem.afterDesc';
      default:
        return step.descKey;
    }
  }

  // Get dynamic step button text based on completion state
  getStepButtonText(step: OnbStep): string {
    if (!step.done) {
      return step.ctaKey; // Use translation key for "before" state
    }

    // Return dynamic button text for "after" state
    switch (step.key) {
      case 'createCourse':
        return 'onb.createCourse.updateCta';
      case 'addSection':
        return 'onb.addSection.manageCta';
      case 'inviteStudents':
        return 'onb.invite.manageCta';
      case 'addFirstItem':
        return 'onb.addItem.manageCta';
      default:
        return step.ctaKey;
    }
  }

  onStepAction(step: OnbStep): void {
    if (this.isStepUnlocked(this.steps.indexOf(step))) {
      this.stepAction.emit(step.key);
      step.action();
    }
  }
}
