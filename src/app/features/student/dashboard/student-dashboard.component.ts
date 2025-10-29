import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { RecommendationsService, Recommendation } from '../../../core/services/recommendations.service';
import { AIIntroService, AIIntroPack } from '../../../core/services/ai-intro.service';
import { GeographyService } from '../../../core/services/geography.service';
import { EducationService } from '../../../core/services/education.service';

import { AuthService, User } from '../../../core/services/auth.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly recommendationsService = inject(RecommendationsService);
  private readonly aiIntroService = inject(AIIntroService);
  private readonly geographyService = inject(GeographyService);
  private readonly educationService = inject(EducationService);

  user: User | null = null;
  loading = false;
  isBrowser = typeof window !== 'undefined';

  // First-run CTA state
  showJoinClassModal = false;
  classCodeInput = '';
  recommendations: Recommendation[] = [];
  aiIntroPack: AIIntroPack | null = null;
  loadingStartNow = false;
  hasEnrollments = false;

  // Localized labels pulled from backend
  localizedCountryName: string | null = null;
  localizedStageName: string | null = null;

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
    
    // Universal authentication and role validation
    if (!this.universalAuth.validateAccess('Student')) {
      return; // Validation failed, user will be redirected automatically
    }

    this.user = this.universalAuth.getCurrentUser();
    this.loadDashboardData();
    this.loadStartNowData();
    this.loadLocalizedProfileBits();
  }

  private loadDashboardData(): void {
    this.loading = false;
  }

  private loadStartNowData(): void {
    if (!this.user) return;
    const profile = this.user;
    // Guard: need minimal fields
    const countryId = (profile as any)?.country_id || 1;
    const stageId = (profile as any)?.education_stage_id ?? (profile as any)?.stage_id ?? null;
    const stateId = (profile as any)?.state_id;
    const locale = this.currentLang;

    this.loadingStartNow = true;
    this.recommendationsService.getRecommendations({ country_id: countryId, state_id: stateId, stage_id: stageId || 0, locale, limit: 3 })
      .subscribe({
        next: (res) => {
          this.recommendations = res?.recommendations || [];
          if (!this.recommendations.length) {
            this.aiIntroService.generateIntroPack({ country_id: countryId, state_id: stateId, stage_id: stageId || 0, locale })
              .subscribe({
                next: (ai) => {
                  this.aiIntroPack = ai?.lesson || null;
                  this.loadingStartNow = false;
                },
                error: () => {
                  this.loadingStartNow = false;
                }
              });
          } else {
            this.loadingStartNow = false;
          }
        },
        error: () => {
          this.loadingStartNow = false;
        }
      });
  }

  private loadLocalizedProfileBits(): void {
    const user = this.user as any;
    const countryId: number | undefined = user?.country_id;
    const stageId: number | undefined = user?.education_stage_id ?? user?.stage_id;

    if (countryId) {
      this.geographyService.getCountries().subscribe({
        next: (res) => {
          const match = (res?.countries || []).find(c => c.id === countryId);
          if (match?.name) this.localizedCountryName = match.name;
        },
        error: () => {}
      });
    }

    if (stageId) {
      this.educationService.getAllStages().subscribe({
        next: (res) => {
          const match = (res?.stages || []).find(s => s.id === stageId);
          if (match?.name) {
            this.localizedStageName = match.name;
          } else {
            this.localizedStageName = null;
          }
        },
        error: () => {}
      });
    }
  }

  get currentLang(): 'ar' | 'en' {
    return this.i18n.current;
  }

  get displayLang(): string {
    return this.currentLang === 'ar' ? 'العربية' : 'English';
  }

  get userName(): string {
    return (this.user?.name || this.user?.email || '').toString();
  }

  get countryName(): string {
    if (this.localizedCountryName) return this.localizedCountryName;
    const c = (this.user as any)?.country_name;
    if (typeof c === 'string' && c.trim()) return c;
    return this.currentLang === 'ar' ? 'الدولة' : 'Country';
  }

  get stageName(): string {
    if (this.localizedStageName) return this.localizedStageName;
    const s = (this.user as any)?.stage_name;
    if (typeof s === 'string' && s.trim()) return s;
    return this.currentLang === 'ar' ? 'غير محددة' : 'Not set';
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

  // Join class
  openJoinClass(): void {
    this.showJoinClassModal = true;
  }

  closeJoinClass(): void {
    this.showJoinClassModal = false;
    this.classCodeInput = '';
  }

  submitJoinClass(): void {
    if (!this.classCodeInput.trim()) {
      this.toastr.warning(this.currentLang === 'ar' ? 'أدخل رمز الصف' : 'Enter class code');
      return;
    }
    this.toastr.info(this.currentLang === 'ar' ? 'جارٍ الانضمام...' : 'Joining...');
    // TODO: Call backend join endpoint then navigate to courses
    this.closeJoinClass();
  }

  startNow(): void {
    if (this.recommendations.length) {
      // Navigate to first recommended lesson
      this.toastr.success(this.currentLang === 'ar' ? 'بدء الدرس الموصى به' : 'Starting recommended lesson');
      // TODO: navigate to lesson by recommendations[0].lesson_id
      return;
    }
    if (this.aiIntroPack) {
      this.toastr.success(this.currentLang === 'ar' ? 'بدء الدرس التمهيدي' : 'Starting intro pack');
      // TODO: navigate to lesson by aiIntroPack.lesson_id
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
    this.router.navigateByUrl('/student/profile');
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

  get userInitials(): string {
    if (!this.user?.name) return 'S';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  // Navigation methods
  onViewCourses(): void {
    this.router.navigateByUrl('/student/courses');
  }

  onViewActiveCourses(): void {
    this.router.navigateByUrl('/student/courses');
  }

  onViewProgress(): void {
    this.router.navigateByUrl('/student/grades');
  }

  onViewAchievements(): void {
    this.router.navigateByUrl('/student/grades');
  }

  onViewAssignments(): void {
    this.router.navigateByUrl('/student/assignments');
  }

  onViewQuizzes(): void {
    this.router.navigateByUrl('/student/quizzes');
  }

  onViewGrades(): void {
    this.router.navigateByUrl('/student/grades');
  }
}
