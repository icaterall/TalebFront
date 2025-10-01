import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { SidebarService } from '../../core/services/sidebar.service';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-teacher-dashboard-new',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './teacher-dashboard-new.component.html',
  styleUrls: ['./teacher-dashboard-new.component.scss']
})
export class TeacherDashboardNewComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly sidebarService = inject(SidebarService);
  
  isSidebarOpen = true; // Default to open

  get currentLang(): Lang {
    return this.i18n.current;
  }

  async setLang(next: Lang) {
    await this.i18n.setLang(next);
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  goBack() {
    this.router.navigate(['/choose-account-type']);
  }
}
