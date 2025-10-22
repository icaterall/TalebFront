import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-student-calendar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="student-calendar">
      <div class="page-header">
        <h1>{{ 'student.calendar.title' | translate }}</h1>
        <p>{{ 'student.calendar.subtitle' | translate }}</p>
      </div>
      
      <div class="calendar-content">
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>{{ 'student.calendar.empty.title' | translate }}</h3>
          <p>{{ 'student.calendar.empty.description' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .student-calendar { padding: 24px; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
    .page-header p { color: #64748b; margin: 0; }
    .empty-state { text-align: center; padding: 64px 32px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
    .empty-state p { color: #64748b; margin: 0; }
  `]
})
export class StudentCalendarComponent implements OnInit {
  ngOnInit(): void {}
}
