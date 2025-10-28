import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { I18nService } from '../../../../core/services/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher-header',
  standalone: true,
  templateUrl: './teacher-header.component.html',
  styleUrls: ['./teacher-header.component.scss'],
})
export class TeacherHeaderComponent implements OnInit, OnChanges {
  @Input() isMobile = false;
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  private i18n = inject(I18nService);
  private router = inject(Router);

  get currentLanguage(): string {
    return this.i18n.current === 'ar' ? 'EN' : 'ع';
  }

  get isRTL(): boolean {
    return this.i18n.current === 'ar';
  }

  ngOnInit(): void {
    // Language display is now reactive through getters
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isMobile']) {
      console.log('Header isMobile changed:', this.isMobile);
    }
  }

  onToggle(): void {
    console.log('Header toggle clicked, isMobile:', this.isMobile);
    this.menuToggle.emit();
  }

  onLogoClick(): void {
    this.router.navigateByUrl('/teacher');
  }

  async toggleLanguage(): Promise<void> {
    const newLang = this.i18n.current === 'ar' ? 'en' : 'ar';
    await this.i18n.setLang(newLang);
  }
}
