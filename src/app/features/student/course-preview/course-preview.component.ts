import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { I18nService } from '../../../core/services/i18n.service';
import { AiBuilderService } from '../../../core/services/ai-builder.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

interface CoursePreview {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  category_name?: string;
  grade?: string;
  country?: string;
  teacher?: {
    name: string;
    avatar_url?: string;
  };
  sections: SectionPreview[];
  total_lessons: number;
  total_duration?: number;
  published?: boolean;
  rating?: number;
  student_count?: number;
}

interface SectionPreview {
  id: string;
  name: string;
  description?: string;
  position: number;
  isExpanded?: boolean;
  content_items: ContentPreview[];
  total_duration?: number;
  completed_count?: number;
  icon?: string;
}

interface ContentPreview {
  id: string;
  title: string;
  type: 'text' | 'video' | 'audio' | 'quiz' | 'resources';
  position: number;
  duration?: number;
  status?: 'completed' | 'locked' | 'next' | 'available';
  meta?: any;
}

@Component({
  selector: 'app-course-preview',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './course-preview.component.html',
  styleUrl: './course-preview.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        height: '0',
        overflow: 'hidden',
        opacity: 0
      })),
      state('expanded', style({
        height: '*',
        overflow: 'visible',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class CoursePreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly ai = inject(AiBuilderService);
  private readonly auth = inject(UniversalAuthService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentLang: string = 'ar';
  courseId: string | null = null;
  course: CoursePreview | null = null;
  loading: boolean = true;
  today = new Date();
  publishing: boolean = false;
  learningHighlights: string[] = [];
  relatedTopics: string[] = [];
  
  // Progress tracking
  completedLessons: number = 0;
  progressPercentage: number = 0;
  currentLessonIndex: number = 0;
  
  ngOnInit(): void {
    this.currentLang = this.i18n.current;

    // Get course ID from route
    this.route.params.subscribe(params => {
      if (params['courseId']) {
        this.courseId = params['courseId'];
        this.loadCoursePreview();
      } else {
        // Try to get from draft
        this.loadDraftCoursePreview();
      }
    });
  }
  
  async loadDraftCoursePreview(): Promise<void> {
    try {
      this.loading = true;
      const user = this.auth.getCurrentUser();
      const userId = user?.id;
      
      if (!userId) {
        this.router.navigate(['/student/dashboard']);
        return;
      }
      
      // Get draft course from AI service
      const response = await this.ai.getDraftCourse().toPromise();
      if (response && response.course) {
        this.courseId = String(response.course.id);
        await this.loadCourseDetails(String(response.course.id));
      }
    } catch (error) {
      console.error('Error loading draft course:', error);
      this.toastr.error(
        this.currentLang === 'ar' ? 'فشل في تحميل معاينة الدورة' : 'Failed to load course preview'
      );
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
  
  async loadCoursePreview(): Promise<void> {
    if (!this.courseId) return;
    await this.loadCourseDetails(this.courseId);
  }
  
  async loadCourseDetails(courseId: string): Promise<void> {
    try {
      this.loading = true;
      
      // Get draft course which includes sections
      const courseResponse = await this.ai.getDraftCourse().toPromise();
      if (!courseResponse || !courseResponse.course || String(courseResponse.course.id) !== courseId) {
        this.toastr.error(
          this.currentLang === 'ar' ? 'لم يتم العثور على الدورة' : 'Course not found'
        );
        return;
      }
      
      // Get content for each section
      const sections = courseResponse.sections || [];
      const sectionsWithContent = await Promise.all(
        sections.map(async (section) => {
          const contentResponse = await this.ai.getSectionContent(section.id).toPromise();
          return {
            ...section,
            content_items: contentResponse?.content || []
          };
        })
      );
      
      const response = {
        course: courseResponse.course,
        sections: sectionsWithContent
      };
      
      if (response) {
        // Transform the response to our preview format
        this.course = this.transformToCoursePreview(response);
        this.calculateProgress();
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      this.toastr.error(
        this.currentLang === 'ar' ? 'فشل في تحميل تفاصيل الدورة' : 'Failed to load course details'
      );
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
  
  private transformToCoursePreview(response: any): CoursePreview {
    const course = response.course || {};
    const sections = response.sections || [];
    
    // Calculate totals
    let totalLessons = 0;
    let totalDuration = 0;
    const transformedSections: SectionPreview[] = sections.map((section: any, sIndex: number) => {
      const contentItems = section.content_items || [];
      totalLessons += contentItems.length;
      const sectionDuration = this.calculateSectionDuration(contentItems);
      totalDuration += sectionDuration;
      
      return {
        id: String(section.id),
        name: section.name,
        description: section.description,
        position: section.position || sIndex + 1,
        isExpanded: false,
        content_items: contentItems.map((item: any, iIndex: number) => ({
          id: String(item.id),
          title: item.title,
          type: item.type,
          position: item.position || iIndex + 1,
          duration: this.estimateDuration(item),
          status: this.getContentStatus(sIndex, iIndex),
          meta: item.meta
        })),
        total_duration: sectionDuration,
        completed_count: 0,
        icon: this.getSectionIcon(contentItems)
      };
    });
    
    const preview: CoursePreview = {
      id: String(course.id),
      name: course.name || course.title,
      description: course.description,
      cover_image_url: course.cover_image_url,
      category_name: course.category_name,
      grade: course.grade,
      country: course.country,
      teacher: course.teacher || {
        name: this.currentLang === 'ar' ? 'المعلم' : 'Teacher',
        avatar_url: null
      },
      sections: transformedSections,
      total_lessons: totalLessons,
      total_duration: totalDuration,
      published: course.status === 'published' || course.published || false,
      rating: course.rating || 0, // Will be populated from backend when available
      student_count: course.student_count || 0 // Will be populated from backend when available
    };

    this.learningHighlights = this.buildLearningHighlights(transformedSections);
    this.relatedTopics = this.buildRelatedTopics(course, transformedSections);

    return preview;
  }
  
  private estimateDuration(item: any): number {
    // Estimate duration in minutes based on content type
    switch (item.type) {
      case 'text':
        // Estimate based on word count (200 words per minute)
        const words = item.body_html ? item.body_html.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
        return Math.ceil(words / 200);
      case 'video':
        return item.meta?.duration || 5;
      case 'audio':
        return item.meta?.duration || 3;
      case 'quiz':
        const questionCount = item.meta?.question_count || 5;
        return Math.ceil(questionCount * 0.5); // 30 seconds per question
      case 'resources':
        return 2;
      default:
        return 3;
    }
  }
  
  private calculateSectionDuration(items: any[]): number {
    return items.reduce((total, item) => total + this.estimateDuration(item), 0);
  }
  
  private getSectionIcon(items: any[]): string {
    // Determine section icon based on content types
    const hasQuiz = items.some(item => item.type === 'quiz');
    const hasVideo = items.some(item => item.type === 'video');
    const hasAudio = items.some(item => item.type === 'audio');
    
    if (hasQuiz) return '📝';
    if (hasVideo) return '🎥';
    if (hasAudio) return '🎧';
    return '📚';
  }
  
  private getContentStatus(sectionIndex: number, contentIndex: number): string {
    // Simple logic for demo - first item is 'next', others are 'available'
    if (sectionIndex === 0 && contentIndex === 0) return 'next';
    if (sectionIndex === 0) return 'available';
    return 'locked';
  }
  
  private calculateProgress(): void {
    if (!this.course) return;
    
    let totalItems = 0;
    let completedItems = 0;
    
    this.course.sections.forEach(section => {
      section.content_items.forEach(item => {
        totalItems++;
        if (item.status === 'completed') {
          completedItems++;
        }
      });
    });
    
    this.completedLessons = completedItems;
    this.progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }
  
  toggleSection(section: SectionPreview): void {
    section.isExpanded = !section.isExpanded;
    this.cdr.detectChanges();
  }
  
  getContentIcon(type: string): string {
    switch (type) {
      case 'text': return '📄';
      case 'video': return '🎥';
      case 'audio': return '🎧';
      case 'quiz': return '📝';
      case 'resources': return '📁';
      default: return '📄';
    }
  }

  getContentTypeLabel(type: string): string {
    const labels: Record<string, { ar: string; en: string }> = {
      'text': { ar: 'نص', en: 'Text' },
      'video': { ar: 'فيديو', en: 'Video' },
      'audio': { ar: 'صوت', en: 'Audio' },
      'quiz': { ar: 'اختبار', en: 'Quiz' },
      'resources': { ar: 'مورد', en: 'Resource' }
    };
    const label = labels[type] || { ar: 'محتوى', en: 'Content' };
    return this.currentLang === 'ar' ? label.ar : label.en;
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
  
  getStatusClass(status?: string): string {
    if (!status) return '';
    return `status-${status}`;
  }


  onContentClick(event: { sectionId: string; contentId: string }): void {
    // Handle content item click
    const section = this.course?.sections.find(s => s.id === event.sectionId);
    const content = section?.content_items.find(c => c.id === event.contentId);
    
    if (content) {
      // Navigate to content or handle click
      console.log('Content clicked:', content);
      // Handle content navigation
      // Sidebar stays open
    }
  }
  
  formatRating(rating?: number): string {
    if (!rating || rating === 0) {
      return this.currentLang === 'ar' ? 'غير متاح' : 'N/A';
    }
    return rating.toFixed(1);
  }

  formatStudentCount(count?: number): string {
    if (!count || count === 0) {
      return this.currentLang === 'ar' ? '0 طالب' : '0 students';
    }
    // Format with commas for thousands
    return count.toLocaleString() + (this.currentLang === 'ar' ? ' طالب' : ' students');
  }

  getCourseStatusLabel(): string {
    if (!this.course) return '';
    const isPublished = this.course.published;
    return isPublished 
      ? (this.currentLang === 'ar' ? 'منشور' : 'Published')
      : (this.currentLang === 'ar' ? 'مسودة' : 'Draft');
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return '';
    
    if (minutes < 60) {
      return this.currentLang === 'ar' 
        ? `${minutes} دقيقة`
        : `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (this.currentLang === 'ar') {
      return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
    } else {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }
  
  openContent(item: ContentPreview, section: SectionPreview): void {
    if (item.status === 'locked') {
      this.toastr.warning(
        this.currentLang === 'ar' 
          ? 'يجب إكمال الدروس السابقة أولاً'
          : 'Please complete previous lessons first'
      );
      return;
    }
    
    // Navigate to content viewer (to be implemented)
    console.log('Opening content:', item.title);
  }
  
  async publishCourse(): Promise<void> {
    if (!this.courseId || this.publishing) return;
    
    const confirmMsg = this.currentLang === 'ar' 
      ? 'هل أنت متأكد من نشر هذه الدورة؟ سيتمكن الطلاب من رؤيتها والتسجيل فيها.'
      : 'Are you sure you want to publish this course? Students will be able to see and enroll in it.';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      this.publishing = true;
      
      // Call publish API
      await this.ai.publishDraftCourse(Number(this.courseId)).toPromise();
      
      this.toastr.success(
        this.currentLang === 'ar' 
          ? 'تم نشر الدورة بنجاح!'
          : 'Course published successfully!'
      );
      
      // Navigate to success page or dashboard
      setTimeout(() => {
        this.router.navigate(['/student/dashboard']);
      }, 2000);
      
    } catch (error) {
      console.error('Error publishing course:', error);
      this.toastr.error(
        this.currentLang === 'ar' 
          ? 'فشل في نشر الدورة'
          : 'Failed to publish course'
      );
    } finally {
      this.publishing = false;
      this.cdr.detectChanges();
    }
  }
  
  backToBuilder(): void {
    this.router.navigate(['/student/starter']);
  }
  
  private buildLearningHighlights(sections: SectionPreview[]): string[] {
    const highlights: string[] = [];
    for (const section of sections) {
      if (section.name) {
        highlights.push(section.name);
      }
      section.content_items.forEach((item) => {
        if (item.title) {
          highlights.push(item.title);
        }
      });
    }
    return highlights.filter(Boolean).slice(0, 6);
  }

  private buildRelatedTopics(course: any, sections: SectionPreview[]): string[] {
    const topics = new Set<string>();
    if (course?.category_name) topics.add(course.category_name);
    if (course?.grade) topics.add(course.grade);
    if (course?.subject_slug) {
      topics.add(course.subject_slug.replace(/-/g, ' '));
    }
    sections.forEach(section => {
      if (section.name) topics.add(section.name);
    });
    return Array.from(topics).filter(Boolean).slice(0, 6);
  }

  getLearningPoints(): string[] {
    // Generate learning points based on course sections and content
    const points: string[] = [];
    
    if (this.currentLang === 'ar') {
      // Arabic learning points
      if (this.course?.sections && this.course.sections.length > 0) {
        this.course.sections.forEach((section, index) => {
          if (index < 3 && section.name) { // Show first 3 sections as learning points
            points.push(`إتقان ${section.name}`);
          }
        });
      }
      
      // Add default learning points if needed
      if (points.length < 6) {
        const defaults = [
          'فهم الأساسيات النظرية والتطبيقية',
          'تطبيق المفاهيم على مشاريع حقيقية',
          'حل التحديات والتمارين العملية',
          'بناء مشروع متكامل من البداية',
          'التعلم من أفضل الممارسات المهنية',
          'الحصول على شهادة إتمام معتمدة'
        ];
        points.push(...defaults.slice(0, 6 - points.length));
      }
    } else {
      // English learning points
      if (this.course?.sections && this.course.sections.length > 0) {
        this.course.sections.forEach((section, index) => {
          if (index < 3 && section.name) { // Show first 3 sections as learning points
            points.push(`Master ${section.name}`);
          }
        });
      }
      
      // Add default learning points if needed
      if (points.length < 6) {
        const defaults = [
          'Understand theoretical and practical fundamentals',
          'Apply concepts to real-world projects',
          'Solve practical challenges and exercises',
          'Build a complete project from scratch',
          'Learn from industry best practices',
          'Earn a verified completion certificate'
        ];
        points.push(...defaults.slice(0, 6 - points.length));
      }
    }
    
    return points.slice(0, 6); // Return maximum 6 points
  }
}
