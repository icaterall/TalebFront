import { Component, HostListener, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { TeacherHeaderComponent } from '../teacher-header/teacher-header.component';
import { TeacherSidebarComponent } from '../teacher-sidebar/teacher-sidebar.component';

@Component({
  selector: 'app-teacher-shell',
  standalone: true,
  imports: [RouterOutlet, NgClass, NgIf, TeacherHeaderComponent, TeacherSidebarComponent],
  templateUrl: './teacher-shell.component.html',
  styleUrls: ['./teacher-shell.component.scss'],
})
export class TeacherShellComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mobileBreakpoint = 992;

  menuOpen = false;
  isMobile = false;

  get showSidebar(): boolean {
    return !this.isMobile || this.menuOpen;
  }

  get showBackdrop(): boolean {
    return this.isMobile && this.menuOpen;
  }

  ngOnInit(): void {
    this.updateIsMobile();
  }

  ngAfterViewInit(): void {
    // Double-check mobile detection after view is initialized
    setTimeout(() => {
      this.updateIsMobile();
    }, 0);
  }

  ngOnDestroy(): void {
    this.lockScroll(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateIsMobile();
  }

  private updateIsMobile(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= this.mobileBreakpoint;
    console.log('Mobile detection:', {
      width: window.innerWidth,
      breakpoint: this.mobileBreakpoint,
      isMobile: this.isMobile,
      wasMobile
    });
    
    if (!this.isMobile) {
      this.menuOpen = false;
      this.lockScroll(false);
    }

    if (wasMobile !== this.isMobile && this.isMobile) {
      this.lockScroll(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen && this.isMobile) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.lockScroll(this.showBackdrop);
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.lockScroll(false);
  }

  private lockScroll(lock: boolean): void {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }
}
