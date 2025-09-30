import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';
import { FormsModule } from '@angular/forms';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-account-type-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './account-type-page.component.html',
  styleUrls: ['./account-type-page.component.scss']
})
export class AccountTypePageComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  showDateOfBirth = false;
  showTeacherDashboard = false;
  selectedYear = '';
  selectedMonth = '';
  selectedDay = '';

  get currentLang(): Lang { 
    return this.i18n.current; 
  }

  async setLang(next: Lang) {
    await this.i18n.setLang(next);
  }

  choose(type: 'Teacher' | 'Student') {
    console.log('Selected account type:', type);
    if (type === 'Student') {
      this.showDateOfBirth = true;
    } else if (type === 'Teacher') {
      this.router.navigate(['/teacher-dashboard']);
    }
  }

  getYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i >= currentYear - 100; i--) {
      years.push(i.toString());
    }
    return years;
  }

  getMonths() {
    const isArabic = this.currentLang === 'ar';
    return [
      { value: '01', label: isArabic ? 'يناير' : 'January' },
      { value: '02', label: isArabic ? 'فبراير' : 'February' },
      { value: '03', label: isArabic ? 'مارس' : 'March' },
      { value: '04', label: isArabic ? 'أبريل' : 'April' },
      { value: '05', label: isArabic ? 'مايو' : 'May' },
      { value: '06', label: isArabic ? 'يونيو' : 'June' },
      { value: '07', label: isArabic ? 'يوليو' : 'July' },
      { value: '08', label: isArabic ? 'أغسطس' : 'August' },
      { value: '09', label: isArabic ? 'سبتمبر' : 'September' },
      { value: '10', label: isArabic ? 'أكتوبر' : 'October' },
      { value: '11', label: isArabic ? 'نوفمبر' : 'November' },
      { value: '12', label: isArabic ? 'ديسمبر' : 'December' }
    ];
  }

  getDays() {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i.toString().padStart(2, '0'));
    }
    return days;
  }

  isContinueDisabled() {
    return !this.selectedYear || !this.selectedMonth || !this.selectedDay;
  }

  continue() {
    if (!this.isContinueDisabled()) {
      this.router.navigate(['/signup'], {
        queryParams: { 
          type: 'student',
          year: this.selectedYear,
          month: this.selectedMonth,
          day: this.selectedDay
        }
      });
    }
  }

  goBack() {
    this.showDateOfBirth = false;
    this.selectedYear = '';
    this.selectedMonth = '';
    this.selectedDay = '';
  }
}
