import { Component } from '@angular/core';
import { NgClass, NgFor, TitleCasePipe } from '@angular/common';

interface AgendaItem {
  time: string;
  title: string;
  status: 'upcoming' | 'in-progress' | 'completed';
}

@Component({
  selector: 'app-today-agenda',
  standalone: true,
  imports: [NgFor, NgClass, TitleCasePipe],
  templateUrl: './today-agenda.component.html',
  styleUrls: ['./today-agenda.component.scss'],
})
export class TodayAgendaComponent {
  items: AgendaItem[] = [
    { time: '08:30', title: 'Homeroom check-in', status: 'completed' },
    { time: '10:00', title: 'Geometry Live Session', status: 'in-progress' },
    { time: '12:15', title: 'Assignment review', status: 'upcoming' },
    { time: '15:30', title: 'Parent follow-ups', status: 'upcoming' },
  ];
}
