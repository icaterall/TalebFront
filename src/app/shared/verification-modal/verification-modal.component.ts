import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './verification-modal.component.html',
  styleUrls: ['./verification-modal.component.scss']
})
export class VerificationModalComponent implements OnInit, OnDestroy {
  @Input() email: string = '';
  @Input() initialCanResendAt?: string; // Timestamp from registration
  @Output() closeModal = new EventEmitter<void>();
  @Output() verificationSuccess = new EventEmitter<void>();

  verificationCode: string = '';
  isSubmitting = false;
  resendCountdown = 0;
  canResend = false;
  private resendTimer: any;
  private canResendAt: number = 0; // Timestamp in milliseconds
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef // ← Important for smooth updates!
  ) {}

  ngOnInit() {
    // Start countdown for resend button
    if (this.initialCanResendAt) {
      this.startCountdownFromTimestamp(this.initialCanResendAt);
    } else {
      // Fallback: 30 seconds
      const fallbackTime = new Date(Date.now() + 30000).toISOString();
      this.startCountdownFromTimestamp(fallbackTime);
    }
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private clearTimer() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  close() {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent) {
    // Prevent closing by clicking backdrop
    // Only X button can close
    event.stopPropagation();
  }

  async verifyCode() {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.toastr.error('Please enter a valid 6-digit code');
      this.forceToastOnTop();
      return;
    }

    this.isSubmitting = true;

    try {
      const response: any = await this.http.post(`${this.baseUrl}/auth/verify-email`, {
        email: this.email,
        code: this.verificationCode
      }).toPromise();

      console.log('✅ Verification response:', response);
      
      this.toastr.success('Email verified successfully!');
      this.forceToastOnTop();
      
      // Emit success and close modal
      this.verificationSuccess.emit();
      this.close();
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      const errorMessage = error?.error?.message || 'Invalid verification code';
      this.toastr.error(errorMessage);
      this.forceToastOnTop();
    } finally {
      this.isSubmitting = false;
    }
  }

  async resendCode() {
    if (!this.canResend) {
      console.log('⏳ Wait', this.resendCountdown, 'more seconds');
      return;
    }

    const lang = this.translate.currentLang || 'ar';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept-Language': lang
    });

    try {
      const response: any = await this.http.post(
        `${this.baseUrl}/auth/resend-verification`,
        { email: this.email },
        { headers }
      ).toPromise();

      console.log('✅ Resend response:', response);
      this.toastr.success(response.message || 'Verification code sent!');
      this.forceToastOnTop();
      
      // Start countdown with timestamp from API
      if (response.canResendAt) {
        this.startCountdownFromTimestamp(response.canResendAt);
      }
      
    } catch (error: any) {
      console.error('❌ Resend error:', error);
      const errorData = error?.error;
      const errorMessage = errorData?.message || 'Failed to resend code';
      
      this.toastr.error(errorMessage);
      this.forceToastOnTop();
      
      // Always start countdown even on error
      if (errorData?.canResendAt) {
        console.log('⏳ Starting countdown from error response');
        this.startCountdownFromTimestamp(errorData.canResendAt);
      } else {
        // Fallback: 30 seconds
        const fallbackTime = new Date(Date.now() + 30000).toISOString();
        this.startCountdownFromTimestamp(fallbackTime);
      }
    }
  }

  /**
   * Force toast container to appear on top of modals
   */
  private forceToastOnTop(): void {
    setTimeout(() => {
      const container = document.getElementById('toast-container');
      if (container) {
        container.style.setProperty('z-index', '999999', 'important');
        container.style.setProperty('position', 'fixed', 'important');
      }
    }, 10);
  }

  /**
   * Start countdown using timestamp from API
   */
  private startCountdownFromTimestamp(canResendAtISO: string) {
    console.log('🕐 Starting countdown until:', canResendAtISO);
    
    this.canResendAt = new Date(canResendAtISO).getTime();
    this.clearTimer();
    
    // Update immediately
    this.updateCountdown();
    
    // Then update every second
    this.resendTimer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * Update countdown display - runs every second
   */
  private updateCountdown() {
    const now = Date.now();
    const remainingMs = this.canResendAt - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    this.resendCountdown = remainingSeconds;
    this.canResend = remainingSeconds <= 0;
    
    // Trigger change detection for smooth updates
    this.cdr.markForCheck();

    if (remainingSeconds <= 0) {
      console.log('✅ Countdown finished! Can resend now.');
      this.clearTimer();
    }
  }

  // Handle paste event to auto-fill verification code
  onPaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && /^\d{6}$/.test(pastedText)) {
      this.verificationCode = pastedText;
      event.preventDefault();
    }
  }

  // Handle input to only allow digits and limit to 6 characters
  onInput(event: any) {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    this.verificationCode = value;
  }
}


