import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { I18nService } from '../../../core/services/i18n.service';

export interface OfficeApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  gradient: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  skills: string[];
}

@Component({
  selector: 'app-ms-practices-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ms-practices-modal.component.html',
  styleUrls: ['./ms-practices-modal.component.scss']
})
export class MsPracticesModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() startPractice = new EventEmitter<OfficeApp>();

  private readonly i18n = inject(I18nService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  selectedApp: OfficeApp | null = null;
  showAppDetails = false;

  officeApps: OfficeApp[] = [
    {
      id: 'outlook',
      name: '',
      icon: '📧',
      description: '',
      color: '#0078d4',
      gradient: 'linear-gradient(135deg, #0078d4, #106ebe)',
      difficulty: 'intermediate',
      estimatedTime: '',
      skills: []
    },
    {
      id: 'word',
      name: '',
      icon: '📝',
      description: '',
      color: '#2b579a',
      gradient: 'linear-gradient(135deg, #2b579a, #1e3a8a)',
      difficulty: 'beginner',
      estimatedTime: '',
      skills: []
    },
    {
      id: 'powerpoint',
      name: '',
      icon: '📊',
      description: '',
      color: '#d24726',
      gradient: 'linear-gradient(135deg, #d24726, #b91c1c)',
      difficulty: 'intermediate',
      estimatedTime: '',
      skills: []
    },
    {
      id: 'excel',
      name: '',
      icon: '📈',
      description: '',
      color: '#217346',
      gradient: 'linear-gradient(135deg, #217346, #166534)',
      difficulty: 'advanced',
      estimatedTime: '',
      skills: []
    }
  ];

  get currentLang(): string {
    return this.i18n.current;
  }

  ngOnInit(): void {
    // Initialize component
    this.loadTranslations();
    this.checkTranslationService();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      console.log('Modal opened, checking translations...');
      this.onModalOpen();
    }
  }

  private loadTranslations(): void {
    // Ensure translations are loaded
    this.translate.get('msPractices.title').subscribe((title) => {
      console.log('Title translation:', title);
    });
    this.translate.get('msPractices.apps.outlook.name').subscribe((name) => {
      console.log('Outlook name translation:', name);
    });
    this.translate.get('msPractices.apps.word.name').subscribe((name) => {
      console.log('Word name translation:', name);
    });
    this.translate.get('msPractices.apps.powerpoint.name').subscribe((name) => {
      console.log('PowerPoint name translation:', name);
    });
    this.translate.get('msPractices.apps.excel.name').subscribe((name) => {
      console.log('Excel name translation:', name);
    });
  }

  private checkTranslationService(): void {
    console.log('Current language:', this.translate.currentLang);
    console.log('Default language:', this.translate.defaultLang);
    console.log('Available languages:', this.translate.getLangs());
    
    // Test a simple translation
    const testTranslation = this.translate.instant('msPractices.title');
    console.log('Test translation for msPractices.title:', testTranslation);
    
    // Check if translation service is working
    if (testTranslation === 'msPractices.title') {
      console.warn('Translation service not working - showing keys instead of translations');
      this.forceReloadTranslations();
    } else {
      console.log('Translation service is working correctly');
    }
  }

  private forceReloadTranslations(): void {
    console.log('Forcing translation reload...');
    
    // Try to reload the current language
    const currentLang = this.translate.currentLang || this.translate.defaultLang;
    if (currentLang) {
      this.translate.reloadLang(currentLang).subscribe(() => {
        console.log('Translation reloaded for language:', currentLang);
        
        // Test again
        const testTranslation = this.translate.instant('msPractices.title');
        console.log('After reload - Test translation for msPractices.title:', testTranslation);
      });
    }
  }

  onClose(): void {
    this.close.emit();
    this.resetSelection();
  }

  // Method to be called when modal opens
  onModalOpen(): void {
    console.log('Modal opened, checking translations...');
    this.checkTranslationService();
    this.loadTranslations();
    
    // Add a small delay to ensure DOM is rendered
    setTimeout(() => {
      console.log('Delayed translation check...');
      this.checkTranslationService();
    }, 100);
  }

  onBackToApps(): void {
    this.showAppDetails = false;
    this.selectedApp = null;
  }

  onSelectApp(app: OfficeApp): void {
    this.selectedApp = app;
    this.showAppDetails = true;
  }

  onStartPractice(): void {
    if (this.selectedApp) {
      if (this.selectedApp.id === 'outlook') {
        // Navigate to Outlook training
        this.router.navigate(['/outlook-training']);
        this.onClose();
      } else {
        // For other apps, emit the event
        this.startPractice.emit(this.selectedApp);
      }
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner':
        return '#10b981';
      case 'intermediate':
        return '#f59e0b';
      case 'advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }

  getDifficultyText(difficulty: string): string {
    switch (difficulty) {
      case 'beginner':
        return this.translate.instant('msPractices.difficulty.beginner');
      case 'intermediate':
        return this.translate.instant('msPractices.difficulty.intermediate');
      case 'advanced':
        return this.translate.instant('msPractices.difficulty.advanced');
      default:
        return difficulty;
    }
  }

  getAppName(appId: string): string {
    const key = `msPractices.apps.${appId}.name`;
    
    // Try to get translation with a timeout
    try {
      const translation = this.translate.instant(key);
      console.log(`Getting translation for ${key}:`, translation);
      
      if (translation && translation !== key && translation !== '') {
        return translation;
      }
    } catch (error) {
      console.error('Translation error for', key, error);
    }
    
    // Return fallback
    return this.getFallbackName(appId);
  }

  getAppDescription(appId: string): string {
    const key = `msPractices.apps.${appId}.description`;
    const translation = this.translate.instant(key);
    if (translation && translation !== key) {
      return translation;
    }
    return this.getFallbackDescription(appId);
  }

  getAppSkills(appId: string): string[] {
    const key = `msPractices.apps.${appId}.skills`;
    const skills = this.translate.instant(key);
    if (Array.isArray(skills) && skills.length > 0) {
      return skills;
    }
    return this.getFallbackSkills(appId);
  }

  getAppEstimatedTime(appId: string): string {
    const key = `msPractices.apps.${appId}.estimatedTime`;
    const translation = this.translate.instant(key);
    if (translation && translation !== key) {
      return translation;
    }
    return this.getFallbackTime(appId);
  }

  private getFallbackName(appId: string): string {
    const fallbacks: { [key: string]: string } = {
      'outlook': 'Outlook',
      'word': 'Microsoft Word',
      'powerpoint': 'PowerPoint',
      'excel': 'Excel'
    };
    return fallbacks[appId] || appId;
  }

  private getFallbackDescription(appId: string): string {
    const fallbacks: { [key: string]: string } = {
      'outlook': 'Master email management, calendar scheduling, and task organization',
      'word': 'Create professional documents, reports, and formatted text',
      'powerpoint': 'Design engaging presentations with animations and transitions',
      'excel': 'Master spreadsheets, formulas, charts, and data analysis'
    };
    return fallbacks[appId] || '';
  }

  private getFallbackSkills(appId: string): string[] {
    const fallbacks: { [key: string]: string[] } = {
      'outlook': ['Email Management', 'Calendar Scheduling', 'Task Organization', 'Contact Management'],
      'word': ['Document Formatting', 'Tables & Lists', 'Headers & Footers', 'Styles & Templates'],
      'powerpoint': ['Slide Design', 'Animations', 'Transitions', 'Master Slides'],
      'excel': ['Formulas & Functions', 'Charts & Graphs', 'Data Analysis', 'Pivot Tables']
    };
    return fallbacks[appId] || [];
  }

  private getFallbackTime(appId: string): string {
    const fallbacks: { [key: string]: string } = {
      'outlook': '15-20 min',
      'word': '10-15 min',
      'powerpoint': '20-25 min',
      'excel': '25-30 min'
    };
    return fallbacks[appId] || '';
  }

  private resetSelection(): void {
    this.selectedApp = null;
    this.showAppDetails = false;
  }
}
