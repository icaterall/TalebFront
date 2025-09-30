import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private resizeObserver?: ResizeObserver;

  get currentLang(): Lang {
    return this.i18n.current;
  }

  async setLang(next: Lang) {
    await this.i18n.setLang(next);
  }

  goBack() {
    this.router.navigate(['/choose-account-type']);
  }

  ngOnInit() {
    this.observeHeaderHeight();
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private observeHeaderHeight() {
    // Wait for header to be available
    setTimeout(() => {
      const header = document.querySelector('app-header') as HTMLElement;
      const dashboardPage = document.querySelector('.teacher-dashboard-page') as HTMLElement;
      
      if (header && dashboardPage) {
        this.resizeObserver = new ResizeObserver(() => {
          const headerHeight = header.offsetHeight;
          dashboardPage.style.setProperty('--header-h', `${headerHeight}px`);
        });
        
        this.resizeObserver.observe(header);
        
        // Set initial height
        const initialHeight = header.offsetHeight;
        dashboardPage.style.setProperty('--header-h', `${initialHeight}px`);
      }
    }, 100);
  }
}
