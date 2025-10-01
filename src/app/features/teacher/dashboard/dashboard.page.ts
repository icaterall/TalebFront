import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { KpiStripComponent } from './kpi-strip/kpi-strip.component';
import { TodayAgendaComponent } from './today-agenda/today-agenda.component';
import { RecentActivityComponent } from './recent-activity/recent-activity.component';
import { QuickLinksComponent } from './quick-links/quick-links.component';

@Component({
  selector: 'app-teacher-dashboard-page',
  standalone: true,
  imports: [NgIf, KpiStripComponent, TodayAgendaComponent, RecentActivityComponent, QuickLinksComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage {}
