import { Component, Inject, NgZone, OnDestroy, AfterViewInit, ViewChild, ElementRef, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { OnboardingChecklistComponent, OnbStep, StepKey } from './onboarding-checklist/onboarding-checklist.component';
import { CreateCourseFormComponent, CourseFormData } from './create-course-form/create-course-form.component';
import { AnimateOnIntersectDirective } from './animate-on-intersect.directive';
import { KpiNumberDirective } from './kpi-number.directive';
import { RippleDirective } from './ripple.directive';
import { ConfettiService } from './confetti.service';
import { TranslateModule } from '@ngx-translate/core';

// Onboarding types are now imported from the component


@Component({
  selector: 'app-teacher-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    OnboardingChecklistComponent,
    CreateCourseFormComponent,
    AnimateOnIntersectDirective,
    KpiNumberDirective,
    RippleDirective
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements AfterViewInit, OnDestroy {
  @ViewChild('hero', { static: false }) hero?: ElementRef<HTMLElement>;

  readonly isBrowser: boolean;
  aiTipEnabled = true;
  currentTip = 'Pro tip: Students learn better with interaction. Add polls!';
  private tipTimer?: number;
  private scrollHandler?: () => void;

  private readonly tips = [
    'Did you know? Games with music increase engagement.',
    'Pro tip: Use instant scoring for faster feedback.',
    'Colorful visuals boost memory retention. Try themes!',
    'Split long lessons into 5-minute segments.',
    'Peer review boosts understanding for both students.'
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private zone: NgZone,
    private confettiService: ConfettiService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // -------- Onboarding (course-centric)

  hasCourse = false;
  hasSection = false;
  hasInvited = false;

  // Real data for dynamic display
  courseData: { name: string; subject: string; grade: string; category: string } | null = null;
  sectionsData: { name: string; id: string }[] = [];
  studentsData: { count: number; sections: string[] } | null = null;

  // Create Course Form
  showCreateCourseForm = false;

  steps: OnbStep[] = [
    { key: 'createCourse',   titleKey: 'onb.createCourse.title', descKey: 'onb.createCourse.desc', ctaKey: 'onb.createCourse.cta', required: true,  done: false, action: () => this.onCreateCourse() },
    { key: 'addSection',     titleKey: 'onb.addSection.title',   descKey: 'onb.addSection.desc',   ctaKey: 'onb.addSection.cta',   required: true,  done: false, action: () => this.onAddSection() },
    { key: 'inviteStudents', titleKey: 'onb.invite.title',       descKey: 'onb.invite.desc',       ctaKey: 'onb.invite.cta',       required: true,  done: false, action: () => this.onInviteStudents() },
  ];

  get isFirstRun(): boolean {
    // first-run until there is a course and required steps are done
    return !this.hasCourse || !this.requiredDone();
  }

  get progressPct(): number {
    const req = this.steps.filter(s => s.required);
    const done = req.filter(s => s.done).length;
    return Math.round((done / req.length) * 100);
  }

  // Event handlers for onboarding component
  onStepCompleted(stepKey: StepKey): void {
    console.log(`Step completed: ${stepKey}`);
    // Handle step completion logic here
  }

  onStepAction(stepKey: StepKey): void {
    console.log(`Step action triggered: ${stepKey}`);
    // Handle step action logic here
  }

  // Create Course Form handlers
  onCourseCreated(courseData: CourseFormData): void {
    console.log('Course created:', courseData);
    
    // Update onboarding state
    this.hasCourse = true;
    this.courseData = {
      name: courseData.courseName,
      subject: courseData.subject,
      grade: courseData.grade,
      category: courseData.category || ''
    };
    
    // Update the step
    const courseStep = this.steps.find(s => s.key === 'createCourse');
    if (courseStep) {
      courseStep.done = true;
    }
    
    // Close the form
    this.showCreateCourseForm = false;
    
    // Show success message
    this.showSuccessToast('Course created successfully!');
    
    // Trigger confetti if in browser
    if (this.isBrowser) {
      this.confettiService.burst(50);
    }
  }

  onCourseFormCancelled(): void {
    this.showCreateCourseForm = false;
  }

  private showSuccessToast(message: string): void {
    // Simple toast implementation - in a real app, you'd use a proper toast service
    console.log('Success:', message);
    // TODO: Implement proper toast notification
  }

  private requiredDone(): boolean {
    return this.steps.filter(s => s.required).every(s => s.done);
  }

  hydrateOnboardingFromServer(snapshot: { courseCount: number; sectionCount: number; invitedCount: number; }): void {
    this.hasCourse = snapshot.courseCount > 0;
    this.hasSection = snapshot.sectionCount > 0;
    this.hasInvited = snapshot.invitedCount > 0;
    this.setDone('createCourse', this.hasCourse);
    this.setDone('addSection', this.hasSection);
    this.setDone('inviteStudents', this.hasInvited);
  }

  private setDone(key: 'createCourse' | 'addSection' | 'inviteStudents', v: boolean): void {
    const s = this.steps.find(x => x.key === key);
    if (s) s.done = v;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    // Rotate AI tips every 10s
    this.zone.runOutsideAngular(() => {
      let idx = 0;
      this.tipTimer = window.setInterval(() => {
        idx = (idx + 1) % this.tips.length;
        // back to Angular to update binding
        this.zone.run(() => (this.currentTip = this.tips[idx]));
      }, 10000);
    });

    // Parallax hero
    this.scrollHandler = () => {
      if (!this.hero) return;
      const scrolled = window.scrollY || 0;
      this.hero.nativeElement.style.transform = `translateY(${scrolled * 0.3}px)`;
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  onCreateCourse(): void {
    // Show the Create Course form
    this.showCreateCourseForm = true;
  }

  // Onboarding example handlers (wire to real flows later)
  onInviteStudents(): void {
    // Simulate student invitation with real data
    this.studentsData = {
      count: 25,
      sections: ['Section A', 'Section B']
    };
    
    this.setDone('inviteStudents', true);
    this.hasInvited = true;
    
    // Unlock next step with visual feedback
    this.unlockNextStep(2);
    this.maybeFinishOnboarding();
  }

  onNewActivity(): void {
    // TODO: route to activity builder
  }

  onHostLive(): void {
    // TODO: open live session setup
  }

  onExploreLibrary(): void {
    // TODO: route to templates/library
  }

  onAddSection(): void {
    // Simulate section creation with real data
    this.sectionsData = [
      { name: 'Section A', id: 'sec-a' },
      { name: 'Section B', id: 'sec-b' }
    ];
    
    this.setDone('addSection', true);
    this.hasSection = true;
    
    // Unlock next step with visual feedback
    this.unlockNextStep(1);
    this.maybeFinishOnboarding();
  }


  private unlockNextStep(completedStepIndex: number): void {
    // Add visual feedback for unlocking next step
    const nextStepIndex = completedStepIndex + 1;
    if (nextStepIndex < this.steps.length) {
      // Add a subtle pulse animation to the next step
      setTimeout(() => {
        // This will be handled by CSS animations
        console.log(`Step ${nextStepIndex + 1} unlocked!`);
      }, 500);
    }
  }

  private maybeFinishOnboarding(): void {
    if (this.requiredDone()) {
      // Big confetti celebration
      this.confettiService.burst(100);
      
      // Show completion message
      setTimeout(() => {
        console.log('🎉 Onboarding completed! Switching to normal dashboard...');
        // TODO: persist finished flag and/or route to normal dashboard
        // For now, the *ngIf="!isFirstRun" will handle the switch
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    if (this.tipTimer) window.clearInterval(this.tipTimer);
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
  }
}
