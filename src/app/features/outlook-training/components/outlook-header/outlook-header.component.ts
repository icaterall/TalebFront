import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type OutlookMode = 'mail' | 'calendar' | 'people';

@Component({
  selector: 'app-outlook-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outlook-header.component.html',
  styleUrls: ['./outlook-header.component.scss']
})
export class OutlookHeaderComponent {
  @Input() currentMode: OutlookMode = 'mail';
  @Input() unreadCount: number = 0;
  @Output() modeChange = new EventEmitter<OutlookMode>();

  searchQuery: string = '';

  onModeChange(mode: OutlookMode): void {
    this.modeChange.emit(mode);
  }

  onSearch(): void {
    // Handle search functionality
    console.log('Searching for:', this.searchQuery);
  }

  onNewMail(): void {
    // Handle new mail creation
    console.log('Creating new mail');
  }

  onSettings(): void {
    // Handle settings
    console.log('Opening settings');
  }

  onNotifications(): void {
    // Handle notifications
    console.log('Opening notifications');
  }
}
