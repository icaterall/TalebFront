import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

interface QuickLink {
  label: string;
  description: string;
  icon?: string;
}

@Component({
  selector: 'app-quick-links',
  standalone: true,
  imports: [NgFor],
  templateUrl: './quick-links.component.html',
  styleUrls: ['./quick-links.component.scss'],
})
export class QuickLinksComponent {
  links: QuickLink[] = [
    { label: 'Create a slido', description: 'Launch polls and Q&A instantly.' },
    { label: 'Import from PowerPoint', description: 'Bring slides into your session.' },
    { label: 'Go live now', description: 'Start a live event with your class.' },
  ];
}
