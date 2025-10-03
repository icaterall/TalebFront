import { Component, Inject, NgZone, OnDestroy, AfterViewInit, ViewChild, ElementRef, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { KpiStripComponent } from './kpi-strip/kpi-strip.component';
import { TodayAgendaComponent } from './today-agenda/today-agenda.component';
import { RecentActivityComponent } from './recent-activity/recent-activity.component';
import { QuickLinksComponent } from './quick-links/quick-links.component';
import { AnimateOnIntersectDirective } from './animate-on-intersect.directive';
import { KpiNumberDirective } from './kpi-number.directive';
import { RippleDirective } from './ripple.directive';
import { ConfettiService } from './confetti.service';
import { TranslateModule } from '@ngx-translate/core';

// Onboarding types (course-centric)
type StepKey = 'createCourse' | 'addSection' | 'inviteStudents' | 'addFirstItem';
interface OnbStep {
  key: StepKey;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  required: boolean;
  done: boolean;
  action: () => void;
}


@Component({
  selector: 'app-teacher-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    KpiStripComponent,
    TodayAgendaComponent,
    RecentActivityComponent,
    QuickLinksComponent,
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
    @Inject(PLATFORM_ID) platformId: Object,
    private zone: NgZone,
    private confetti: ConfettiService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // -------- Onboarding (course-centric)

  hasCourse = false;
  hasSection = false;
  hasInvited = false;
  hasItem = false;

  steps: OnbStep[] = [
    { key: 'createCourse',   titleKey: 'onb.createCourse.title', descKey: 'onb.createCourse.desc', ctaKey: 'onb.createCourse.cta', required: true,  done: false, action: () => this.onCreateCourse() },
    { key: 'addSection',     titleKey: 'onb.addSection.title',   descKey: 'onb.addSection.desc',   ctaKey: 'onb.addSection.cta',   required: true,  done: false, action: () => this.onAddSection() },
    { key: 'inviteStudents', titleKey: 'onb.invite.title',       descKey: 'onb.invite.desc',       ctaKey: 'onb.invite.cta',       required: true,  done: false, action: () => this.onInviteStudents() },
    { key: 'addFirstItem',   titleKey: 'onb.addItem.title',      descKey: 'onb.addItem.desc',      ctaKey: 'onb.addItem.cta',      required: false, done: false, action: () => this.onAddItem() },
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

  private requiredDone(): boolean {
    return this.steps.filter(s => s.required).every(s => s.done);
  }

  hydrateOnboardingFromServer(snapshot: { courseCount: number; sectionCount: number; invitedCount: number; itemCount: number; }): void {
    this.hasCourse = snapshot.courseCount > 0;
    this.hasSection = snapshot.sectionCount > 0;
    this.hasInvited = snapshot.invitedCount > 0;
    this.hasItem = snapshot.itemCount > 0;
    this.setDone('createCourse', this.hasCourse);
    this.setDone('addSection', this.hasSection);
    this.setDone('inviteStudents', this.hasInvited);
    this.setDone('addFirstItem', this.hasItem);
  }

  private setDone(key: 'createCourse' | 'addSection' | 'inviteStudents' | 'addFirstItem', v: boolean): void {
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
    // Optional: trigger confetti like your script
    if (this.isBrowser) this.confetti.burst(50);
    this.setDone('createCourse', true);
    this.hasCourse = true;
    this.maybeFinishOnboarding();
  }

  // Onboarding example handlers (wire to real flows later)
  onInviteStudents(): void {
    // TODO: open invite dialog / route
    this.setDone('inviteStudents', true);
    this.hasInvited = true;
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
    // TODO: route to add section
    this.setDone('addSection', true);
    this.hasSection = true;
    this.maybeFinishOnboarding();
  }

  onAddItem(): void {
    // TODO: open builder
    this.setDone('addFirstItem', true);
    this.hasItem = true;
  }

  private maybeFinishOnboarding(): void {
    if (this.requiredDone()) {
      this.confetti.burst(60);
      setTimeout(() => {
        // TODO: persist finished flag and/or route
      }, 700);
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    if (this.tipTimer) window.clearInterval(this.tipTimer);
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
  }
}
