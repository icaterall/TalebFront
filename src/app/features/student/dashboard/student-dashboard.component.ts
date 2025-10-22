import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { AuthService, User } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { HeaderComponent } from '../../../shared/header/header.component';
import { FooterComponent } from '../../../shared/footer/footer.component';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, HeaderComponent, FooterComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  user: User | null = null;
  loading = false;

  // Dashboard data
  stats = {
    totalCourses: 0,
    activeCourses: 0,
    completedLessons: 0,
    totalPoints: 0
  };

  recentActivities = [
    {
      id: 1,
      type: 'lesson_completed',
      title: 'Mathematics - Algebra Basics',
      description: 'Completed lesson on linear equations',
      timestamp: new Date(),
      points: 50
    },
    {
      id: 2,
      type: 'quiz_completed',
      title: 'Science Quiz - Physics',
      description: 'Scored 85% on physics quiz',
      timestamp: new Date(Date.now() - 86400000),
      points: 30
    },
    {
      id: 3,
      type: 'assignment_submitted',
      title: 'English Essay',
      description: 'Submitted essay on climate change',
      timestamp: new Date(Date.now() - 172800000),
      points: 25
    }
  ];

  upcomingEvents = [
    {
      id: 1,
      title: 'Mathematics Class',
      time: '10:00 AM',
      date: 'Today',
      type: 'class'
    },
    {
      id: 2,
      title: 'Science Quiz',
      time: '2:00 PM',
      date: 'Tomorrow',
      type: 'quiz'
    },
    {
      id: 3,
      title: 'English Assignment Due',
      time: '11:59 PM',
      date: 'Friday',
      type: 'assignment'
    }
  ];

  quickActions = [
    {
      id: 'join-class',
      title: 'Join Live Class',
      description: 'Attend your scheduled classes',
      icon: '🎓',
      color: '#667eea'
    },
    {
      id: 'view-assignments',
      title: 'View Assignments',
      description: 'Check your pending assignments',
      icon: '📝',
      color: '#f093fb'
    },
    {
      id: 'take-quiz',
      title: 'Take Quiz',
      description: 'Complete available quizzes',
      icon: '🧠',
      color: '#4facfe'
    },
    {
      id: 'view-progress',
      title: 'View Progress',
      description: 'Track your learning progress',
      icon: '📊',
      color: '#43e97b'
    }
  ];

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    
    if (!this.user) {
      this.toastr.error('Please login first');
      this.router.navigate(['/']);
      return;
    }

    if (this.user.role !== 'Student') {
      this.toastr.error('This page is for students only');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.stats = {
        totalCourses: 5,
        activeCourses: 3,
        completedLessons: 12,
        totalPoints: 1250
      };
      this.loading = false;
    }, 1000);
  }

  get currentLang(): 'ar' | 'en' {
    return this.i18n.current;
  }

  get userName(): string {
    return (this.user?.name || this.user?.email || '').toString();
  }

  onQuickAction(actionId: string): void {
    switch (actionId) {
      case 'join-class':
        this.toastr.info('Joining live class...');
        // TODO: Implement join class functionality
        break;
      case 'view-assignments':
        this.toastr.info('Loading assignments...');
        // TODO: Navigate to assignments page
        break;
      case 'take-quiz':
        this.toastr.info('Loading available quizzes...');
        // TODO: Navigate to quizzes page
        break;
      case 'view-progress':
        this.toastr.info('Loading progress...');
        // TODO: Navigate to progress page
        break;
      default:
        this.toastr.info('Feature coming soon!');
    }
  }

  onViewAllActivities(): void {
    this.toastr.info('Loading all activities...');
    // TODO: Navigate to activities page
  }

  onViewAllEvents(): void {
    this.toastr.info('Loading all events...');
    // TODO: Navigate to events/calendar page
  }

  onUpdateProfile(): void {
    this.router.navigate(['/student/profile']);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'lesson_completed':
        return '✅';
      case 'quiz_completed':
        return '🧠';
      case 'assignment_submitted':
        return '📝';
      default:
        return '📚';
    }
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'class':
        return '🎓';
      case 'quiz':
        return '🧠';
      case 'assignment':
        return '📝';
      default:
        return '📅';
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return this.currentLang === 'ar' ? 'اليوم' : 'Today';
    } else if (days === 1) {
      return this.currentLang === 'ar' ? 'أمس' : 'Yesterday';
    } else if (days < 7) {
      return this.currentLang === 'ar' ? `منذ ${days} أيام` : `${days} days ago`;
    } else {
      return timestamp.toLocaleDateString(this.currentLang === 'ar' ? 'ar-SA' : 'en-US');
    }
  }
}
