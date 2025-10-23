import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignatureGraderService, GradingResult } from '../../services/signature-grader.service';

// Declare Office.js types
declare const Office: any;

@Component({
  selector: 'app-outlook-addin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outlook-addin.component.html',
  styleUrls: ['./outlook-addin.component.scss']
})
export class OutlookAddinComponent implements OnInit, OnDestroy {
  
  // Office.js state
  isOfficeReady = false;
  isComposeMode = false;
  
  // Email content
  emailHtml = '';
  emailText = '';
  
  // Grading results
  gradingResult: GradingResult | null = null;
  isGrading = false;
  
  // UI state
  showInstructions = true;
  showResults = false;
  
  constructor(private graderService: SignatureGraderService) {}

  async ngOnInit(): Promise<void> {
    try {
      // Wait for Office.js to be ready
      await new Promise<void>((resolve) => {
        Office.onReady(() => {
          console.log('Office.js is ready');
          this.isOfficeReady = true;
          this.checkComposeMode();
          resolve();
        });
      });
    } catch (error) {
      console.error('Error initializing Office.js:', error);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Check if we're in compose mode
   */
  private checkComposeMode(): void {
    try {
      if (Office.context.mailbox.item) {
        this.isComposeMode = Office.context.mailbox.item.itemType === Office.MailboxEnums.ItemType.Message;
        console.log('Compose mode:', this.isComposeMode);
      }
    } catch (error) {
      console.error('Error checking compose mode:', error);
    }
  }

  /**
   * Fetch the email body HTML from Outlook
   */
  async fetchEmailBody(): Promise<void> {
    if (!this.isOfficeReady || !this.isComposeMode) {
      console.error('Office not ready or not in compose mode');
      return;
    }

    try {
      // Get HTML content
      Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, (result: any) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          this.emailHtml = result.value || '';
          console.log('Email HTML fetched:', this.emailHtml.substring(0, 100) + '...');
          
          // Also get text content for reference
          Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (textResult: any) => {
            if (textResult.status === Office.AsyncResultStatus.Succeeded) {
              this.emailText = textResult.value || '';
            }
          });
        } else {
          console.error('Error fetching email body:', result.error);
        }
      });
    } catch (error) {
      console.error('Error in fetchEmailBody:', error);
    }
  }

  /**
   * Grade the email signature
   */
  async gradeSignature(): Promise<void> {
    if (!this.emailHtml) {
      console.error('No email content to grade');
      return;
    }

    this.isGrading = true;
    this.showResults = false;

    try {
      // Use the existing grader service
      this.gradingResult = this.graderService.gradeSignature(this.emailHtml);
      this.showResults = true;
      this.showInstructions = false;
      
      console.log('Grading completed:', this.gradingResult);
    } catch (error) {
      console.error('Error grading signature:', error);
    } finally {
      this.isGrading = false;
    }
  }

  /**
   * Reset the grading process
   */
  resetGrading(): void {
    this.gradingResult = null;
    this.showResults = false;
    this.showInstructions = true;
    this.emailHtml = '';
    this.emailText = '';
  }

  /**
   * Get grade color class
   */
  getGradeColorClass(percentage: number): string {
    if (percentage >= 90) return 'grade-excellent';
    if (percentage >= 80) return 'grade-good';
    if (percentage >= 70) return 'grade-pass';
    return 'grade-fail';
  }

  /**
   * Get grade label
   */
  getGradeLabel(percentage: number): string {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Pass';
    return 'Needs Improvement';
  }

  /**
   * Copy signature to clipboard
   */
  async copySignature(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.emailHtml);
      console.log('Signature copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  /**
   * Get current email preview
   */
  getEmailPreview(): string {
    if (!this.emailHtml) return '';
    
    // Extract just the signature part (last few lines)
    const lines = this.emailText.split('\n');
    const signatureLines = lines.slice(-10).join('\n');
    return signatureLines || this.emailText.substring(0, 200) + '...';
  }
}
