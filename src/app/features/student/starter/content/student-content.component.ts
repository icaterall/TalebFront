import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewEncapsulation, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, firstValueFrom } from 'rxjs';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

import {
  AiBuilderService,
  ContentItem,
  Section,
  DraftCourseResponse
} from '../../../../core/services/ai-builder.service';
import { I18nService } from '../../../../core/services/i18n.service';
import { VideoUploadService } from '../services/video-upload.service';
import { VideoDetails, YouTubeVideoData } from '../types/video.types';
import { CKEditor5CustomUploadAdapter, UploadedEditorImageAsset } from '../custom-uploader';
import { UniversalAuthService } from '../../../../core/services/universal-auth.service';

interface ContentBlock {
  id?: number | string;
  content_id?: number;
  block_type: 'text' | 'video' | 'audio' | 'file';
  title?: string | null;
  body_html?: string | null;
  asset_id?: number | null;
  meta?: Record<string, unknown> | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-student-content',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, CKEditorModule, DragDropModule],
  templateUrl: './student-content.component.html',
  styleUrls: ['./student-content.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StudentContentComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ai = inject(AiBuilderService);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);
  private i18nService = inject(I18nService);
  private sanitizer = inject(DomSanitizer);
  private videoUploadService = inject(VideoUploadService);
  private http = inject(HttpClient);
  private universalAuth = inject(UniversalAuthService);

  private readonly baseUrl = environment.apiUrl;
  private readonly contentImageUploadUrl = `${this.baseUrl}/courses/draft/content/images`;
  private readonly VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly VIDEO_ACCEPTED_FORMATS = ['video/mp4', 'video/x-msvideo', '.mp4', '.avi'];

  @Input() content: ContentItem | undefined;
  contentId: string | null = null;
  contentItem: ContentItem | null = null;
  section: Section | null = null;
  sectionTitle: string | null = null;
  courseId: number | undefined = undefined;
  courseName: string | null = null;
  loading = true;
  
  // Lesson Builder State
  lessonBlocks: ContentBlock[] = [];
  selectedBlockId: number | string | null = null;
  selectedBlock: ContentBlock | null = null;
  editingLessonTitle = '';
  lessonHint = '';
  showBlockTypeChooser = false;
  
  // Video State
  videoTab: 'youtube-ai' | 'youtube-manual' | 'upload' = 'youtube-ai';
  youtubeSuggestions: YouTubeVideoData[] = [];
  youtubeSearchQuery = '';
  loadingYouTubeSuggestions = false;
  manualYouTubeVideo: YouTubeVideoData | null = null;
  fetchingYouTubeMetadata = false;
  
  uploadedVideoFile: File | null = null;
  uploadedVideoMetadata: { duration: number; durationFormatted?: string; width?: number; height?: number; thumbnail?: string; fileSize?: number } | null = null;
  uploadedVideoTitle = '';
  blockVideoUploadProgress = 0;
  blockVideoUploadError: string | null = null;
  uploadingVideo = false;
  
  showUploadedVideoModal = false;
  previewingUploadedVideo: { title: string; url?: string; duration?: string; thumbnail?: string } | null = null;
  
  editingUploadedVideoTitle = false;
  savingVideoTitle = false;
  deletingBlockVideo = false;
  showDeleteVideoModal = false;

  // YouTube Preview
  previewingYouTubeVideo: YouTubeVideoData | null = null;
  showYouTubePreviewModal = false;

  // Text AI State
  generatingTextBlock = false;
  currentDhikr = '';
  textEditorDhikrInterval: any = null;

  // Editor state
  Editor = DecoupledEditor;
  editorConfig = {
    language: 'en',
    placeholder: 'Type your content here...',
    toolbar: {
      items: [
        'heading', '|',
        'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'alignment', '|',
        'numberedList', 'bulletedList', '|',
        'outdent', 'indent', '|',
        'link', 'blockQuote', 'insertTable', 'mediaEmbed', '|',
        'undo', 'redo'
      ]
    }
  };
  
  textContent = '';
  isSaving = false;

  private subscriptions: Subscription[] = [];
  private saveBlocksTimeout: any = null;
  private blockEditors: Map<string | number, DecoupledEditor> = new Map();
  private uploadingImageUrls: Set<string> = new Set<string>();
  private pendingImageUploads: Map<string, UploadedEditorImageAsset> = new Map<string, UploadedEditorImageAsset>();

  // Warning Modal
  showWarningModal = false;
  warningModalType: 'deleteBlock' | 'deleteContent' | 'goBack' | null = null;
  blockToDelete: string | number | null = null;
  isDeletingBlock = false;
  isDeletingContent = false;

  get currentLang(): string {
    return this.i18nService.current;
  }
  
  get isRTL(): boolean {
    return this.currentLang === 'ar';
  }

  ngOnInit(): void {
    // Handle Input if provided (legacy/embedded mode)
    if (this.content) {
      this.initializeWithContent(this.content);
      return;
    }

    // Handle Route
    this.route.paramMap.subscribe(params => {
      const contentId = params.get('contentId');
      const sectionId = this.route.snapshot.queryParamMap.get('sectionId');

      if (contentId && sectionId) {
        this.contentId = contentId;
        this.loadContentFromApi(sectionId, contentId);
      }
    });
  }

  initializeWithContent(content: ContentItem) {
    this.content = content;
    this.contentId = content.id;
    this.editingLessonTitle = content.title;
    if (content.meta && (content.meta as any).hint) {
      this.lessonHint = (content.meta as any).hint;
    }
    this.loadLessonBlocks(content.id);
    this.loading = false;
  }

  loadContentFromApi(sectionId: string, contentId: string) {
    this.loading = true;
    
    // Load draft course to get section and course information
    this.ai.getDraftCourse().subscribe({
      next: (courseResponse) => {
        if (courseResponse && courseResponse.course) {
          this.courseName = courseResponse.course.name;
          this.courseId = courseResponse.course.id;
          
          // Find the section to get its name
          if (courseResponse.sections) {
            const section = courseResponse.sections.find((s: any) => String(s.id) === String(sectionId));
            if (section) {
              this.sectionTitle = section.name;
            }
          }
        }
        
        // Now load content
        this.ai.getSectionContent(sectionId).subscribe({
          next: (response) => {
            if (response && response.content) {
              const item = response.content.find((c: any) => String(c.id) === String(contentId));
              if (item) {
                // Get course_id from content record if available
                if (item.course_id && !this.courseId) {
                  this.courseId = item.course_id;
                }
                
                // Map SectionContentRecord to ContentItem
                const contentItem: ContentItem = {
                  id: String(item.id),
                  type: item.type as any,
                  title: item.title,
                  section_id: String(sectionId),
                  createdAt: item.created_at,
                  updatedAt: item.updated_at,
                  meta: item.meta,
                  position: item.position,
                  status: item.status === true || item.status === 'true',
                  assets: item.assets
                };
                this.initializeWithContent(contentItem);
              } else {
                this.toastr.error(this.isRTL ? 'لم يتم العثور على المحتوى' : 'Content not found');
                this.loading = false;
              }
            } else {
              this.loading = false;
            }
          },
          error: (err) => {
            console.error('Error loading content:', err);
            this.toastr.error(this.isRTL ? 'حدث خطأ أثناء تحميل المحتوى' : 'Error loading content');
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading draft course:', err);
        // Continue loading content even if course load fails
        this.ai.getSectionContent(sectionId).subscribe({
          next: (response) => {
            if (response && response.content) {
              const item = response.content.find((c: any) => String(c.id) === String(contentId));
              if (item) {
                // Get course_id from content record if available
                if (item.course_id) {
                  this.courseId = item.course_id;
                }
                
                const contentItem: ContentItem = {
                  id: String(item.id),
                  type: item.type as any,
                  title: item.title,
                  section_id: String(sectionId),
                  createdAt: item.created_at,
                  updatedAt: item.updated_at,
                  meta: item.meta,
                  position: item.position,
                  status: item.status === true || item.status === 'true',
                  assets: item.assets
                };
                this.initializeWithContent(contentItem);
              } else {
                this.toastr.error(this.isRTL ? 'لم يتم العثور على المحتوى' : 'Content not found');
                this.loading = false;
              }
            } else {
              this.loading = false;
            }
          },
          error: (err) => {
            console.error('Error loading content:', err);
            this.toastr.error(this.isRTL ? 'حدث خطأ أثناء تحميل المحتوى' : 'Error loading content');
            this.loading = false;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTextEditorDhikrRotation();
    if (this.saveBlocksTimeout) {
      clearTimeout(this.saveBlocksTimeout);
    }
  }

  loadLessonBlocks(contentId: string | number): void {
    if (!this.content || !this.content.section_id) return;

    this.ai.getContentBlocks(this.content.section_id, contentId).subscribe({
      next: (response) => {
        if (response && response.content && Array.isArray(response.content)) {
          this.lessonBlocks = response.content.map((block: any) => ({
            id: block.id,
            block_type: block.block_type as 'text' | 'video' | 'audio' | 'file',
            title: block.title || '',
            body_html: block.body_html || '',
            asset_id: block.asset_id,
            meta: block.meta || {},
            position: block.position
          }));
        } else {
          this.lessonBlocks = [];
        }
        
        // Ensure positions are correct
        this.lessonBlocks.forEach((block, index) => {
          block.position = index + 1;
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading blocks from API:', error);
        this.lessonBlocks = [];
      }
    });
  }

  addBlock(type: 'text' | 'video' | 'audio' | 'file'): void {
    const newBlock: ContentBlock = {
      id: `temp-${Date.now()}`,
      block_type: type,
      title: '',
      body_html: '',
      position: this.lessonBlocks.length + 1,
      meta: {}
    };

    this.lessonBlocks.push(newBlock);
    this.selectedBlock = newBlock;
    this.selectedBlockId = newBlock.id || null;
    this.showBlockTypeChooser = false;
    
    // Save immediately to create record
    this.saveBlock(newBlock);
  }

  selectBlock(blockId: string | number | undefined): void {
    if (!blockId) return;
    this.selectedBlockId = blockId;
    this.selectedBlock = this.lessonBlocks.find(b => b.id === blockId) || null;
    
    // Reset video tab state if switching blocks
    if (this.selectedBlock?.block_type === 'video') {
      // Initialize video tab based on content
      if (this.selectedBlock.meta?.['source'] === 'local') {
        this.videoTab = 'upload';
      } else if (this.selectedBlock.meta?.['source'] === 'youtube') {
        this.videoTab = 'youtube-manual'; 
      } else {
        this.videoTab = 'youtube-ai';
      }
    }
  }

  saveBlock(block: ContentBlock): void {
    if (!this.content || !this.content.section_id) return;

    const payload = {
      block_type: block.block_type,
      title: block.title,
      body_html: block.body_html,
      position: block.position,
      meta: block.meta || {},
      asset_id: block.asset_id
    };

    const isTemp = String(block.id).startsWith('temp-');

    if (isTemp) {
      this.ai.createContentBlock(this.content.section_id, this.content.id, payload).subscribe({
        next: (response) => {
          if (response && response.content) {
            block.id = response.content.id;
            this.cdr.detectChanges();
          }
        },
        error: (error) => console.error('Error creating block:', error)
      });
    } else {
      if (block.id) {
        this.ai.updateContentBlock(this.content.section_id, this.content.id, block.id, payload).subscribe({
          next: () => {
            // Success
          },
          error: (error) => console.error('Error updating block:', error)
        });
      }
    }
  }

  deleteBlock(blockId: string | number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.blockToDelete = blockId;
    this.warningModalType = 'deleteBlock';
    this.showWarningModal = true;
  }

  confirmDeleteBlock(): void {
    if (!this.blockToDelete || !this.content || !this.content.section_id) return;

    const blockId = this.blockToDelete;
    const index = this.lessonBlocks.findIndex(b => b.id === blockId);
    if (index === -1) {
      this.closeWarningModal();
      return;
    }

    this.isDeletingBlock = true;
    const block = this.lessonBlocks[index];
    
    // Optimistic update
    this.lessonBlocks.splice(index, 1);
    if (this.selectedBlockId === blockId) {
      this.selectedBlockId = null;
      this.selectedBlock = null;
    }

    if (!String(blockId).startsWith('temp-')) {
      this.ai.deleteContentBlock(this.content.section_id, this.content.id, blockId).subscribe({
        next: () => {
          this.isDeletingBlock = false;
          this.closeWarningModal();
        },
        error: (error) => {
          console.error('Error deleting block:', error);
          // Revert on error
          this.lessonBlocks.splice(index, 0, block);
          this.isDeletingBlock = false;
          this.closeWarningModal();
          this.cdr.detectChanges();
        }
      });
    } else {
      this.isDeletingBlock = false;
      this.closeWarningModal();
    }
  }

  confirmDeleteContent(): void {
    // Implementation for deleting the entire content item if needed
    // For now, just close the modal as this might be handled by parent or not fully implemented here
    this.closeWarningModal();
  }

  goBack(): void {
    // Check if there are unsaved changes
    const hasUnsavedChanges = this.hasUnsavedChanges();
    
    if (hasUnsavedChanges) {
      this.warningModalType = 'goBack';
      this.showWarningModal = true;
    } else {
      this.navigateBack();
    }
  }

  confirmGoBack(): void {
    this.closeWarningModal();
    this.navigateBack();
  }

  cancelGoBack(): void {
    this.closeWarningModal();
  }

  cancelDeleteBlock(): void {
    this.closeWarningModal();
  }

  private hasUnsavedChanges(): boolean {
    // Check if there are any unsaved changes
    // This could check if blocks have been modified, title changed, etc.
    // For now, we'll show the warning if there are any blocks
    return this.lessonBlocks.length > 0 || this.editingLessonTitle.trim().length > 0;
  }

  private navigateBack(): void {
    // Navigate back to the section/course preview
    // Get sectionId from route query params or content
    const sectionId = this.route.snapshot.queryParamMap.get('sectionId') || this.content?.section_id;
    
    if (sectionId) {
      this.router.navigate(['/student/starter'], { 
        queryParams: { sectionId: sectionId },
        fragment: 'sections'
      });
    } else {
      // Fallback: navigate to starter page
      this.router.navigate(['/student/starter']);
    }
  }

  closeWarningModal(): void {
    this.showWarningModal = false;
    this.warningModalType = null;
    this.blockToDelete = null;
    this.isDeletingBlock = false;
    this.isDeletingContent = false;
  }

  onBlockDrop(event: CdkDragDrop<ContentBlock[]>): void {
    moveItemInArray(this.lessonBlocks, event.previousIndex, event.currentIndex);
    
    // Update positions
    this.lessonBlocks.forEach((block, index) => {
      block.position = index + 1;
    });

    // Save new order
    if (this.content && this.content.section_id) {
      const positions = this.lessonBlocks
        .filter(b => b.id !== undefined)
        .map(b => ({
          id: b.id!,
          position: b.position
        }));
      
      this.ai.reorderContentBlocks(this.content.section_id, this.content.id, positions).subscribe();
    }
  }

  onEditorReady(editor: any, blockId?: string | number, toolbarContainer?: HTMLElement): void {
    if (toolbarContainer && editor.ui.view.toolbar.element) {
      // Insert toolbar into the provided container
      toolbarContainer.appendChild(editor.ui.view.toolbar.element);
    } else {
      // Fallback: insert before editable element
      const editableElement = editor.ui.getEditableElement();
      if (editableElement && editableElement.parentElement) {
        editableElement.parentElement.insertBefore(
          editor.ui.view.toolbar.element,
          editableElement
        );
      }
    }
    
    // Store editor reference if blockId is provided
    if (blockId) {
      this.blockEditors.set(blockId, editor);
    }
  }

  // Helper methods
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private startTextEditorDhikrRotation(): void {
    this.stopTextEditorDhikrRotation();
    
    const dhikrPhrases = this.currentLang === 'ar' 
      ? ['أستغفر الله العظيم', 'سبحان الله', 'الحمد لله', 'لا إله إلا الله', 'الله أكبر']
      : ['Astaghfirullah', 'SubhanAllah', 'Alhamdulillah', 'La ilaha illallah', 'Allahu Akbar'];
    
    let index = 0;
    this.currentDhikr = dhikrPhrases[0];
    
    this.textEditorDhikrInterval = setInterval(() => {
      index = (index + 1) % dhikrPhrases.length;
      this.currentDhikr = dhikrPhrases[index];
      this.cdr.detectChanges();
    }, 2000);
  }

  private stopTextEditorDhikrRotation(): void {
    if (this.textEditorDhikrInterval) {
      clearInterval(this.textEditorDhikrInterval);
      this.textEditorDhikrInterval = null;
    }
    this.currentDhikr = '';
    this.cdr.detectChanges();
  }

  // Video Methods
  onVideoFileSelectedForBlock(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file type
    const isValidType = this.VIDEO_ACCEPTED_FORMATS.some(format => 
      format.startsWith('.') ? file.name.toLowerCase().endsWith(format) : file.type === format
    );

    if (!isValidType) {
      this.blockVideoUploadError = this.currentLang === 'ar'
        ? 'نوع الملف غير مدعوم. يرجى اختيار ملف فيديو صالح (MP4, AVI)'
        : 'Unsupported file type. Please select a valid video file (MP4, AVI)';
      return;
    }

    // Validate file size
    if (file.size > this.VIDEO_MAX_SIZE) {
      this.blockVideoUploadError = this.currentLang === 'ar'
        ? `حجم الملف كبير جداً. الحد الأقصى ${Math.round(this.VIDEO_MAX_SIZE / (1024 * 1024))} ميجابايت`
        : `File size too large. Maximum ${Math.round(this.VIDEO_MAX_SIZE / (1024 * 1024))} MB allowed`;
      return;
    }

    this.uploadedVideoFile = file;
    this.uploadedVideoTitle = file.name.replace(/\.[^/.]+$/, "");
    this.blockVideoUploadError = null;
    
    // Extract metadata
    this.videoUploadService.extractVideoMetadata(file)
      .then(metadata => {
        this.uploadedVideoMetadata = {
          ...metadata,
          durationFormatted: this.formatDuration(metadata.duration)
        };
        this.cdr.detectChanges();
      })
      .catch(error => {
        console.error('Failed to extract video metadata:', error);
        this.uploadedVideoMetadata = {
          duration: 0,
          durationFormatted: '0:00',
          width: 0,
          height: 0
        };
        this.cdr.detectChanges();
      });
  }

  async uploadVideoForBlock(): Promise<void> {
    if (!this.uploadedVideoFile || !this.content || !this.content.section_id || !this.selectedBlockId) return;

    this.uploadingVideo = true;
    this.blockVideoUploadProgress = 0;
    this.cdr.detectChanges();

    const progressSub = this.videoUploadService.getUploadProgress().subscribe(progress => {
      this.blockVideoUploadProgress = Math.min(99, Math.max(10, progress));
      this.cdr.detectChanges();
    });

    try {
      const metadata = this.uploadedVideoMetadata;
      const response = await firstValueFrom(this.videoUploadService.uploadVideo(
        this.uploadedVideoFile,
        Number(this.content.id),
        metadata ? {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height
        } : undefined
      ));

      progressSub.unsubscribe();
      this.blockVideoUploadProgress = 100;

      // Update block with video info
      const block = this.lessonBlocks.find(b => b.id === this.selectedBlockId);
      if (block) {
        block.meta = {
          ...block.meta,
          source: 'local',
          fileName: this.uploadedVideoFile.name,
          fileSize: this.uploadedVideoFile.size,
          duration: metadata?.duration,
          durationFormatted: metadata?.durationFormatted,
          dataUrl: response.asset.url,
          assetId: response.asset.id,
          videoUrl: response.asset.url,
          // videoThumbnail: metadata?.thumbnail,
          videoDuration: metadata?.durationFormatted,
          videoFileSize: this.uploadedVideoFile.size,
          videoWidth: metadata?.width,
          videoHeight: metadata?.height
        };
        block.asset_id = response.asset.id;
        block.title = this.uploadedVideoTitle;

        this.saveBlock(block);
      }

      this.showUploadedVideoModal = false;
      this.uploadedVideoFile = null;
      this.uploadedVideoMetadata = null;
      this.uploadedVideoTitle = '';
      
    } catch (error: any) {
      progressSub.unsubscribe();
      console.error('Error uploading video:', error);
      
      if (error.status === 413) {
        this.blockVideoUploadError = this.currentLang === 'ar' 
          ? 'حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت'
          : 'File size too large. Maximum 100 MB allowed';
      } else {
        this.blockVideoUploadError = this.currentLang === 'ar'
          ? 'حدث خطأ أثناء رفع الفيديو'
          : 'Error uploading video';
      }
    } finally {
      this.uploadingVideo = false;
      this.cdr.detectChanges();
    }
  }

  deleteUploadedVideo(): void {
    if (!this.selectedBlockId) return;
    
    const block = this.lessonBlocks.find(b => b.id === this.selectedBlockId);
    if (block) {
      block.meta = {};
      block.asset_id = null;
      this.saveBlock(block);
    }
  }

  previewUploadedVideo(): void {
    if (this.uploadedVideoFile) {
      this.previewingUploadedVideo = {
        title: this.uploadedVideoTitle,
        url: URL.createObjectURL(this.uploadedVideoFile),
        duration: this.uploadedVideoMetadata?.durationFormatted
      };
      this.showUploadedVideoModal = true;
    } else if (this.selectedBlock?.meta?.['videoUrl']) {
      this.previewingUploadedVideo = {
        title: this.selectedBlock.title || 'Video',
        url: this.selectedBlock.meta['videoUrl'] as string,
        duration: this.selectedBlock.meta['videoDuration'] as string
      };
      this.showUploadedVideoModal = true;
    }
  }

  closeUploadedVideoModal(): void {
    this.showUploadedVideoModal = false;
    this.previewingUploadedVideo = null;
  }

  getUploadedVideoUrl(): string | undefined {
    return this.previewingUploadedVideo?.url;
  }

  editUploadedVideoTitle(): void {
    this.editingUploadedVideoTitle = true;
  }

  saveUploadedVideoTitle(): void {
    if (!this.uploadedVideoTitle.trim()) return;
    
    this.savingVideoTitle = true;
    
    if (this.selectedBlock) {
      this.selectedBlock.title = this.uploadedVideoTitle;
      this.saveBlock(this.selectedBlock);
    }
    
    this.editingUploadedVideoTitle = false;
    this.savingVideoTitle = false;
  }

  cancelEditUploadedVideoTitle(): void {
    this.editingUploadedVideoTitle = false;
    if (this.selectedBlock) {
      this.uploadedVideoTitle = this.selectedBlock.title || '';
    }
  }

  removeUploadedVideoFile(): void {
    this.uploadedVideoFile = null;
    this.uploadedVideoMetadata = null;
    this.uploadedVideoTitle = '';
  }

  validateVideoTitle(): void {
    if (!this.uploadedVideoTitle.trim()) {
      // Show error or handle invalid state
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
  }


  // YouTube Methods
  suggestVideoTitle(): void {
    // Use content title (lesson title) - required
    const contentTitle = this.editingLessonTitle?.trim() || 
                        this.content?.title?.trim() || 
                        '';
    
    if (!contentTitle) {
      this.toastr.warning(
        this.currentLang === 'ar' 
          ? 'يرجى إدخال عنوان للدرس أولاً' 
          : 'Please enter a lesson title first'
      );
      return;
    }

    // Get hint from content meta or lessonHint
    const hint = this.lessonHint?.trim() || 
                 (this.content?.meta && (this.content.meta as any).hint) || 
                 '';

    this.loadingYouTubeSuggestions = true;
    this.youtubeSuggestions = []; // Clear previous suggestions
    
    this.ai.suggestYouTubeVideos({
      contentTitle: contentTitle,
      hint: hint || undefined,
      courseId: this.courseId,
      sectionTitle: this.sectionTitle || undefined
    }).subscribe({
      next: (response) => {
        this.youtubeSuggestions = response.videos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          duration: v.durationSeconds || 0,
          durationFormatted: v.durationSeconds ? this.formatDuration(v.durationSeconds) : '',
          thumbnail: v.thumbnail,
          embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
          channelTitle: v.channelTitle || '',
          viewCount: typeof v.viewCount === 'number' ? v.viewCount : (typeof v.viewCount === 'string' ? parseInt(v.viewCount, 10) || 0 : 0),
          publishedAt: v.publishedAt || undefined
        }));
        this.loadingYouTubeSuggestions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error searching YouTube:', error);
        this.loadingYouTubeSuggestions = false;
        this.toastr.error(
          this.currentLang === 'ar' 
            ? 'حدث خطأ أثناء البحث عن فيديوهات YouTube' 
            : 'Error searching for YouTube videos'
        );
        this.cdr.detectChanges();
      }
    });
  }

  isYouTubeVideoSelected(video: YouTubeVideoData): boolean {
    if (!this.selectedBlock || !this.selectedBlock.meta) return false;
    return this.selectedBlock.meta['youtubeVideoId'] === video.videoId;
  }

  previewYouTubeVideo(video: YouTubeVideoData, event?: Event): void {
    if (event) event.stopPropagation();
    this.previewingYouTubeVideo = video;
    this.showYouTubePreviewModal = true;
  }

  closeYouTubePreviewModal(): void {
    this.showYouTubePreviewModal = false;
    this.previewingYouTubeVideo = null;
  }

  openYouTubeVideo(videoId: string): void {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }

  useYouTubeVideo(video: YouTubeVideoData): void {
    this.selectYouTubeVideo(video);
    this.closeYouTubePreviewModal();
  }

  getYouTubeUrl(): string {
    if (this.manualYouTubeVideo && this.manualYouTubeVideo.videoId) {
      return `https://www.youtube.com/watch?v=${this.manualYouTubeVideo.videoId}`;
    }
    return '';
  }

  setYouTubeUrl(url: string): void {
    const videoId = this.extractYouTubeVideoId(url);
    if (videoId) {
      this.manualYouTubeVideo = {
        videoId: videoId,
        title: '',
        description: '',
        duration: 0,
        thumbnail: '',
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };
    } else {
      this.manualYouTubeVideo = null;
    }
  }

  fetchYouTubeMetadataForBlock(): void {
    if (!this.manualYouTubeVideo || !this.manualYouTubeVideo.videoId) return;

    this.fetchingYouTubeMetadata = true;
    this.ai.getYouTubeMetadata(this.manualYouTubeVideo.videoId).subscribe({
      next: (data) => {
        this.manualYouTubeVideo = {
          videoId: data.videoId,
          title: data.title,
          description: data.description,
          duration: this.parseYouTubeDuration(data.duration),
          thumbnail: data.thumbnail,
          embedUrl: data.embedUrl
        };
        this.fetchingYouTubeMetadata = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching YouTube metadata:', error);
        this.fetchingYouTubeMetadata = false;
      }
    });
  }

  useManualYouTubeVideo(): void {
    if (this.manualYouTubeVideo) {
      this.selectYouTubeVideo(this.manualYouTubeVideo);
    }
  }

  selectYouTubeVideo(video: YouTubeVideoData): void {
    if (!this.selectedBlockId) return;

    const block = this.lessonBlocks.find(b => b.id === this.selectedBlockId);
    if (block) {
      block.meta = {
        ...block.meta,
        source: 'youtube',
        youtubeVideoId: video.videoId,
        youtubeEmbedUrl: video.embedUrl,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        duration: video.duration,
        durationFormatted: this.formatDuration(video.duration)
      };
      block.title = video.title;
      
      this.saveBlock(block);
    }
  }

  private parseYouTubeDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  // AI Content Generation
  generateTextBlockWithAI(): void {
    if (!this.selectedBlockId || !this.lessonHint.trim()) return;

    this.generatingTextBlock = true;
    this.startTextEditorDhikrRotation();

    // Simulate AI generation for now or implement actual call if available
    // Assuming we want to generate text content for a block
    
    // TODO: Implement actual AI generation call
    setTimeout(() => {
      const block = this.lessonBlocks.find(b => b.id === this.selectedBlockId);
      if (block) {
        block.body_html = `<p>Generated content based on: ${this.lessonHint}</p>`;
        this.saveBlock(block);
      }
      this.generatingTextBlock = false;
      this.stopTextEditorDhikrRotation();
      this.cdr.detectChanges();
    }, 2000);
  }

  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  removeSelectedYouTubeVideo(): void {
    if (!this.selectedBlockId) return;
    
    const block = this.lessonBlocks.find(b => b.id === this.selectedBlockId);
    if (block) {
      block.meta = {};
      this.saveBlock(block);
    }
  }

  getBlockTypeLabel(blockType: 'text' | 'video' | 'audio' | 'file'): string {
    const labels = {
      text: this.currentLang === 'ar' ? 'نص' : 'Text',
      video: this.currentLang === 'ar' ? 'فيديو' : 'Video',
      audio: this.currentLang === 'ar' ? 'صوت' : 'Audio',
      file: this.currentLang === 'ar' ? 'ملف' : 'File'
    };
    return labels[blockType] || blockType;
  }

  saveContent(): void {
    if (!this.content || !this.content.section_id || this.isSaving) return;

    this.isSaving = true;
    
    // Save the lesson title
    const payload = {
      title: this.editingLessonTitle.trim(),
      meta: {
        ...this.content.meta,
        hint: this.lessonHint
      }
    };

    this.ai.updateSectionContent(this.content.section_id, this.content.id, payload).subscribe({
      next: () => {
        if (this.content) {
          this.content.title = this.editingLessonTitle.trim();
          if (this.content.meta) {
            (this.content.meta as any).hint = this.lessonHint;
          }
        }
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error saving content:', error);
        this.toastr.error(this.isRTL ? 'حدث خطأ أثناء حفظ المحتوى' : 'Error saving content');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
