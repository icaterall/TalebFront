import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss']
})
export class ForgotPasswordModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() backToLogin = new EventEmitter<void>();

  email = '';
  isSubmitting = false;
  emailSent = false;

  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly baseUrl = environment.apiUrl;

  close() {
    this.closeModal.emit();
  }

  goBackToLogin() {
    this.backToLogin.emit();
    this.close();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  async onSubmit() {
    if (!this.email || !this.validateEmail(this.email)) {
      this.toastr.error(
        this.translate.instant('general.pleaseProvideValidEmail'),
        this.translate.instant('general.error')
      );
      this.forceToastOnTop();
      return;
    }

    this.isSubmitting = true;

    try {
      const currentLang = this.translate.currentLang || 'ar';
      const response: any = await this.http.post(`${this.baseUrl}/auth/forgot-password`, {
        email: this.email,
        language: currentLang
      }).toPromise();

      this.emailSent = true;
      this.toastr.success(
        response.message || this.translate.instant('general.resetLinkSentCheckEmail'),
        this.translate.instant('general.success')
      );
      this.forceToastOnTop();
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error?.error?.message || 
        this.translate.instant('general.passwordResetLinkNotSentMessage');
      this.toastr.error(errorMessage, this.translate.instant('general.error'));
      this.forceToastOnTop();
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
}

