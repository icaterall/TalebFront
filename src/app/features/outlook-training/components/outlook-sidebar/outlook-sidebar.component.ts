import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OutlookMode = 'mail' | 'calendar' | 'people';

@Component({
  selector: 'app-outlook-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outlook-sidebar.component.html',
  styleUrls: ['./outlook-sidebar.component.scss']
})
export class OutlookSidebarComponent {
  @Input() currentMode: OutlookMode = 'mail';
  @Output() modeChange = new EventEmitter<OutlookMode>();

  apps = [
    {
      id: 'mail',
      name: 'Mail',
      icon: 'mail',
      isActive: true
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: 'calendar',
      isActive: false
    },
    {
      id: 'people',
      name: 'People',
      icon: 'people',
      isActive: false
    }
  ];

  onAppClick(appId: string): void {
    this.modeChange.emit(appId as OutlookMode);
  }
}
