import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

interface ActivityItem {
  actor: string;
  action: string;
  time: string;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [NgFor],
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss'],
})
export class RecentActivityComponent {
  items: ActivityItem[] = [
    { actor: 'Samira A.', action: 'submitted Quiz 5', time: '5m ago' },
    { actor: 'Grade 10B', action: 'joined Live Q&A', time: '30m ago' },
    { actor: 'Hassan K.', action: 'requested feedback', time: '1h ago' },
    { actor: 'Team teachers', action: 'shared resource pack', time: '3h ago' },
  ];
}
