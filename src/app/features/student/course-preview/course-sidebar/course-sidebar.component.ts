import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';

interface Section {
  id: string;
  name: string;
  description?: string;
  position: number;
  isExpanded?: boolean;
  content_items: ContentItem[];
  total_duration?: number;
  completed_count?: number;
  icon?: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'text' | 'video' | 'audio' | 'quiz' | 'resources';
  position: number;
  duration?: number;
  status?: 'completed' | 'locked' | 'next' | 'available';
  meta?: any;
}

@Component({
  selector: 'app-course-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-sidebar.component.html',
  styleUrls: ['./course-sidebar.component.scss']
})
export class CourseSidebarComponent implements OnInit {
  @Input() sections: Section[] = [];
  @Input() courseTitle: string = '';
  @Input() isOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();
  @Output() contentClick = new EventEmitter<{ sectionId: string; contentId: string }>();

  private i18n = inject(I18nService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentLang: string = 'ar';

  ngOnInit(): void {
    this.currentLang = this.i18n.current;
    this.i18n.lang$.subscribe(lang => {
      this.currentLang = lang;
      this.cdr.detectChanges();
    });
  }

  toggleSection(section: Section): void {
    section.isExpanded = !section.isExpanded;
  }

  onContentClick(sectionId: string, contentId: string): void {
    this.contentClick.emit({ sectionId, contentId });
  }

  getContentIcon(type: string): string {
    const icons: Record<string, string> = {
      'text': '📄',
      'video': '🎥',
      'audio': '🎧',
      'quiz': '🧠',
      'resources': '📁'
    };
    return icons[type] || '📄';
  }

  getStatusClass(status?: string): string {
    if (!status) return '';
    return `status-${status}`;
  }

  getStatusLabel(status?: string): string {
    if (!status) return '';
    const labels: Record<string, string> = {
      completed: this.currentLang === 'ar' ? 'مكتمل' : 'Completed',
      locked: this.currentLang === 'ar' ? 'مقفل' : 'Locked',
      next: this.currentLang === 'ar' ? 'التالي' : 'Next',
      available: this.currentLang === 'ar' ? 'متاح' : 'Available'
    };
    return labels[status] || '';
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')} ${this.currentLang === 'ar' ? 'ساعة' : 'hr'}`;
    }
    return `${minutes} ${this.currentLang === 'ar' ? 'دقيقة' : 'min'}`;
  }

  trackBySectionId(index: number, section: Section): string {
    return section.id;
  }

  trackByContentId(index: number, item: ContentItem): string {
    return item.id;
  }
}

