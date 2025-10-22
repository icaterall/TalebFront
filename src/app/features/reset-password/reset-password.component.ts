import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly baseUrl = environment.apiUrl;

  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  
  isValidating: boolean = true;
  isValidToken: boolean = false;
  isSubmitting: boolean = false;
  isSuccess: boolean = false;
  
  validationErrors: any = {};

  ngOnInit() {
    // Apply language from query param if present
    const queryLang = this.route.snapshot.queryParamMap.get('lang');
    if (queryLang === 'ar' || queryLang === 'en') {
      // Set language before any UI render
      this.translate.use(queryLang);
      sessionStorage.setItem('anataleb.lang', queryLang);
      document.documentElement.setAttribute('lang', queryLang);
      document.documentElement.setAttribute('dir', queryLang === 'ar' ? 'rtl' : 'ltr');
    }

    // Get token from route params
    this.route.params.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.validateToken();
      } else {
        this.isValidating = false;
        this.isValidToken = false;
      }
    });
  }

  async validateToken() {
    this.isValidating = true;
    
    try {
      const currentLang = this.translate.currentLang || 'ar';
      await this.http.get(`${this.baseUrl}/auth/validate-token/${this.token}`, {
        headers: {
          'Accept-Language': currentLang
        }
      }).toPromise();
      
      this.isValidToken = true;
    } catch (error: any) {
      console.error('Token validation error:', error);
      this.isValidToken = false;
      const errorMessage = error?.error?.message || 
        this.translate.instant('general.invalidToken');
      this.toastr.error(errorMessage, this.translate.instant('general.error'));
    } finally {
      this.isValidating = false;
    }
  }

  validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Validate new password
    if (!this.newPassword) {
      this.validationErrors.newPassword = this.translate.instant('general.passwordIsRequired');
      isValid = false;
    } else if (this.newPassword.length < 8) {
      this.validationErrors.newPassword = this.translate.instant('general.passwordMustBe8Characters');
      isValid = false;
    }

    // Validate confirm password
    if (!this.confirmPassword) {
      this.validationErrors.confirmPassword = this.translate.instant('general.confirmpasswordIsRequired');
      isValid = false;
    } else if (this.newPassword !== this.confirmPassword) {
      this.validationErrors.confirmPassword = this.translate.instant('general.passworddoesnotmatch');
      isValid = false;
    }

    return isValid;
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    try {
      const currentLang = this.translate.currentLang || 'ar';
      const response: any = await this.http.post(`${this.baseUrl}/auth/reset-password`, {
        token: this.token,
        newPassword: this.newPassword
      }, {
        headers: {
          'Accept-Language': currentLang
        }
      }).toPromise();

      this.isSuccess = true;
      this.toastr.success(
        response.message || this.translate.instant('general.passwordResetSuccessfully'),
        this.translate.instant('general.success')
      );

      // Redirect to home page after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error?.error?.message || 
        this.translate.instant('general.passwordResetFailedMessage');
      this.toastr.error(errorMessage, this.translate.instant('general.error'));
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToHomePage() {
    this.router.navigate(['/']);
  }
}

