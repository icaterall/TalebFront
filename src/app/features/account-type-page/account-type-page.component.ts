import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../core/services/i18n.service';

type Lang = 'ar' | 'en';

@Component({
  selector: 'app-account-type-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './account-type-page.component.html',
  styleUrls: ['./account-type-page.component.scss']
})
export class AccountTypePageComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  get currentLang(): Lang { 
    return this.i18n.current; 
  }

  async setLang(next: Lang) {
    await this.i18n.setLang(next);
  }

  choose(type: 'Teacher' | 'Student') {
    // TODO: Store selected account type and navigate to signup form
    console.log('Selected account type:', type);
    
    // For demo purposes, navigate to a signup page with the selected type
    this.router.navigate(['/signup'], { 
      queryParams: { type: type.toLowerCase() } 
    });
  }
}
