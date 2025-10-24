import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OutlookMode = 'mail' | 'calendar' | 'people';

@Component({
  selector: 'app-outlook-main-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outlook-main-content.component.html',
  styleUrls: ['./outlook-main-content.component.scss']
})
export class OutlookMainContentComponent {
  @Input() currentMode: OutlookMode = 'mail';
  @Input() currentQuestion: number = 1;

  getBackgroundImage(): string {
    // Return the same background image as in the screenshot
    return 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 800\'%3E%3Cdefs%3E%3ClinearGradient id=\'sky\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' style=\'stop-color:%23e3f2fd;stop-opacity:1\' /%3E%3Cstop offset=\'100%25\' style=\'stop-color:%23bbdefb;stop-opacity:1\' /%3E%3C/linearGradient%3E%3ClinearGradient id=\'mountains\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' style=\'stop-color:%23f5f5f5;stop-opacity:1\' /%3E%3Cstop offset=\'100%25\' style=\'stop-color:%23e0e0e0;stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=\'1200\' height=\'800\' fill=\'url(%23sky)\'/%3E%3Cpath d=\'M0,600 Q200,500 400,550 T800,520 T1200,580 L1200,800 L0,800 Z\' fill=\'url(%23mountains)\'/%3E%3Cpath d=\'M0,650 Q300,580 600,620 T1200,600 L1200,800 L0,800 Z\' fill=\'%23d0d0d0\'/%3E%3C/svg%3E")';
  }
}
