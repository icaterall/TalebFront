import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { AiBuilderService, CourseDraft } from '../../../core/services/ai-builder.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-course-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './course-wizard.component.html',
  styleUrls: ['./course-wizard.component.scss']
})
export class CourseWizardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly ai = inject(AiBuilderService);
  private readonly http = inject(HttpClient);

  // Current draft
  draft: CourseDraft | null = null;
  student: any = null;

  // Wizard state
  currentStep: 'basics' | 'unit' | 'review' = 'basics';
  
  // Step 2: Course Basics
  step2 = {
    courseTitle: '',
    subjectTag: '',
    units: [] as { id: string; name: string; }[],
    suggestedTitles: [] as string[],
    suggestedUnits: [] as string[],
    titleLoading: false,
    unitLoading: false,
    editMode: false
  };

  // Step 3: Build First Unit
  step3 = {
    objectives: [] as string[],
    outline: [] as string[],
    contentBlocks: [] as any[],
    quiz: [] as any[],
    loading: false
  };

  // Step 4: Review & Publish
  step4 = {
    visibility: 'public',
    availability: 'open',
    createSection: false,
    publishing: false
  };

  get currentLang(): 'ar' | 'en' { return this.i18n.current; }
  get isRTL(): boolean { return this.currentLang === 'ar'; }

  ngOnInit(): void {
    if (!this.universalAuth.validateAccess('Student')) return;
    
    this.student = this.universalAuth.getCurrentUser();
    this.draft = this.ai.getDraft();

    if (!this.draft || !this.draft.category_id) {
      this.router.navigateByUrl('/student/starter');
      return;
    }

    // Get current step from route
    this.route.params.subscribe(params => {
      const step = params['step'];
      if (step === 'basics' || step === 'unit' || step === 'review') {
        this.currentStep = step;
        this.loadStepData(step);
      } else {
        this.router.navigateByUrl('/student/wizard/basics');
      }
    });
  }

  private loadStepData(step: string): void {
    if (!this.draft) return;

    switch (step) {
      case 'basics':
        this.loadStep2Data();
        break;
      case 'unit':
        this.loadStep3Data();
        break;
      case 'review':
        this.loadStep4Data();
        break;
    }
  }

  private loadStep2Data(): void {
    if (!this.draft) return;
    // Restore from draft if available
    if (this.draft.name) this.step2.courseTitle = this.draft.name;
    if (this.draft.subject_slug) this.step2.subjectTag = this.draft.subject_slug;
    if (this.draft.units) this.step2.units = this.draft.units;
  }

  private loadStep3Data(): void {
    if (!this.draft) return;
    // Restore from draft if available
    if (this.draft.objectives) this.step3.objectives = this.draft.objectives;
    if (this.draft.sections) this.step3.contentBlocks = this.draft.sections;
    if (this.draft.quiz) this.step3.quiz = this.draft.quiz;
  }

  private loadStep4Data(): void {
    // Ready for review
  }

  // Step 2 Methods
  suggestTitles(): void {
    if (!this.draft) return;
    this.step2.titleLoading = true;
    
    this.http.post<{ titles: string[] }>('/ai/titles', {
      stage_id: this.draft.stage_id,
      country_id: this.draft.country_id,
      category_id: this.draft.category_id,
      locale: this.currentLang
    }).subscribe({
      next: (res) => {
        this.step2.suggestedTitles = res.titles || [];
        this.step2.titleLoading = false;
      },
      error: (err) => {
        console.error('Failed to suggest titles:', err);
        this.step2.titleLoading = false;
      }
    });
  }

  selectTitle(title: string): void {
    this.step2.courseTitle = title;
    this.step2.editMode = false;
  }

  suggestUnits(): void {
    if (!this.draft || !this.step2.courseTitle) return;
    this.step2.unitLoading = true;

    this.http.post<{ units: string[] }>('/ai/outline', {
      title: this.step2.courseTitle,
      stage_id: this.draft.stage_id,
      country_id: this.draft.country_id,
      locale: this.currentLang
    }).subscribe({
      next: (res) => {
        this.step2.suggestedUnits = res.units || [];
        // Convert to unit objects
        this.step2.units = this.step2.suggestedUnits.map((name, idx) => ({
          id: `unit-${idx}`,
          name
        }));
        this.step2.unitLoading = false;
      },
      error: (err) => {
        console.error('Failed to suggest units:', err);
        this.step2.unitLoading = false;
      }
    });
  }

  continueToStep3(): void {
    if (!this.step2.courseTitle || this.step2.units.length === 0) return;

    // Save to draft
    this.draft = {
      ...this.draft!,
      name: this.step2.courseTitle,
      subject_slug: this.step2.subjectTag,
      units: this.step2.units,
      last_saved_at: new Date().toISOString()
    };

    this.ai.saveDraft(this.draft);
    this.router.navigateByUrl('/student/wizard/unit');
  }

  // Step 3 Methods
  continueToStep4(): void {
    // Save unit content to draft
    this.draft = {
      ...this.draft!,
      objectives: this.step3.objectives,
      sections: this.step3.contentBlocks,
      quiz: this.step3.quiz,
      last_saved_at: new Date().toISOString()
    };

    this.ai.saveDraft(this.draft);
    this.router.navigateByUrl('/student/wizard/review');
  }

  // Step 4 Methods
  publishCourse(): void {
    if (!this.draft) return;
    this.step4.publishing = true;

    this.http.post('/courses/publish-draft', {
      ...this.draft,
      visibility: this.step4.visibility,
      availability: this.step4.availability,
      createSection: this.step4.createSection
    }).subscribe({
      next: (res: any) => {
        this.step4.publishing = false;
        // Clear draft
        this.ai.clearDraft();
        // Redirect to course page or dashboard
        this.router.navigateByUrl(`/student/course/${res.courseId}`);
      },
      error: (err) => {
        console.error('Failed to publish course:', err);
        this.step4.publishing = false;
      }
    });
  }

  goBack(): void {
    if (this.currentStep === 'basics') {
      this.router.navigateByUrl('/student/starter');
    } else if (this.currentStep === 'unit') {
      this.router.navigateByUrl('/student/wizard/basics');
    } else if (this.currentStep === 'review') {
      this.router.navigateByUrl('/student/wizard/unit');
    }
  }

  getStepStatus(step: 1 | 2 | 3 | 4): string {
    if (step === 1) return 'Completed'; // Category already selected
    if (step === 2 && this.currentStep === 'basics') return 'In Progress';
    if (step === 3 && this.currentStep === 'unit') return 'In Progress';
    if (step === 4 && this.currentStep === 'review') return 'In Progress';
    if (step < (this.currentStep === 'basics' ? 2 : this.currentStep === 'unit' ? 3 : 4)) return 'Completed';
    return 'Pending';
  }
}
