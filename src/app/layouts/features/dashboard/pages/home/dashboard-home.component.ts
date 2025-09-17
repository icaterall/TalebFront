import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHomeComponent {
  stats = [
    { label: 'Active Students', value: 1280 },
    { label: 'Courses', value: 42 },
    { label: 'Avg. Progress', value: '73%' }
  ];
}
