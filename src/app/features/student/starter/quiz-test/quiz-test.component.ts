import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AiBuilderService, QuizQuestion, QuizSubmitResponse } from '../../../../core/services/ai-builder.service';
import { I18nService } from '../../../../core/services/i18n.service';
import { Subscription } from 'rxjs';

interface QuizAnswer {
  questionId: number;
  answer: any; // Can be index, boolean, array, etc. depending on question type
  isCorrect?: boolean; // Set by backend after submission
}

@Component({
  selector: 'app-quiz-test',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './quiz-test.component.html',
  styleUrls: ['./quiz-test.component.scss']
})
export class QuizTestComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ai = inject(AiBuilderService);
  private i18n = inject(I18nService);
  protected cdr = inject(ChangeDetectorRef);
  private languageSubscription?: Subscription;

  quizId: string | null = null;
  sectionId: string | null = null;
  quizTitle: string = '';
  quizQuestions: QuizQuestion[] = [];
  quizSettings: any = {};
  currentQuestionIndex: number = 0;
  answers: Map<number, QuizAnswer> = new Map();
  shuffleMaps: Map<number, number[]> = new Map(); // Store MCQ choice shuffle maps
  showResults: boolean = false;
  score: number = 0;
  totalScore: number = 0;
  loading: boolean = true;
  currentLang: 'ar' | 'en' = 'en';
  timeLimit: number | null = null; // Time limit in minutes
  timeRemaining: number = 0; // Time remaining in seconds
  timerInterval: any = null;
  isTimeUp: boolean = false;
  draggedOptionIndex: number | null = null; // Track which option is being dragged
  dragOverIndex: number | null = null; // Track which drop zone is being hovered
  submittingQuiz: boolean = false; // Track quiz submission state
  orderingDragIndex: number | null = null; // Track which ordering item is being dragged
  orderingDragOverIndex: number | null = null; // Track which ordering position is being hovered

  get lang(): 'ar' | 'en' {
    return this.currentLang;
  }

  get currentQuestion(): QuizQuestion | null {
    return this.quizQuestions[this.currentQuestionIndex] || null;
  }

  get progress(): number {
    return this.quizQuestions.length > 0 
      ? Math.round(((this.currentQuestionIndex + 1) / this.quizQuestions.length) * 100)
      : 0;
  }

  get answeredCount(): number {
    return this.answers.size;
  }

  ngOnInit(): void {
    // Initialize language from I18nService
    this.currentLang = this.i18n.current;
    
    // Subscribe to language changes
    this.languageSubscription = this.i18n.lang$.subscribe(lang => {
      this.currentLang = lang;
      this.cdr.detectChanges();
    });

    this.route.queryParams.subscribe(params => {
      this.quizId = params['quizId'] || null;
      this.sectionId = params['sectionId'] || null;
      
      if (this.quizId && this.sectionId) {
        this.loadQuiz();
      } else {
        this.router.navigate(['/student/starter']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadQuiz(): void {
    if (!this.quizId || !this.sectionId) return;

    const sectionIdNum = Number(this.sectionId);
    const quizIdNum = Number(this.quizId);

    if (isNaN(sectionIdNum) || isNaN(quizIdNum)) {
      this.router.navigate(['/student/starter']);
      return;
    }

    this.loading = true;

    // Load quiz questions (already shuffled by backend)
    this.ai.getQuizQuestions(sectionIdNum, quizIdNum).subscribe({
      next: (response) => {
        this.quizQuestions = response.questions || []; // Backend already shuffles questions, MCQ choices, and matching pairs
        
        // Store shuffle maps for MCQ and Ordering questions (needed for answer validation)
        this.quizQuestions.forEach(question => {
          if (question.question_type === 'mcq' && question.payload?.choice_shuffle_map && question.id) {
            this.shuffleMaps.set(question.id, question.payload.choice_shuffle_map);
          } else if (question.question_type === 'ordering' && question.payload?.item_shuffle_map && question.id) {
            this.shuffleMaps.set(question.id, question.payload.item_shuffle_map);
          }
        });
        
        this.loading = false;

        // Load quiz metadata from section content
        this.loadQuizMetadata(sectionIdNum);
      },
      error: (error) => {
        console.error('Error loading quiz:', error);
        this.loading = false;
        this.router.navigate(['/student/starter']);
      }
    });
  }

  loadQuizMetadata(sectionId: number): void {
    this.ai.getSectionContent(sectionId).subscribe({
      next: (response) => {
        const quizContent = response?.content?.find((c: any) => String(c.id) === this.quizId);
        if (quizContent) {
          this.quizTitle = quizContent.title;
          this.quizSettings = quizContent.meta || {};
          this.totalScore = Number(this.quizSettings.full_score) || 0;
          this.timeLimit = this.quizSettings.time_limit ? Number(this.quizSettings.time_limit) : null;
          
          // Start or resume quiz attempt to get persistent timer
          if (this.timeLimit && this.timeLimit > 0) {
            this.startOrResumeQuizAttempt(sectionId);
          }
        }
      },
      error: (error) => {
        console.error('Error loading quiz metadata:', error);
      }
    });
  }

  startOrResumeQuizAttempt(sectionId: number): void {
    if (!this.quizId) return;
    
    const quizIdNum = Number(this.quizId);
    if (isNaN(quizIdNum)) return;

    // Try to get existing attempt first
    this.ai.getQuizAttempt(sectionId, quizIdNum).subscribe({
      next: (response) => {
        if (response.success && response.attempt) {
          // Resume existing attempt
          if (response.attempt.is_expired) {
            // Time is up, auto-submit
            this.handleTimeUp();
            return;
          }
          this.timeRemaining = response.attempt.remaining_seconds || 0;
          this.startTimer();
        } else {
          // No existing attempt, start new one
          this.startNewQuizAttempt(sectionId);
        }
      },
      error: (error) => {
        // If no attempt found (404), start a new one
        if (error.status === 404) {
          this.startNewQuizAttempt(sectionId);
        } else {
          console.error('Error getting quiz attempt:', error);
          // Fallback to local timer
          if (this.timeLimit && this.timeLimit > 0) {
            this.timeRemaining = this.timeLimit * 60;
            this.startTimer();
          }
        }
      }
    });
  }

  startNewQuizAttempt(sectionId: number): void {
    if (!this.quizId) return;
    
    const quizIdNum = Number(this.quizId);
    if (isNaN(quizIdNum)) return;

    this.ai.startQuizAttempt(sectionId, quizIdNum).subscribe({
      next: (response) => {
        if (response.success && response.attempt) {
          if (response.attempt.is_expired) {
            // Time is up (shouldn't happen on start, but handle it)
            this.handleTimeUp();
            return;
          }
          this.timeRemaining = response.attempt.remaining_seconds || 0;
          this.startTimer();
        }
      },
      error: (error) => {
        console.error('Error starting quiz attempt:', error);
        // Check if error is due to max attempts reached
        if (error.status === 403 && error.error?.message) {
          // Show error message and prevent quiz from starting
          alert(error.error.message); // TODO: Replace with toastr or better UI
          this.closeTest();
          return;
        }
        // Fallback to local timer
        if (this.timeLimit && this.timeLimit > 0) {
          this.timeRemaining = this.timeLimit * 60;
          this.startTimer();
        }
      }
    });
  }

  startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Sync with backend every 30 seconds to ensure accuracy
    let syncCounter = 0;
    
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        syncCounter++;
        
        // Sync with backend every 30 seconds
        if (syncCounter >= 30 && this.quizId && this.sectionId) {
          syncCounter = 0;
          this.syncTimerWithBackend();
        }
        
        this.cdr.detectChanges();
      } else {
        this.handleTimeUp();
      }
    }, 1000);
  }

  syncTimerWithBackend(): void {
    if (!this.quizId || !this.sectionId) return;
    
    const sectionIdNum = Number(this.sectionId);
    const quizIdNum = Number(this.quizId);
    if (isNaN(sectionIdNum) || isNaN(quizIdNum)) return;

    this.ai.getQuizAttempt(sectionIdNum, quizIdNum).subscribe({
      next: (response) => {
        if (response.success && response.attempt) {
          if (response.attempt.is_expired) {
            this.handleTimeUp();
            return;
          }
          // Update remaining time from backend
          this.timeRemaining = response.attempt.remaining_seconds || 0;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        // Silently fail - continue with local timer
        console.warn('Timer sync failed:', error);
      }
    });
  }

  handleTimeUp(): void {
    if (this.isTimeUp) return; // Prevent multiple submissions
    
    this.isTimeUp = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Auto-submit the quiz to backend (marks attempt as completed)
    this.submitQuiz();
  }

  getFormattedTime(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getTimeWarning(): boolean {
    // Show warning when less than 5 minutes remaining
    return this.timeRemaining > 0 && this.timeRemaining <= 300;
  }

  setAnswer(value: any): void {
    if (!this.currentQuestion) return;

    const answer: QuizAnswer = {
      questionId: this.currentQuestion.id!,
      answer: value
    };
    this.answers.set(this.currentQuestion.id!, answer);
  }

  getAnswer(questionId: number): any {
    return this.answers.get(questionId)?.answer;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.quizQuestions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.quizQuestions.length) {
      this.currentQuestionIndex = index;
    }
  }

  submitQuiz(): void {
    // Stop timer if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.answers.size < this.quizQuestions.length) {
      const confirmMessage = this.currentLang === 'ar' 
        ? 'لم تجب على جميع الأسئلة. هل تريد المتابعة؟'
        : 'You have not answered all questions. Do you want to continue?';
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // Convert answers Map to object for API
    const answersObject: Record<number, any> = {};
    this.answers.forEach((answer, questionId) => {
      answersObject[questionId] = answer.answer;
    });

    // Convert shuffle maps Map to object for API
    const shuffleMapsObject: Record<number, number[]> = {};
    this.shuffleMaps.forEach((map, questionId) => {
      shuffleMapsObject[questionId] = map;
    });

    // Submit to backend for validation
    if (!this.quizId || !this.sectionId) return;
    
    this.submittingQuiz = true;
    const sectionIdNum = Number(this.sectionId);
    const quizIdNum = Number(this.quizId);
    
    this.ai.submitQuiz(sectionIdNum, quizIdNum, answersObject, shuffleMapsObject).subscribe({
      next: (response) => {
        this.score = response.score;
        this.totalScore = response.totalScore;
        // Store question results for display
        const questionResultsMap = new Map<number, boolean>();
        response.questionResults.forEach(result => {
          questionResultsMap.set(result.questionId, result.isCorrect);
        });
        // Update answers with correctness info
        this.answers.forEach((answer, questionId) => {
          answer.isCorrect = questionResultsMap.get(questionId) || false;
        });
        this.showResults = true;
        this.submittingQuiz = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error submitting quiz:', error);
        // Fallback to local calculation if backend fails
        this.calculateScore();
        this.showResults = true;
        this.submittingQuiz = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateScore(): void {
    let totalPoints = 0;

    this.quizQuestions.forEach(question => {
      const userAnswer = this.answers.get(question.id!)?.answer;
      if (userAnswer === undefined || userAnswer === null) {
        return; // No answer, no points
      }

      let isCorrect = false;

      switch (question.question_type) {
        case 'mcq':
          // Backend already shuffled choices and updated correct_index, so compare directly
          isCorrect = userAnswer === question.payload?.correct_index;
          break;
        case 'true_false':
          isCorrect = userAnswer === question.payload.correct_answer;
          break;
        case 'matching':
          // Matching validation is done on backend
          // This is fallback only (shouldn't be used)
          isCorrect = false;
          break;
        case 'ordering':
          // For ordering, check if the order matches
          const userOrder = userAnswer as number[];
          const correctOrder = question.payload.correct_order as number[];
          if (userOrder && correctOrder && userOrder.length === correctOrder.length) {
            isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
          }
          break;
      }

      if (isCorrect) {
        totalPoints += question.points;
      }
    });

    this.score = Math.round(totalPoints * 100) / 100;
  }

  isQuestionAnswered(questionId: number): boolean {
    return this.answers.has(questionId);
  }

  isAnswerCorrect(question: QuizQuestion): boolean {
    // Use backend validation result if available
    const answer = this.answers.get(question.id!);
    if (answer?.isCorrect !== undefined) {
      return answer.isCorrect;
    }
    
    // Fallback to local calculation (shouldn't happen after submission)
    const userAnswer = answer?.answer;
    if (userAnswer === undefined || userAnswer === null) return false;

    switch (question.question_type) {
      case 'mcq':
        // Backend already shuffled choices and updated correct_index, so compare directly
        return userAnswer === question.payload?.correct_index;
      case 'true_false':
        return userAnswer === question.payload.correct_answer;
      case 'matching':
        // For matching, we can't validate locally without original_pairs
        // This should only be used as fallback
        return false;
      case 'ordering':
        const userOrder = userAnswer as number[];
        // For ordering, correct_order might not exist, so we check if items are in the order they appear (0, 1, 2...)
        const items = question.payload?.items;
        if (!items) return false;
        const correctOrder = question.payload.correct_order as number[] || 
          items.map((_: any, i: number) => i);
        if (userOrder && correctOrder && userOrder.length === correctOrder.length) {
          // Filter out -1 (unanswered items)
          const validUserOrder = userOrder.filter((o: number) => o >= 0);
          const validCorrectOrder = correctOrder.filter((o: number) => o >= 0);
          if (validUserOrder.length !== validCorrectOrder.length) return false;
          return JSON.stringify(validUserOrder) === JSON.stringify(validCorrectOrder);
        }
        return false;
      default:
        return false;
    }
  }

  getCorrectCount(): number {
    return this.quizQuestions.filter(q => this.isAnswerCorrect(q)).length;
  }

  getMatchingAnswer(questionId: number, questionIndex: number): number | string {
    const answer = this.answers.get(questionId)?.answer;
    if (!answer || !Array.isArray(answer)) return '';
    return answer[questionIndex]?.rightIndex ?? '';
  }

  setMatchingAnswer(questionId: number, questionIndex: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const rightIndex = parseInt(select.value);
    if (isNaN(rightIndex)) return;

    const question = this.quizQuestions.find(q => q.id === questionId);
    if (!question || !question.payload.leftItems || !question.payload.rightItems) return;

    const currentAnswer = this.answers.get(questionId)?.answer as Array<{ left: string; right: string; rightIndex: number }> || [];
    const leftItem = question.payload.leftItems[questionIndex];
    const rightItem = question.payload.rightItems[rightIndex];

    currentAnswer[questionIndex] = { left: leftItem, right: rightItem, rightIndex };
    this.setAnswer(currentAnswer);
  }


  // TrackBy functions for *ngFor to prevent focus loss
  trackByItemIndex(index: number, item: string): number {
    return index;
  }

  // Get option indicator (always numeric 1, 2, 3...)
  getChoiceLetter(index: number): string {
    const numericIndex = index + 1;
    return numericIndex.toString();
  }

  getMatchingColor(index: number, type: 'number' | 'letter'): string {
    const colors = {
      number: ['#ef4444', '#14b8a6', '#f97316', '#6b7280', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'],
      letter: ['#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb']
    };
    return colors[type][index % colors[type].length];
  }

  // Drag and Drop Methods
  onDragStart(event: DragEvent, optionIndex: number): void {
    this.draggedOptionIndex = optionIndex;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', optionIndex.toString());
    }
  }

  onDragEnd(): void {
    this.draggedOptionIndex = null;
    this.dragOverIndex = null;
  }

  onDragOver(event: DragEvent, questionIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverIndex = questionIndex;
  }

  onDragLeave(): void {
    this.dragOverIndex = null;
  }

  onDrop(event: DragEvent, questionId: number, questionIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    const optionIndex = this.draggedOptionIndex;
    if (optionIndex === null) return;

    const question = this.quizQuestions.find(q => q.id === questionId);
    if (!question || !question.payload.leftItems || !question.payload.rightItems) return;

    const currentAnswer = this.answers.get(questionId)?.answer as Array<{ left: string; right: string; rightIndex: number }> || [];
    const leftItem = question.payload.leftItems[questionIndex];
    const rightItem = question.payload.rightItems[optionIndex];

    // Remove the option from any previous match
    const existingMatchIndex = currentAnswer.findIndex((pair: any) => pair?.rightIndex === optionIndex);
    if (existingMatchIndex >= 0) {
      currentAnswer[existingMatchIndex] = undefined as any;
    }

    // Set the new match
    currentAnswer[questionIndex] = { left: leftItem, right: rightItem, rightIndex: optionIndex };
    
    // Clean up undefined entries and maintain order
    const cleanedAnswer = currentAnswer.filter((item: any) => item !== undefined);
    const newAnswer: Array<{ left: string; right: string; rightIndex: number }> = [];
    question.payload.leftItems.forEach((left: string, i: number) => {
      const match = cleanedAnswer.find((a: any) => a?.left === left);
      if (match) {
        newAnswer[i] = match;
      }
    });

    this.setAnswer(newAnswer);
    this.draggedOptionIndex = null;
    this.dragOverIndex = null;
    this.cdr.detectChanges();
  }

  removeMatchingAnswer(questionId: number, questionIndex: number): void {
    const currentAnswer = this.answers.get(questionId)?.answer as Array<{ left: string; right: string; rightIndex: number }> || [];
    const question = this.quizQuestions.find(q => q.id === questionId);
    
    if (question && question.payload.leftItems) {
      const leftItem = question.payload.leftItems[questionIndex];
      // Remove the match for this question
      const filteredAnswer = currentAnswer.filter((a: any) => a?.left !== leftItem);
      // Rebuild answer array maintaining order
      const newAnswer: Array<{ left: string; right: string; rightIndex: number }> = [];
      question.payload.leftItems.forEach((left: string, i: number) => {
        const match = filteredAnswer.find((a: any) => a?.left === left);
        if (match) {
          newAnswer[i] = match;
        }
      });
      this.setAnswer(newAnswer);
    } else {
      currentAnswer[questionIndex] = undefined as any;
      const cleanedAnswer = currentAnswer.filter((item: any) => item !== undefined);
      this.setAnswer(cleanedAnswer);
    }
    
    this.cdr.detectChanges();
  }

  isMatchingOptionUsed(questionId: number, optionIndex: number): boolean {
    const answer = this.answers.get(questionId)?.answer;
    if (!answer || !Array.isArray(answer)) return false;
    return answer.some((pair: any) => pair?.rightIndex === optionIndex);
  }

  getMatchingAnswerText(questionId: number, pairIndex: number): string {
    const answer = this.answers.get(questionId)?.answer;
    if (!answer || !Array.isArray(answer)) return '';
    const match = answer[pairIndex];
    return match?.right || '';
  }

  getMatchingAnswerLetter(questionId: number, pairIndex: number): string {
    const answer = this.answers.get(questionId)?.answer;
    if (!answer || !Array.isArray(answer)) return '';
    const match = answer[pairIndex];
    if (match?.rightIndex !== undefined && match.rightIndex !== null) {
      return this.getChoiceLetter(match.rightIndex);
    }
    return '';
  }

  // Get ordering items in current user order (for display)
  getOrderingItems(questionId: number): string[] {
    const question = this.quizQuestions.find(q => q.id === questionId);
    if (!question || !question.payload.items) return [];
    
    const answer = this.answers.get(questionId)?.answer;
    const shuffleMap = this.shuffleMaps.get(questionId);
    
    if (!answer || !Array.isArray(answer) || answer.length === 0) {
      // No answer yet, return shuffled items as-is
      return [...question.payload.items];
    }
    
    // User has reordered items
    // Answer is in terms of original indices, need to convert back to shuffled positions
    // then get the items in that order
    const originalIndices = answer as number[];
    const shuffledItems = question.payload.items;
    
    if (!shuffleMap || !Array.isArray(shuffleMap)) {
      // Fallback: assume answer is already in shuffled positions
      const orderedItems: string[] = [];
      for (const pos of originalIndices) {
        if (pos >= 0 && pos < shuffledItems.length) {
          orderedItems.push(shuffledItems[pos]);
        }
      }
      return orderedItems;
    }
    
    // Convert original indices back to shuffled positions
    // Create reverse map: original index -> shuffled position
    const reverseMap: number[] = [];
    for (let i = 0; i < shuffleMap.length; i++) {
      reverseMap[shuffleMap[i]] = i;
    }
    
    // Get shuffled positions in user's order
    const shuffledPositions = originalIndices.map(origIdx => reverseMap[origIdx]).filter(p => p !== undefined);
    
    // Return items in shuffled positions order
    return shuffledPositions.map(pos => shuffledItems[pos]).filter(item => item !== undefined);
  }

  // Ordering drag and drop methods
  onOrderingDragStart(event: DragEvent, index: number): void {
    this.orderingDragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onOrderingDragEnd(): void {
    this.orderingDragIndex = null;
    this.orderingDragOverIndex = null;
  }

  onOrderingDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.orderingDragIndex !== null && this.orderingDragIndex !== index) {
      this.orderingDragOverIndex = index;
    }
  }

  onOrderingDragLeave(): void {
    this.orderingDragOverIndex = null;
  }

  onOrderingDrop(event: DragEvent, questionId: number, dropIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.orderingDragIndex === null || this.orderingDragIndex === dropIndex) {
      this.orderingDragIndex = null;
      this.orderingDragOverIndex = null;
      return;
    }

    const question = this.quizQuestions.find(q => q.id === questionId);
    if (!question || !question.payload.items) return;

    // Get shuffle map to convert shuffled positions to original indices
    const shuffleMap = this.shuffleMaps.get(questionId);
    if (!shuffleMap || !Array.isArray(shuffleMap)) {
      console.error('No shuffle map found for ordering question', questionId);
      return;
    }

    // Get current order (in terms of original indices)
    let currentOrder = this.answers.get(questionId)?.answer as number[] || [];
    if (currentOrder.length === 0) {
      // Initialize with original indices based on current shuffled order
      // This means the user hasn't changed anything, so answer is the shuffled order mapped to original indices
      currentOrder = shuffleMap.map((origIdx, shuffledPos) => origIdx);
    }

    // Get current items in order
    const currentItems = this.getOrderingItems(questionId);
    
    // Move item from dragIndex to dropIndex
    const draggedItem = currentItems[this.orderingDragIndex];
    currentItems.splice(this.orderingDragIndex, 1);
    currentItems.splice(dropIndex, 0, draggedItem);
    
    // Find shuffled positions for the new order
    const shuffledItems = question.payload.items;
    const newShuffledOrder: number[] = [];
    for (const item of currentItems) {
      const shuffledIndex = shuffledItems.indexOf(item);
      if (shuffledIndex !== -1) {
        newShuffledOrder.push(shuffledIndex);
      }
    }
    
    // Convert shuffled positions to original indices using shuffle map
    const newOrder: number[] = newShuffledOrder.map(shuffledPos => shuffleMap[shuffledPos]);
    
    // Save the new order (in terms of original indices)
    this.answers.set(questionId, { questionId, answer: newOrder });
    this.orderingDragIndex = null;
    this.orderingDragOverIndex = null;
    this.cdr.detectChanges();
  }

  closeTest(): void {
    this.router.navigate(['/student/starter']);
  }

  getQuestionTypeLabel(type: string): string {
    const labels: Record<string, { en: string; ar: string }> = {
      'mcq': { en: 'Multiple Choice', ar: 'اختيار من متعدد' },
      'true_false': { en: 'True/False', ar: 'صحيح/خطأ' },
      'matching': { en: 'Matching', ar: 'مطابقة' },
      'ordering': { en: 'Ordering', ar: 'ترتيب' }
    };
    const label = labels[type] || { en: type, ar: type };
    return this.currentLang === 'ar' ? label.ar : label.en;
  }

  String = String; // Expose String for template use
  Math = Math; // Expose Math for template use
}
