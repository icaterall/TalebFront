import { Component, HostListener, OnDestroy, OnInit, AfterViewInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { StudentHeaderComponent } from '../student-header/student-header.component';
import { StudentSidebarComponent } from '../student-sidebar/student-sidebar.component';
import { UniversalAuthService } from '../../../../core/services/universal-auth.service';

@Component({
  selector: 'app-student-shell',
  standalone: true,
  imports: [RouterOutlet, NgClass, NgIf, StudentHeaderComponent, StudentSidebarComponent],
  templateUrl: './student-shell.component.html',
  styleUrls: ['./student-shell.component.scss'],
})
export class StudentShellComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mobileBreakpoint = 992;
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly router = inject(Router);

  menuOpen = false;
  isMobile = false;
  isCoursePreviewRoute = false;

  get showSidebar(): boolean {
    if (this.isCoursePreviewRoute) {
      return false;
    }
    // Always show student sidebar when menu is open (even on course preview route)
    return !this.isMobile || this.menuOpen;
  }

  get showBackdrop(): boolean {
    if (this.isCoursePreviewRoute) {
      return false;
    }
    return this.isMobile && this.menuOpen;
  }

  ngOnInit(): void {
    
    // Universal authentication and role validation
    if (!this.universalAuth.validateAccess('Student')) {
      return; // Validation failed, user will be redirected automatically
    }

    // Check if we're on course preview route
    this.checkRoute();
    
    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkRoute();
      });

    this.checkScreenSize();
    this.updateBodyScrollLock();
  }

  private checkRoute(): void {
    const url = this.router.url;
    const wasPreview = this.isCoursePreviewRoute;
    this.isCoursePreviewRoute = url.includes('/course-preview') || url.includes('/preview');
    if (this.isCoursePreviewRoute && !wasPreview) {
      this.menuOpen = false;
      this.updateBodyScrollLock();
    }
  }

  ngAfterViewInit(): void {
    // Any initialization after view is ready
  }

  ngOnDestroy(): void {
    // Ensure body scroll is re-enabled on destroy
    document.body.classList.remove('no-scroll');
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < this.mobileBreakpoint;
    
    // Close menu on mobile when screen becomes larger
    if (!this.isMobile) {
      this.menuOpen = false;
    }
    this.updateBodyScrollLock();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.updateBodyScrollLock();
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.updateBodyScrollLock();
  }

  private updateBodyScrollLock(): void {
    const shouldLock = !this.isCoursePreviewRoute && this.isMobile && this.menuOpen;
    if (shouldLock) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }
}
