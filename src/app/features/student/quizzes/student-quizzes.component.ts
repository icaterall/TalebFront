import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-student-quizzes',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="student-quizzes">
      <div class="page-header">
        <h1>{{ 'student.quizzes.title' | translate }}</h1>
        <p>{{ 'student.quizzes.subtitle' | translate }}</p>
      </div>
      
      <div class="quizzes-content">
        <div class="empty-state">
          <div class="empty-icon">🧠</div>
          <h3>{{ 'student.quizzes.empty.title' | translate }}</h3>
          <p>{{ 'student.quizzes.empty.description' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .student-quizzes { padding: 24px; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
    .page-header p { color: #64748b; margin: 0; }
    .empty-state { text-align: center; padding: 64px 32px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
    .empty-state p { color: #64748b; margin: 0; }
  `]
})
export class StudentQuizzesComponent implements OnInit {
  ngOnInit(): void {}
}
