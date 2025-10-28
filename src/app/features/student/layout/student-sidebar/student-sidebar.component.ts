import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './student-sidebar.component.html',
  styleUrls: ['./student-sidebar.component.scss']
})
export class StudentSidebarComponent implements OnInit, OnDestroy {
  @Input() isMobile = false;
  @Input() menuOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);

  currentRoute = '';
  user: any = null;

  // Student navigation items
  navItems = [
    {
      id: 'dashboard',
      label: 'student.sidebar.dashboard',
      icon: '🏠',
      route: '/student/dashboard',
      active: false
    },
    {
      id: 'courses',
      label: 'student.sidebar.courses',
      icon: '📚',
      route: '/student/courses',
      active: false
    },
    {
      id: 'assignments',
      label: 'student.sidebar.assignments',
      icon: '📝',
      route: '/student/assignments',
      active: false
    },
    {
      id: 'quizzes',
      label: 'student.sidebar.quizzes',
      icon: '🧠',
      route: '/student/quizzes',
      active: false
    },
    {
      id: 'grades',
      label: 'student.sidebar.grades',
      icon: '📊',
      route: '/student/grades',
      active: false
    },
    {
      id: 'calendar',
      label: 'student.sidebar.calendar',
      icon: '📅',
      route: '/student/calendar',
      active: false
    },
    {
      id: 'library',
      label: 'student.sidebar.library',
      icon: '📖',
      route: '/student/library',
      active: false
    },
    {
      id: 'profile',
      label: 'student.sidebar.profile',
      icon: '👤',
      route: '/student/profile',
      active: false
    }
  ];

  get userName(): string {
    return this.user?.name || this.user?.email || 'Student';
  }

  get userRole(): string {
    return this.user?.role || 'Student';
  }

  ngOnInit(): void {
    // Get user data from auth service
    this.user = this.authService.getCurrentUser();
    
    // Note: Authentication validation is handled by parent components
    // This component is used within authenticated routes only
    this.updateActiveRoute();
    
    // Listen for route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateActiveRoute();
      });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private updateActiveRoute(): void {
    this.navItems.forEach(item => {
      item.active = this.currentRoute === item.route || 
                   (item.route !== '/student/dashboard' && this.currentRoute.startsWith(item.route));
    });
  }

  onNavigate(route: string): void {
    this.router.navigateByUrl(route);
    
    // Close mobile menu after navigation
    if (this.isMobile) {
      this.closeMenu.emit();
    }
  }

  getTranslation(key: string): string {
    return this.translate.instant(key);
  }
}
