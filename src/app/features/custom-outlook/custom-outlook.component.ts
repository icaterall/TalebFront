import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { StudentHeaderComponent } from '../student/layout/student-header/student-header.component';
import { I18nService } from '../../core/services/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-custom-outlook',
  standalone: true,
  imports: [CommonModule, StudentHeaderComponent, TranslateModule, FormsModule],
  template: `
    <div class="outlook-container">
      <!-- Student Header -->
      <app-student-header 
        [isMobile]="false" 
        [menuOpen]="false"
        (menuToggle)="onMenuToggle()">
      </app-student-header>

      <!-- Quiz Top Bar -->
      <div class="quiz-top-bar">
        <div class="quiz-bar-content">
          <div class="quiz-bar-left">
            <span class="quiz-bar-title">{{ 'outlook.training' | translate }}</span>
          </div>
          <div class="quiz-bar-right">
            <button class="quiz-toggle-btn" (click)="toggleQuizSidebar()" *ngIf="!showQuizSidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {{ 'outlook.quiz' | translate }}
            </button>
          </div>
        </div>
      </div>

          <!-- Main Content -->
          <div class="main-content">
            <img src="assets/images/email-bk.jpg" alt="Background" class="main-background-image">
        <!-- Left Navigation (Collapsed) -->
        <div class="left-nav" [class.rtl]="isRTL">
          <button class="nav-icon active">
            <img src="assets/images/mail.png" alt="Mail" width="20" height="20">
          </button>
          <button class="nav-icon">
            <img src="assets/images/calendar.png" alt="Calendar" width="20" height="20">
          </button>
          <button class="nav-icon">
            <img src="assets/images/people.png" alt="People" width="20" height="20">
          </button>
        </div>

        <!-- Mailbox Sidebar -->
        <div class="mailbox-sidebar" [class.rtl]="isRTL">
          <div class="new-mail-section">
            <button class="new-mail-btn" (click)="startCompose()">
              <img src="assets/images/mail.png" alt="Mail" width="16" height="16">
              {{ 'outlook.newMail' | translate }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          </div>

          <div class="favorites-section">
            <div class="section-header">
              <span>{{ 'outlook.favorites' | translate }}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </div>

          <div class="account-section">
            <div class="account-header">
              <span class="account-email">ashraf.qahman@asu.ed...</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
            <div class="folder-list">
              <div class="folder-item active">
                <span>{{ 'outlook.inbox' | translate }}</span>
              </div>
              <div class="folder-item">
                <span>{{ 'outlook.drafts' | translate }}</span>
              </div>
              <div class="folder-item">
                <span>{{ 'outlook.sentItems' | translate }}</span>
              </div>
              <div class="folder-item">
                <span>{{ 'outlook.deletedItems' | translate }}</span>
                <span class="count">50</span>
              </div>
              <div class="folder-item">
                <span>{{ 'outlook.junkEmail' | translate }}</span>
                <span class="count">20</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Email List -->
        <div class="email-list-pane">
          <!-- Email List (always visible) -->
          <div class="email-list-content">
            <div class="email-tabs">
              <div class="tab active">{{ 'outlook.focused' | translate }}</div>
              <div class="tab">{{ 'outlook.other' | translate }}</div>
              <div class="tab-controls">
                <button class="control-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                <button class="control-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                </button>
                <button class="control-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="email-list">
            <!-- Today Section -->
            <div class="time-section">
              <div class="time-header">Today</div>
              <div class="email-item" [class.rtl]="isRTL">
                <div class="email-avatar">I</div>
                <div class="email-content">
                  <div class="email-sender">Iman Al Butaini; Nasser Al Dhawi; A...</div>
                  <div class="email-subject">Follow-up on Attendance ...</div>
                  <div class="email-preview">Dear Mr. Nasser, With reference to t...</div>
                </div>
                <div class="email-time">5:48 AM</div>
              </div>
            </div>

            <!-- This week Section -->
            <div class="time-section">
              <div class="time-header">This week</div>
              <div class="email-item" [class.rtl]="isRTL">
                <div class="email-avatar">AA</div>
                <div class="email-content">
                  <div class="email-sender">Al Anoud ALYazeedi</div>
                  <div class="email-subject">Scopus Workshop: Unl...</div>
                  <div class="email-preview">
                    <div class="calendar-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                      <span>Mon 10/27/2025 3:...</span>
                      <span class="no-conflicts">No conflicts</span>
                    </div>
                    <button class="rsvp-btn">RSVP</button>
                  </div>
                </div>
                <div class="email-time">Thu 3:20 AM</div>
              </div>

              <div class="email-item" [class.rtl]="isRTL">
                <div class="email-avatar">AA</div>
                <div class="email-content">
                  <div class="email-sender">Al Anoud ALYazeedi</div>
                  <div class="email-subject">... قاعدة البيانات العربية الرقمية</div>
                  <div class="email-preview">
                    <div class="calendar-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                      <span>Mon 10/27/2025 1...</span>
                      <span class="no-conflicts">No conflicts</span>
                    </div>
                    <button class="rsvp-btn">RSVP</button>
                  </div>
                </div>
                <div class="email-time">Thu 3:17 AM</div>
              </div>

              <div class="email-item" [class.rtl]="isRTL">
                <div class="email-avatar">AA</div>
                <div class="email-content">
                  <div class="email-sender">Arwa Al-Busaidi</div>
                  <div class="email-subject">Minutes of the Curricul...</div>
                  <div class="email-preview">
                    <div class="email-icons">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div class="attachment-preview">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                      <span>Minutes of the ...</span>
                    </div>
                  </div>
                </div>
                <div class="email-time">Thu 2:46 AM</div>
              </div>

              <div class="email-item" [class.rtl]="isRTL">
                <div class="email-avatar">HA</div>
                <div class="email-content">
                  <div class="email-sender">HA</div>
                  <div class="email-subject">HR Announcement</div>
                  <div class="email-preview">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                </div>
                <div class="email-time"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Email Preview Pane -->
        <div class="preview-pane">
          <!-- Default preview background (when not composing) -->
          <div class="preview-background" *ngIf="!isComposing">
            <img src="assets/images/email-bk.jpg" alt="Background" class="background-image">
          </div>
        </div>

        <!-- Compose Interface Overlay -->
        <div class="compose-overlay" *ngIf="isComposing">
            <div class="compose-header">
              <div class="compose-actions">
                <button class="send-btn" (click)="sendEmail()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  {{ 'outlook.send' | translate }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
              </div>
              <div class="compose-controls">
                <button class="control-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V13C8,12.4 8.4,11.5 9,11.5V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11.5H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z"/>
                  </svg>
                </button>
                <button class="control-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                <button class="control-icon" (click)="cancelCompose()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                  </svg>
                </button>
                <button class="control-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="compose-fields">
              <div class="field-row">
                <div class="field-group">
                  <label>{{ 'outlook.to' | translate }}</label>
                  <input type="text" [(ngModel)]="composeData.to" class="field-input">
                  <span class="bcc-link" (click)="toggleBcc()">{{ 'outlook.bcc' | translate }}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <label>{{ 'outlook.cc' | translate }}</label>
                  <input type="text" [(ngModel)]="composeData.cc" class="field-input">
                </div>
              </div>
              <div class="field-row" *ngIf="showBcc">
                <div class="field-group">
                  <label>{{ 'outlook.bcc' | translate }}</label>
                  <input type="text" [(ngModel)]="composeData.bcc" class="field-input">
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <input type="text" [(ngModel)]="composeData.subject" class="field-input" placeholder="{{ 'outlook.subject' | translate }}">
                </div>
                <div class="draft-info">
                  {{ 'outlook.draftSaved' | translate }} 12:13 PM
                </div>
              </div>
            </div>

            <div class="compose-body">
              <textarea [(ngModel)]="composeData.body" class="body-textarea" placeholder="{{ 'outlook.composeMessage' | translate }}"></textarea>
            </div>
          </div>

        <!-- Quiz Sidebar -->
        <div class="quiz-sidebar" [class.open]="showQuizSidebar" [class.rtl]="isRTL">
          <div class="quiz-header">
            <h3>{{ 'outlook.quizNavigation' | translate }}</h3>
            <button class="close-quiz-btn" (click)="toggleQuizSidebar()">×</button>
          </div>
          
          <!-- Question Navigation (Moodle Style) -->
          <div class="quiz-navigation">
            <div class="nav-title">{{ 'outlook.quizNavigation' | translate }}</div>
            <div class="question-grid">
              <div class="question-box" *ngFor="let question of quizQuestions; let i = index" 
                   [class.completed]="question.completed"
                   [class.current]="question.current"
                   [class.not-answered]="!question.completed && !question.current"
                   (click)="selectQuestion(i)">
                <div class="question-number">{{ question.id }}</div>
              </div>
            </div>
          </div>

          <!-- Question Details -->
          <div class="question-details" *ngIf="selectedQuestion">
            <div class="question-header">
              <h4>{{ 'outlook.question' | translate }} {{ selectedQuestion.id }}</h4>
              <div class="question-points">{{ selectedQuestion.points }} {{ 'outlook.points' | translate }}</div>
            </div>
            
            <div class="question-content">
              <div class="question-text">{{ selectedQuestion.question }}</div>
              
              <div class="question-instructions">
                <h5>{{ 'outlook.instructions' | translate }}:</h5>
                <ul>
                  <li *ngFor="let instruction of selectedQuestion.instructions">{{ instruction }}</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="quiz-actions">
            <button class="finish-attempt-btn" (click)="finishAttempt()">
              {{ 'outlook.finishAttempt' | translate }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .outlook-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
    }


    /* Quiz Top Bar */
    .quiz-top-bar {
      background: white;
      border-bottom: 1px solid #e1e5e9;
      height: 48px;
      display: flex;
      align-items: center;
      padding: 0 20px;
    }

    .quiz-bar-content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quiz-bar-left {
      display: flex;
      align-items: center;
    }

    .quiz-bar-title {
      font-size: 16px;
      font-weight: 600;
      color: #323130;
    }

    .quiz-bar-right {
      display: flex;
      align-items: center;
    }

        /* Main Content */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          height: calc(100vh - 112px); /* Account for student header + quiz bar height */
          background: #f0f0f0;
          position: relative;
        }

        .main-background-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        /* Compose mode - adjust layout */
        .main-content.compose-mode {
          /* Allow compose interface to take more space */
        }

    /* Left Navigation (Collapsed) */
    .left-nav {
      width: 48px;
      background: white;
      border-right: 1px solid #e1e5e9;
      display: flex;
      flex-direction: column;
      padding: 8px 0;
      position: relative;
      z-index: 10;
    }

    /* RTL (Arabic) - Main navigation on the right */
    .left-nav.rtl {
      border-right: none;
      border-left: 1px solid #e1e5e9;
    }

    .nav-icon {
      width: 48px;
      height: 48px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #605e5c;
      transition: all 0.2s;
    }

    .nav-icon img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .nav-icon:hover {
      background: #f3f2f1;
    }

    .nav-icon.active {
      background: #e3f2fd;
      color: #0078d4;
    }

    /* Mailbox Sidebar */
    .mailbox-sidebar {
      width: 200px;
      background: white;
      border-right: 1px solid #e1e5e9;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 10;
    }

    /* RTL (Arabic) - Mailbox sidebar border adjustment */
    .mailbox-sidebar.rtl {
      border-right: none;
      border-left: 1px solid #e1e5e9;
    }

    .new-mail-section {
      padding: 16px;
      border-bottom: 1px solid #e1e5e9;
    }

    .new-mail-btn {
      width: 100%;
      padding: 12px 16px;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .new-mail-btn:hover {
      background: #106ebe;
    }

    .new-mail-btn img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }

    .favorites-section {
      padding: 16px;
      border-bottom: 1px solid #e1e5e9;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: #605e5c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .account-section {
      flex: 1;
      padding: 16px;
    }

    .account-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 14px;
      color: #323130;
    }

    .account-email {
      font-weight: 600;
    }

    .folder-list {
      display: flex;
      flex-direction: column;
    }

    .folder-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #323130;
      cursor: pointer;
      border-radius: 4px;
      padding-left: 8px;
      padding-right: 8px;
    }

    .folder-item:hover {
      background: #f3f2f1;
    }

    .folder-item.active {
      background: #e3f2fd;
      color: #0078d4;
      font-weight: 600;
    }

    .count {
      background: #e1e5e9;
      color: #605e5c;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Email List Pane */
    .email-list-pane {
      width: 300px;
      min-width: 300px;
      max-width: 300px;
      background: white;
      border-right: 1px solid #e1e5e9;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
    }


    .email-tabs {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e1e5e9;
    }

    .tab {
      padding: 8px 16px;
      font-size: 14px;
      color: #605e5c;
      cursor: pointer;
      border-radius: 4px;
      margin-right: 8px;
    }

    .tab.active {
      background: #e3f2fd;
      color: #0078d4;
      font-weight: 600;
    }

    .tab-controls {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }

    .control-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      color: #605e5c;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .control-btn:hover {
      background: #f3f2f1;
    }

    .email-list {
      flex: 1;
      overflow-y: auto;
    }

    .time-section {
      margin-bottom: 16px;
    }

    .time-header {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #605e5c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f8f9fa;
    }

    .email-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid #f3f2f1;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .email-item:hover {
      background: #f8f9fa;
    }

    .email-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: white;
      margin-right: 12px;
      flex-shrink: 0;
    }

    /* RTL (Arabic) - Adjust avatar spacing */
    .email-item.rtl .email-avatar {
      margin-right: 0;
      margin-left: 12px;
    }

    .email-avatar:first-child {
      background: #0078d4;
    }

    .email-avatar:nth-child(2) {
      background: #ff9500;
    }

    .email-content {
      flex: 1;
      min-width: 0;
    }

    .email-sender {
      font-size: 14px;
      font-weight: 600;
      color: #323130;
      margin-bottom: 2px;
    }

    .email-subject {
      font-size: 14px;
      color: #323130;
      margin-bottom: 4px;
    }

    .email-preview {
      font-size: 13px;
      color: #605e5c;
      line-height: 1.4;
    }

    .calendar-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #605e5c;
      margin-top: 4px;
    }

    .no-conflicts {
      color: #28a745;
    }

    .rsvp-btn {
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 4px;
    }

    .email-icons {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .attachment-preview {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #605e5c;
      margin-top: 4px;
    }

    .email-time {
      font-size: 12px;
      color: #a19f9d;
      margin-left: 8px;
      flex-shrink: 0;
    }

    /* Preview Pane */
    .preview-pane {
      flex: 1;
      min-width: 0;
      position: relative;
      overflow: hidden;
      min-height: 100%;
      z-index: 10;
    }

    .preview-background {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .background-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }

    .preview-background::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ffffff;stop-opacity:0.1" /><stop offset="100%" style="stop-color:%23ffffff;stop-opacity:0.05" /></linearGradient></defs><path d="M0,800 Q250,600 500,700 T1000,600 L1000,1000 L0,1000 Z" fill="url(%23grad1)"/></svg>') no-repeat center center;
      background-size: cover;
    }

        /* Quiz Sidebar */
        .quiz-sidebar {
          width: 300px;
          background: white;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease;
          position: fixed;
          top: 112px; /* Below the student header + quiz bar */
          height: calc(100vh - 112px);
          z-index: 2000; /* Higher z-index to overlay on compose interface */
        }

    /* LTR (English) - Quiz sidebar on the right */
    .quiz-sidebar {
      border-left: 1px solid #e1e5e9;
      transform: translateX(100%);
      right: 0;
      box-shadow: -4px 0 12px rgba(0,0,0,0.15);
    }

    .quiz-sidebar.open {
      transform: translateX(0);
    }

    /* RTL (Arabic) - Quiz sidebar on the left */
    .quiz-sidebar.rtl {
      border-left: none;
      border-right: 1px solid #e1e5e9;
      transform: translateX(-100%);
      right: auto;
      left: 0;
      box-shadow: 4px 0 12px rgba(0,0,0,0.15);
    }

    .quiz-sidebar.rtl.open {
      transform: translateX(0);
    }

    .quiz-header {
      padding: 20px;
      border-bottom: 1px solid #e1e5e9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quiz-header h3 {
      margin: 0;
      color: #323130;
    }

    .close-quiz-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #605e5c;
    }

    .quiz-navigation {
      padding: 20px;
      border-bottom: 1px solid #e1e5e9;
    }

    .nav-title {
      font-size: 14px;
      font-weight: 600;
      color: #323130;
      margin-bottom: 12px;
    }

    .question-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }

    .question-box {
      width: 40px;
      height: 40px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 600;
      font-size: 14px;
    }

    .question-box:hover {
      border-color: #0078d4;
      background: #f3f2f1;
    }

    .question-box.completed {
      background: #e8f5e8;
      border-color: #4caf50;
      color: #2e7d32;
    }

    .question-box.current {
      background: #e3f2fd;
      border-color: #2196f3;
      color: #1976d2;
    }

    .question-box.not-answered {
      background: #f5f5f5;
      border-color: #d1d5db;
      color: #6b7280;
    }

    .question-number {
      font-weight: 600;
    }

    .question-details {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e1e5e9;
    }

    .question-header h4 {
      margin: 0;
      color: #323130;
      font-size: 16px;
    }

    .question-points {
      background: #0078d4;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .question-content {
      margin-bottom: 20px;
    }

    .question-text {
      font-size: 14px;
      color: #323130;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .question-instructions h5 {
      margin: 0 0 8px 0;
      color: #323130;
      font-size: 14px;
      font-weight: 600;
    }

    .question-instructions ul {
      margin: 0;
      padding-left: 16px;
    }

    .question-instructions li {
      font-size: 13px;
      color: #605e5c;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .quiz-actions {
      padding: 20px;
      border-top: 1px solid #e1e5e9;
    }

    .finish-attempt-btn {
      width: 100%;
      padding: 12px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .finish-attempt-btn:hover {
      background: #218838;
    }

    .quiz-toggle-btn {
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .quiz-toggle-btn:hover {
      background: #106ebe;
      transform: translateY(-1px);
    }

    .quiz-toggle-btn:active {
      transform: translateY(0);
    }

    /* Compose Interface Overlay */
    .compose-overlay {
      position: fixed;
      top: 112px; /* Below header */
      left: 548px; /* After left nav (48px) + mailbox sidebar (200px) + email list (300px) */
      right: 0;
      bottom: 0;
      background: white;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .compose-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #e1e5e9;
      background: white;
    }

    .compose-actions {
      display: flex;
      align-items: center;
    }

    .send-btn {
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-right: 12px;
    }

    .send-btn:hover {
      background: #106ebe;
    }

    .compose-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control-icon {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #605e5c;
    }

    .control-icon:hover {
      background: #f3f2f1;
    }

    .compose-fields {
      padding: 16px;
      border-bottom: 1px solid #e1e5e9;
    }

    .field-row {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      gap: 0;
    }

    .field-group {
      display: flex;
      align-items: center;
      flex: 1;
      margin-right: 20px;
    }

    .field-group:last-child {
      margin-right: 0;
    }

    .field-group label {
      width: 50px;
      font-size: 14px;
      color: #323130;
      margin-right: 8px;
      font-weight: 700;
      border: 1px solid #e1e5e9;
      border-radius: 4px;
      padding: 4px 8px;
      background: white;
      text-align: center;
    }


    .field-input {
      flex: 1;
      border: none;
      border-bottom: 1px solid #e1e5e9;
      padding: 6px 0;
      font-size: 14px;
      background: transparent;
      margin-right: 8px;
    }

    .bcc-link {
      color: #0078d4;
      cursor: pointer;
      font-size: 14px;
      text-decoration: underline;
      margin-left: 8px;
    }

    .bcc-link:hover {
      color: #106ebe;
    }

    .field-input:focus {
      outline: none;
      border-bottom-color: #0078d4;
    }

    .draft-info {
      font-size: 12px;
      color: #a19f9d;
      margin-left: auto;
      white-space: nowrap;
      margin-right: 0;
    }

    .compose-body {
      flex: 1;
      padding: 16px;
    }

    .body-textarea {
      width: 100%;
      height: 100%;
      border: none;
      resize: none;
      font-size: 14px;
      font-family: inherit;
      background: transparent;
    }

    .body-textarea:focus {
      outline: none;
    }

    .body-textarea::placeholder {
      color: #a19f9d;
    }
  `]
})
export class CustomOutlookComponent implements OnInit {
  activeTab: string = 'mail';
  showQuizSidebar: boolean = false;
  isComposing: boolean = false;
  private i18n: I18nService;

