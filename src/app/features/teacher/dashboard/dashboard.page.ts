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
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    if (this.tipTimer) window.clearInterval(this.tipTimer);
    if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
  }
}
