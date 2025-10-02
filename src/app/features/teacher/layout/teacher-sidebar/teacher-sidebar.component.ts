import { Component, EventEmitter, Input, Output, computed, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

interface NavItem {
  label: string;
  icon?: string;
  route?: string;
  badge?: string | number;
  section?: string | null;
  active?: boolean;
}

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}


@Component({
  selector: 'app-teacher-sidebar',
  standalone: true,
  imports: [NgIf, NgClass, RouterLink],
  templateUrl: './teacher-sidebar.component.html',
  styleUrls: ['./teacher-sidebar.component.scss'],
})
export class TeacherSidebarComponent implements OnInit, OnDestroy {
  @Input() isMobile = false;
  @Input() menuOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  private i18n = inject(I18nService);

  get isRTL(): boolean {
    return this.i18n.current === 'ar';
  }

  get currentLang(): string {
    return this.i18n.current;
  }

  translations: Translations = {
    'mySlidos': { en: 'My slidos', ar: 'سلايداتي' },
    'team': { en: 'Team', ar: 'الفريق' },
    'analytics': { en: 'Analytics', ar: 'التحليلات' },
    'tutorials': { en: 'Tutorials', ar: 'الدروس' },
    'integrations': { en: 'Integrations', ar: 'التكاملات' },
    'powerpoint': { en: 'PowerPoint', ar: 'باوربوينت' },
    'googleSlides': { en: 'Google Slides', ar: 'عروض جوجل' },
    'microsoftTeams': { en: 'Microsoft Teams', ar: 'فريق مايكروسوفت' },
    'webex': { en: 'Webex', ar: 'ويبكس' },
    'zoom': { en: 'Zoom', ar: 'زوم' },
    'organization': { en: 'Ahmed El Sayed', ar: 'أحمد السيد' },
    'owner': { en: 'Teacher', ar: 'مدرس' },
    'upgrade': { en: 'UPGRADE', ar: 'ترقية' }
  };

  navItems = signal<NavItem[]>([
    { section: 'mySlidos', label: 'mySlidos', icon: 'chart', active: true, route: '/teacher' },
    { label: 'team', icon: 'team' },
    { label: 'analytics', icon: 'analytics' },
    { label: 'tutorials', icon: 'tutorials' },
    { label: 'integrations', icon: 'integrations' },
    { section: 'integrations', label: 'powerpoint', icon: 'ppt' },
    { label: 'googleSlides', icon: 'gslides' },
    { label: 'microsoftTeams', icon: 'teams' },
    { label: 'webex', icon: 'webex' },
    { label: 'zoom', icon: 'zoom' },
  ]);

  sections = computed(() => {
    const map = new Map<string | null, NavItem[]>();
    for (const item of this.navItems()) {
      const section = item.section ?? '';
      if (!map.has(section)) {
        map.set(section, []);
      }
      map.get(section)!.push(item);
    }
    return Array.from(map.entries());
  });

  ngOnInit(): void {
    // Language detection is now handled by I18nService
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  getTranslation(key: string): string {
    const translation = this.translations[key as keyof typeof this.translations];
    return translation?.[this.currentLang as keyof typeof translation] || key;
  }

  onNavigate(): void {
    if (this.isMobile) {
      this.closeMenu.emit();
    }
  }
}
