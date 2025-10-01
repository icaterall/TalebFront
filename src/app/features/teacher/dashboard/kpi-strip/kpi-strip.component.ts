import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

interface KPI {
  label: string;
  value: string;
  delta?: string;
}

@Component({
  selector: 'app-kpi-strip',
  standalone: true,
  imports: [NgFor],
  templateUrl: './kpi-strip.component.html',
  styleUrls: ['./kpi-strip.component.scss'],
})
export class KpiStripComponent {
  kpis: KPI[] = [
    { label: 'Active classes', value: '12', delta: '+2' },
    { label: 'Students engaged', value: '328', delta: '+18' },
    { label: 'Assignments due', value: '4', delta: '2 today' },
    { label: 'Unread messages', value: '6' },
  ];
}
