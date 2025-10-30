import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { RecommendationsService, Recommendation } from '../../../core/services/recommendations.service';
import { AIIntroService, AIIntroPack } from '../../../core/services/ai-intro.service';
import { PlacementService } from '../../../core/services/placement.service';
import { AssistantService } from '../../../core/services/assistant.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-student-starter',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './student-starter.component.html',
  styleUrls: ['./student-starter.component.scss']
})
export class StudentStarterComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly recs = inject(RecommendationsService);
  private readonly ai = inject(AIIntroService);
  private readonly placement = inject(PlacementService);
  private readonly assistant = inject(AssistantService);
  private readonly auth = inject(UniversalAuthService);
  private readonly i18n = inject(I18nService);

  loading = false;
  user: any = null;
  recommendations: Recommendation[] = [];
  aiIntroPack: AIIntroPack | null = null;

  get currentLang() { return this.i18n.current; }

  ngOnInit(): void {
    if (!this.auth.validateAccess('Student')) return;
    this.user = this.auth.getCurrentUser();
    this.loadData();
  }

  private loadData(): void {
    if (!this.user) return;
    const profile: any = this.user;
    const country_id = profile?.country_id || 1;
    const state_id = profile?.state_id;
    const stage_id = profile?.education_stage_id ?? profile?.stage_id ?? 0;
    const locale = this.currentLang;
    this.loading = true;
    this.recs.getRecommendations({ country_id, state_id, stage_id, locale, limit: 3 }).subscribe({
      next: (res) => {
        this.recommendations = res?.recommendations || [];
        if (!this.recommendations.length) {
          this.ai.generateIntroPack({ country_id, state_id, stage_id, locale }).subscribe({
            next: (ai) => { this.aiIntroPack = ai?.lesson || null; this.loading = false; },
            error: () => { this.loading = false; }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  onStartNow(): void {
    if (this.recommendations.length) {
      this.toastr.success(this.currentLang === 'ar' ? 'بدء الدرس الموصى به' : 'Starting recommended lesson');
      return;
    }
    if (this.aiIntroPack) {
      this.toastr.success(this.currentLang === 'ar' ? 'بدء الدرس التمهيدي' : 'Starting intro pack');
    }
  }

  onChangeTopic(): void {
    this.loadData();
  }

  onQuickPlacement(): void {
    this.placement.score([]).subscribe({
      next: (r) => { this.toastr.info(this.currentLang === 'ar' ? `مستواك: ${r.level}` : `Your level: ${r.level}`); this.loadData(); },
      error: () => this.toastr.error(this.currentLang === 'ar' ? 'فشل التقييم' : 'Placement failed')
    });
  }
}


