import { Component, HostListener, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { StudentHeaderComponent } from '../student-header/student-header.component';
import { StudentSidebarComponent } from '../student-sidebar/student-sidebar.component';

@Component({
  selector: 'app-student-shell',
  standalone: true,
  imports: [RouterOutlet, NgClass, NgIf, StudentHeaderComponent, StudentSidebarComponent],
  templateUrl: './student-shell.component.html',
  styleUrls: ['./student-shell.component.scss'],
})
export class StudentShellComponent implements OnInit, AfterViewInit, OnDestroy {
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
    this.checkScreenSize();
  }

  ngAfterViewInit(): void {
    // Any initialization after view is ready
  }

  ngOnDestroy(): void {
    // Cleanup if needed
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
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
