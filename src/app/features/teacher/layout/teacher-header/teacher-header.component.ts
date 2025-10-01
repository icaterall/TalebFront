import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';

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

  currentLanguage = 'ع';
  isRTL = false;

  ngOnInit(): void {
    this.updateLanguageDisplay();
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

  toggleLanguage(): void {
    this.isRTL = !this.isRTL;
    this.updateLanguageDisplay();
    this.updateDocumentDirection();
  }

  private updateLanguageDisplay(): void {
    // If we're in RTL mode, show EN (to switch to English)
    // If we're in LTR mode, show ع (to switch to Arabic)
    this.currentLanguage = this.isRTL ? 'EN' : 'ع';
  }

  private updateDocumentDirection(): void {
    const html = document.documentElement;
    if (this.isRTL) {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ar');
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
    }
  }
}
