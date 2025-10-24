import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-outlook-questions-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outlook-questions-sidebar.component.html',
  styleUrls: ['./outlook-questions-sidebar.component.scss']
})
export class OutlookQuestionsSidebarComponent {
  @Input() isOpen: boolean = true;
  @Input() questions: Question[] = [];
  @Input() currentQuestion: number = 1;
  @Input() totalPoints: number = 0;
  @Input() completedPoints: number = 0;
  @Output() questionSelect = new EventEmitter<number>();
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() markQuestion = new EventEmitter<number>();
  @Output() nextQuestion = new EventEmitter<void>();

  selectedQuestion: Question | null = null;
  showQuestionDetails = false;

  onQuestionClick(questionId: number): void {
    this.selectedQuestion = this.questions.find(q => q.id === questionId) || null;
    this.showQuestionDetails = true;
    this.questionSelect.emit(questionId);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onMarkQuestion(questionId: number): void {
    this.markQuestion.emit(questionId);
  }

  onNextQuestion(): void {
    this.nextQuestion.emit();
    this.showQuestionDetails = false;
    this.selectedQuestion = null;
  }

  onCloseQuestionDetails(): void {
    this.showQuestionDetails = false;
    this.selectedQuestion = null;
  }

  getProgressPercentage(): number {
    if (this.totalPoints === 0) return 0;
    return Math.round((this.completedPoints / this.totalPoints) * 100);
  }

  getQuestionStatusClass(question: Question): string {
    const classes = ['question-box'];
    
    if (question.status === 'current') {
      classes.push('current');
    } else if (question.status === 'answered') {
      classes.push('answered');
    } else if (question.status === 'flagged') {
      classes.push('flagged');
    } else if (question.status === 'visited') {
      classes.push('visited');
    } else {
      classes.push('unvisited');
    }
    
    if (question.isMarked) {
      classes.push('marked');
    }
    
    return classes.join(' ');
  }
}