  // Email composition data
  composeData = {
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  };

  showBcc: boolean = false;

  get isRTL(): boolean {
    return this.i18n.current === 'ar';
  }

  onMenuToggle(): void {
    // Handle menu toggle if needed
  }

  emails = [
    { sender: 'John Doe', subject: 'Meeting Tomorrow', preview: 'Hi, just wanted to confirm our meeting...', time: '2:30 PM' },
    { sender: 'Jane Smith', subject: 'Project Update', preview: 'The project is progressing well...', time: '1:15 PM' },
    { sender: 'Mike Johnson', subject: 'Budget Review', preview: 'Please review the attached budget...', time: '11:45 AM' }
  ];

  contacts = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
    { name: 'Mike Johnson', email: 'mike@example.com' }
  ];

  calendarDays = [
    { number: 1, events: [] },
    { number: 2, events: [{ title: 'Team Meeting' }] },
    { number: 3, events: [] },
    { number: 4, events: [{ title: 'Project Review' }] },
    { number: 5, events: [] },
    { number: 6, events: [] },
    { number: 7, events: [{ title: 'Client Call' }] }
  ];

  quizQuestions = [
    { 
      id: 1,
      title: 'Compose Professional Email', 
      completed: false, 
      current: true,
      question: 'Create a new email message with the following requirements:',
      instructions: [
        'TO: ash@asu.com',
        'CC: ahmed@asu.com', 
        'BCC: ali@asu.com',
        'Subject: IT1',
        'Body: Hello, (font size 20px, green color)',
        'Body alignment: center',
        'Font size: 16px for main text'
      ],
      points: 10
    },
    { 
      id: 2,
      title: 'Set Email Priority', 
      completed: false, 
      current: false,
      question: 'Set the email priority to High importance:',
      instructions: [
        'Open the email you just created',
        'Click on the Options tab',
        'Set Priority to High',
        'Save the changes'
      ],
      points: 5
    },
    { 
      id: 3,
      title: 'Add Email Signature', 
      completed: false, 
      current: false,
      question: 'Create and add a professional email signature:',
      instructions: [
        'Go to File > Options > Mail',
        'Click on Signatures',
        'Create a new signature with your name and title',
        'Set it as default for new messages'
      ],
      points: 8
    },
    { 
      id: 4,
      title: 'Create Email Rule', 
      completed: false, 
      current: false,
      question: 'Create an email rule to automatically move emails:',
      instructions: [
        'Go to File > Manage Rules & Alerts',
        'Create a new rule',
        'Set condition: emails from specific sender',
        'Set action: move to specific folder'
      ],
      points: 12
    },
    { 
      id: 5,
      title: 'Schedule Meeting', 
      completed: false, 
      current: false,
      question: 'Schedule a meeting using Outlook Calendar:',
      instructions: [
        'Open Calendar view',
        'Create new meeting',
        'Add attendees: team@company.com',
        'Set date and time',
        'Add meeting agenda'
      ],
      points: 15
    }
  ];

  selectedQuestion: any = null;

  constructor(private router: Router, i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.i18n = i18n;
  }

  ngOnInit(): void {
    // Initialize with the first question selected
    this.selectedQuestion = this.quizQuestions[0];
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  composeEmail(): void {
    console.log('Compose new email');
  }

  selectEmail(email: any): void {
    console.log('Selected email:', email);
  }

  addContact(): void {
    console.log('Add new contact');
  }

  createEvent(): void {
    console.log('Create new event');
  }

  openSettings(): void {
    console.log('Open settings');
  }

  toggleQuizSidebar(): void {
    this.showQuizSidebar = !this.showQuizSidebar;
  }

  selectQuestion(index: number): void {
    this.quizQuestions.forEach((q, i) => {
      q.current = i === index;
    });
    this.selectedQuestion = this.quizQuestions[index];
  }

  finishAttempt(): void {
    console.log('Finish quiz attempt');
    // Add quiz completion logic here
  }

  startCompose(): void {
    this.isComposing = true;
  }

  cancelCompose(): void {
    this.isComposing = false;
    this.composeData = {
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    };
  }

  sendEmail(): void {
    console.log('Sending email:', this.composeData);
    // Add email sending logic here
    this.cancelCompose();
  }

  saveDraft(): void {
    console.log('Saving draft:', this.composeData);
    // Add draft saving logic here
  }

  toggleBcc(): void {
    this.showBcc = !this.showBcc;
  }
}
