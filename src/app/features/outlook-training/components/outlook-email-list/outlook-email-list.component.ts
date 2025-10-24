import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Email {
  id: number;
  sender: string;
  initials: string;
  subject: string;
  preview: string;
  time: string;
  isRead: boolean;
  hasAttachment: boolean;
  isImportant: boolean;
  category: string;
}

@Component({
  selector: 'app-outlook-email-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outlook-email-list.component.html',
  styleUrls: ['./outlook-email-list.component.scss']
})
export class OutlookEmailListComponent {
  @Input() emails: Email[] = [];

  selectedEmailId: number | null = null;

  onEmailSelect(emailId: number): void {
    this.selectedEmailId = emailId;
  }

  getUnreadCount(): number {
    return this.emails.filter(email => !email.isRead).length;
  }
}
