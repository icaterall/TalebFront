import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { OutlookHeaderComponent } from './components/outlook-header/outlook-header.component';
import { OutlookSidebarComponent } from './components/outlook-sidebar/outlook-sidebar.component';
import { OutlookMainContentComponent } from './components/outlook-main-content/outlook-main-content.component';
import { OutlookEmailListComponent } from './components/outlook-email-list/outlook-email-list.component';
import { OutlookQuestionsSidebarComponent } from './components/outlook-questions-sidebar/outlook-questions-sidebar.component';

export type OutlookMode = 'mail' | 'calendar' | 'people';

export interface Question {
  id: number;
  title: string;
  description: string;
  points: number;
  status: 'unvisited' | 'visited' | 'answered' | 'flagged' | 'current';
  isMarked: boolean;
  isAnswered: boolean;
}

@Component({
  selector: 'app-outlook-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    OutlookHeaderComponent,
    OutlookSidebarComponent,
    OutlookMainContentComponent,
    OutlookEmailListComponent,
    OutlookQuestionsSidebarComponent
  ],
  templateUrl: './outlook-training.component.html',
  styleUrls: ['./outlook-training.component.scss']
})
export class OutlookTrainingComponent implements OnInit {
  currentMode: OutlookMode = 'mail';
  isQuestionsSidebarOpen = true;
  currentQuestion = 1;
  totalQuestions = 5;

  // Sample email data
  emails = [
    {
      id: 1,
      sender: 'Al Anoud ALYazeedi',
      initials: 'AA',
      subject: 'Meeting Minutes - Project Review',
      preview: 'Hi team, please find attached the meeting minutes from our project review session...',
      time: 'Thu 3:20 AM',
      isRead: false,
      hasAttachment: true,
      isImportant: false,
      category: 'work'
    },
    {
      id: 2,
      sender: 'HR Announcement',
      initials: 'HA',
      subject: 'Company Policy Update',
      preview: 'Dear all, we have updated our company policies. Please review the attached document...',
      time: 'Wed 11:48 PM',
      isRead: true,
      hasAttachment: false,
      isImportant: true,
      category: 'announcement'
    },
    {
      id: 3,
      sender: 'Arwa Al-Busaidi',
      initials: 'AB',
      subject: 'Project Status Report',
      preview: 'Here is the weekly status report for our ongoing projects...',
      time: 'Wed 2:30 PM',
      isRead: false,
      hasAttachment: true,
      isImportant: true,
      category: 'work'
    }
  ];

  questions: Question[] = [
    {
      id: 1,
      title: 'Create a Professional Email Signature',
      description: 'Set up your email signature with name, title, and contact information',
      points: 25,
      status: 'current' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 2,
      title: 'Compose and Send an Email',
      description: 'Write and send a professional email to your team',
      points: 20,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 3,
      title: 'Schedule a Meeting',
      description: 'Create a calendar event and invite attendees',
      points: 30,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 4,
      title: 'Organize Your Inbox',
      description: 'Use folders and categories to organize your emails',
      points: 15,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 5,
      title: 'Set Up Email Rules',
      description: 'Create rules to automatically organize incoming emails',
      points: 10,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 6,
      title: 'Manage Calendar Events',
      description: 'Edit and update existing calendar appointments',
      points: 20,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 7,
      title: 'Create Contact Groups',
      description: 'Organize contacts into groups for easy email distribution',
      points: 15,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 8,
      title: 'Set Up Out of Office',
      description: 'Configure automatic replies for when you are away',
      points: 10,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 9,
      title: 'Use Search and Filters',
      description: 'Find specific emails using advanced search features',
      points: 15,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 10,
      title: 'Manage Attachments',
      description: 'Attach files and manage email attachments properly',
      points: 20,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 11,
      title: 'Create Email Templates',
      description: 'Save and reuse common email formats',
      points: 25,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 12,
      title: 'Set Up Email Forwarding',
      description: 'Configure email forwarding to other accounts',
      points: 15,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    },
    {
      id: 13,
      title: 'Use Keyboard Shortcuts',
      description: 'Master essential keyboard shortcuts for efficiency',
      points: 10,
      status: 'unvisited' as const,
      isMarked: false,
      isAnswered: false
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Initialize Outlook training interface
  }

  switchMode(mode: OutlookMode): void {
    this.currentMode = mode;
  }

  toggleQuestionsSidebar(): void {
    this.isQuestionsSidebarOpen = !this.isQuestionsSidebarOpen;
  }

  selectQuestion(questionId: number): void {
    this.currentQuestion = questionId;
  }

  onQuestionSelect(questionId: number): void {
    // Update current question
    this.currentQuestion = questionId;
    
    // Update question statuses
    this.questions.forEach(q => {
      if (q.id === questionId) {
        q.status = 'current';
      } else if (q.status === 'current') {
        q.status = 'visited' as const;
      }
    });
  }

  onMarkQuestion(questionId: number): void {
    const question = this.questions.find(q => q.id === questionId);
    if (question) {
      question.isMarked = !question.isMarked;
      question.status = question.isMarked ? ('flagged' as const) : ('visited' as const);
    }
  }

  onNextQuestion(): void {
    // Mark current question as visited
    const currentQ = this.questions.find(q => q.id === this.currentQuestion);
    if (currentQ) {
      currentQ.status = 'visited' as const;
    }
    
    // Find next unvisited question
    const nextQuestion = this.questions.find(q => q.status === 'unvisited');
    if (nextQuestion) {
      this.currentQuestion = nextQuestion.id;
      nextQuestion.status = 'current' as const;
    }
  }

  markQuestionCompleted(questionId: number): void {
    const question = this.questions.find(q => q.id === questionId);
    if (question) {
      question.isAnswered = true;
      question.status = 'answered' as const;
    }
  }

  getUnreadCount(): number {
    return this.emails.filter(email => !email.isRead).length;
  }

  getTotalPoints(): number {
    return this.questions.reduce((total, question) => total + question.points, 0);
  }

  getCompletedPoints(): number {
    return this.questions
      .filter(question => question.isAnswered)
      .reduce((total, question) => total + question.points, 0);
  }
}
