import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener, ViewEncapsulation, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import {
  AiBuilderService,
  CourseDraft,
  ContentItem,
  ContentAsset,
  Section,
  SectionTitleSuggestion,
  ResourceDetails,
  DraftCourseResponse,
  DraftCourseSectionResponse,
  CreateDraftCoursePayload,
  UpdateDraftCoursePayload,
  SectionContentRecord,
  CreateSectionContentPayload,
  UploadResourceResponse,
  QuizQuestion,
  QuizQuestionPayload,
  CreateQuizQuestionPayload,
  GenerateQuizPayload
} from '../../../core/services/ai-builder.service';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { skip, finalize } from 'rxjs/operators';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { CKEditor5CustomUploadAdapter, UploadedEditorImageAsset } from './custom-uploader';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { CategorySelectorComponent } from './components/category-selector/category-selector.component';
import { CoverImageComponent } from './components/cover-image/cover-image.component';
import { VideoSource, VideoFormState, VideoDetails, YouTubeVideoData } from './types/video.types';
import { VideoUploadService } from './services/video-upload.service';
import { AudioSource, AudioFormState, AudioMetadata, AudioGenerationRequest } from './types/audio.types';
import { AudioUploadService } from './services/audio-upload.service';
import { GeographyService, Country } from '../../../core/services/geography.service';
interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order?: number;
}

type ResourceDisplayType = 'pdf' | 'word' | 'excel' | 'ppt' | 'compressed';

type ResourcePreviewMode = 'inline' | 'download';

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

interface ResourceFormState {
  title: string;
  description: string;
  displayType: ResourceDisplayType;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string | null;
  previewMode: ResourcePreviewMode;
  pageCount: number | null;
}

@Component({
  selector: 'app-student-starter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, CKEditorModule, DragDropModule, CategorySelectorComponent, CoverImageComponent],
  templateUrl: './student-starter.component.html',
  styleUrls: ['./student-starter.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('600ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class StudentStarterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly geographyService = inject(GeographyService);
  private readonly ai = inject(AiBuilderService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly baseUrl = environment.apiUrl;
  private readonly contentImageUploadUrl = `${this.baseUrl}/courses/draft/content/images`;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toastr = inject(ToastrService);
  private readonly videoUploadService = inject(VideoUploadService);
  private readonly audioUploadService = inject(AudioUploadService);
  
  private readonly RESOURCE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly RESOURCE_INLINE_PREVIEW_LIMIT = 5 * 1024 * 1024; // 5MB for inline previews

  readonly resourceTypeOptions: { value: ResourceDisplayType; icon: string; labelEn: string; labelAr: string; previewable: boolean; extensions: string[]; }[] = [
    { value: 'compressed', icon: '🗜️', labelEn: 'Archive (ZIP/RAR)', labelAr: 'ملف مضغوط (ZIP/RAR)', previewable: false, extensions: ['zip', 'rar'] },
    { value: 'pdf', icon: '📄', labelEn: 'PDF Document', labelAr: 'ملف PDF', previewable: true, extensions: ['pdf'] },
    { value: 'ppt', icon: '📽️', labelEn: 'Presentation', labelAr: 'عرض تقديمي', previewable: false, extensions: ['ppt', 'pptx'] },
    { value: 'excel', icon: '📊', labelEn: 'Excel Spreadsheet', labelAr: 'ملف Excel', previewable: false, extensions: ['xls', 'xlsx'] },
    { value: 'word', icon: '📝', labelEn: 'Word Document', labelAr: 'ملف Word', previewable: false, extensions: ['doc', 'docx'] }
  ];

  showResourceModal: boolean = false;
  showResourcePreviewModal: boolean = false;
  resourceUploading: boolean = false;
  resourceUploadError: string | null = null;
  resourceFile: File | null = null;
  resourcePreviewSafeUrl: SafeResourceUrl | null = null;
  resourcePreviewItem: ContentItem | null = null;
  resourcePreviewKind: ResourceDisplayType | null = null;
  resourceSaving: boolean = false;
  resourceUploadInProgress: boolean = false;
  resourceUploadProgress: number = 0;
  resourceForm: ResourceFormState = {
    title: '',
    description: '',
    displayType: 'compressed',
    fileName: '',
    fileType: '',
    fileSize: 0,
    dataUrl: null,
    previewMode: 'download',
    pageCount: null
  };
  
  // Video Modal States
  showVideoModal: boolean = false;
  viewingVideoContent: boolean = false;
  videoContentItem: ContentItem | null = null;
  videoForm: VideoFormState = {
    source: null,
    title: '',
    description: '',
    file: null,
    fileName: undefined,
    fileSize: undefined,
    dataUrl: undefined,
    youtubeUrl: '',
    youtubeData: null,
    metadata: undefined
  };

  // AI YouTube Search
  youtubeSearchQuery: string = '';
  searchingYoutube: boolean = false;
  youtubeSearchResults: any[] = [];
  youtubeSearchError: string | null = null;

  videoUploadError: string | null = null;
  videoUploadInProgress: boolean = false;
  videoUploadProgress: number = 0;
  savingVideo: boolean = false;
  deletingVideo: boolean = false;
  fetchingYouTubeData: boolean = false;
  youtubeError: string | null = null;
  
  private readonly VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly VIDEO_ACCEPTED_FORMATS = ['video/mp4', 'video/x-msvideo', '.mp4', '.avi'];
  
  // Audio Modal Properties
  showAudioModal: boolean = false;
  showQuizWizardModal: boolean = false; // Quiz creation wizard (mode selection + settings)
  showQuizEditorModal: boolean = false; // Quiz editor (manual/AI questions)
  currentQuizId: string | null = null; // Current quiz being edited
  quizMode: 'manual' | 'ai' | null = null; // Selected quiz mode
  editingQuizSettings: boolean = false; // Track if editing quiz settings
  savingQuizSettings: boolean = false; // Track if saving quiz settings
  quizSettings: {
    title: string;
    full_score: number;
    time_limit: number | null; // Time limit in minutes
    allowed_types: string[];
    auto_weighting: boolean;
    question_count: number;
    max_attempts: number | null; // Maximum attempts allowed (null = unlimited)
  } = {
    title: '',
    full_score: 40,
    time_limit: null,
    allowed_types: ['mcq', 'true_false', 'matching', 'ordering'],
    auto_weighting: true,
    question_count: 10,
    max_attempts: null
  };
  quizQuestions: QuizQuestion[] = []; // Questions for current quiz
  currentQuestion: QuizQuestion | null = null; // Currently editing question
  showQuestionEditor: boolean = false; // Question editor modal
  generatingQuiz: boolean = false; // AI quiz generation in progress
  quizLoading: boolean = false; // Loading quiz questions
  creatingQuiz: boolean = false; // Creating quiz in progress
  viewingAudioContent: boolean = false;
  audioContentItem: ContentItem | null = null;
  audioForm: AudioFormState = {
    source: null,
    title: '',
    description: '',
    file: null,
    fileName: '',
    fileSize: 0,
    metadata: null,
    textSource: 'lesson', // Default to selecting a lesson
    selectedTextLessonId: null,
    selectedTextLesson: null,
    textContent: '',
    voice: 'alloy',
    speed: 1.0
  };
  audioUploadError: string | null = null;
  audioUploadInProgress: boolean = false;
  audioUploadProgress: number = 0;
  savingAudio: boolean = false;
  deletingAudio: boolean = false;
  generatingAudio: boolean = false;
  audioGenerationProgress: number = 0;
  
  private readonly AUDIO_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly AUDIO_ACCEPTED_FORMATS = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', '.mp3', '.wav', '.m4a', '.ogg'];
  
  // Available TTS voices
  readonly ttsVoices = [
    { value: 'zeina', labelEn: 'Zeina (Arabic Female)', labelAr: 'زينة (أنثى عربية)' },
    { value: 'hala', labelEn: 'Hala (Arabic Female)', labelAr: 'هالة (أنثى عربية)' },
    { value: 'zayd', labelEn: 'Zayd (Arabic Male)', labelAr: 'زيد (ذكر عربي)' },
    { value: 'joanna', labelEn: 'Joanna (English Female)', labelAr: 'جوانا (أنثى إنجليزية)' },
    { value: 'matthew', labelEn: 'Matthew (English Male)', labelAr: 'ماثيو (ذكر إنجليزي)' }
  ];
  
  private languageChangeSubscription?: Subscription;
  private draftCourseId: number | null = null;
  private draftSyncCompleted: boolean = false;
  private loadedSectionContentIds: Set<string> = new Set();
  private pendingImageUploads: Map<string, UploadedEditorImageAsset> = new Map<string, UploadedEditorImageAsset>();
  private uploadingImageUrls: Set<string> = new Set<string>(); // Track images currently uploading
  private editorActiveImageKeys: Set<string> = new Set<string>();
  private editorKnownImageMap: Map<string, string> = new Map<string, string>();
  private editorDeletedImageKeys: Set<string> = new Set<string>();
  private editorImageChangeDebounce: number | null = null;
  private currentEditingContentId: string | null = null;
  private resourceUploadSub?: Subscription;
  private contentReorderLoading: Set<string> = new Set<string>();
  private sectionReorderLoading: Set<string> = new Set<string>();
  savingDraftCourse: boolean = false;
  deletingDraftCourse: boolean = false;
  continueErrorMessage: string | null = null;
  courseCoverUploading: boolean = false;
  courseCoverDeleting: boolean = false;
  courseCoverUploadProgress: number = 0;
  courseCoverUploadError: string | null = null;
  showDeleteCoverModal: boolean = false;
  coverImageLoaded: boolean = false;

  @HostBinding('class.has-open-modal')
  get isAnyModalOpen(): boolean {
    return this.showResourceModal || 
           this.showResourcePreviewModal || 
           this.showVideoModal || 
           this.showAudioModal || 
           this.showQuizWizardModal || 
           this.showQuizEditorModal || 
           this.showQuestionEditor || 
           this.showDeleteCoverModal || 
           this.showWarningModal || 
           this.showContentTypeModal || 
           this.showTextEditor || 
           this.showEditCourseDetailsModal || 
           this.showAIHintModal || 
           this.showContentBlockModal || 
           this.showAddSectionModal || 
           this.showDeleteSectionModal || 
           this.showStartFromScratchModal;
  }

  // Step Management
  currentStep: number = 1; // 1 = Course Basics, 2 = Building Sections, 3 = Review & Publish
  step2Locked: boolean = false; // Track if Step 2 inputs are locked after continue
  showWarningModal: boolean = false; // Track warning modal visibility
  warningModalType: 'goBack' | 'deleteContent' | null = null; // Track warning modal type
  itemToDelete: string | null = null; // Track which content item is being deleted
  showContentTypeModal: boolean = false; // Track content type modal visibility
  selectedContentType: 'video' | 'resources' | 'text' | 'audio' | 'quiz' | null = null; // Track selected content type
  showTextEditor: boolean = false; // Track text editor visibility
  textContent: string = ''; // Store text editor content
  currentEditor: DecoupledEditor | null = null; // Store current editor instance
  subsectionTitle: string = ''; // Store subsection title
  generatingWithAI: boolean = false; // Track AI generation status
  savingTextContent: boolean = false; // Track manual text lesson persistence state
  isDeletingContent: boolean = false; // Track text lesson deletion state
  textSaveError: string | null = null; // Track errors when persisting text lessons
  showAIHintModal: boolean = false; // Track AI hint modal visibility
  aiHint: string = ''; // Store optional AI hint
  pendingAiAction: 'textContent' | null = null; // Track which AI action is pending hint input
  
  // Lesson Builder
  showLessonBuilder: boolean = false; // Track lesson builder visibility
  editingLessonTitle: string = ''; // Current lesson title being edited
  lessonBlocks: ContentBlock[] = []; // Blocks for current lesson
  selectedBlockId: number | string | null = null; // Currently selected block
  selectedBlock: ContentBlock | null = null; // Currently selected block object
  showBlockTypeChooser: boolean = false; // Block type chooser modal
  lessonHint: string = ''; // Hint for AI assistant
  savingLessonBuilder: boolean = false; // Track save state
  currentLessonContentId: number | string | null = null; // ID of content being edited
  videoTab: 'youtube-ai' | 'youtube-manual' | 'upload' = 'youtube-ai'; // Video block tab
  generatingTextBlock: boolean = false; // Track AI generation for text blocks
  private saveBlocksTimeout: any = null; // Timeout for debounced block saving
  private blockEditors: Map<string | number, DecoupledEditor> = new Map(); // Store editor instances by block ID
  youtubeSuggestions: Array<{ videoId: string; title: string; description: string; duration: string; durationSeconds: number; thumbnail: string; channelTitle: string; publishedAt: string; viewCount: string }> = [];
  loadingYouTubeSuggestions: boolean = false;
  previewingYouTubeVideo: { videoId: string; title: string; description: string; duration: string; thumbnail: string; channelTitle: string; publishedAt?: string; viewCount: string } | null = null;
  showYouTubePreviewModal: boolean = false;
  previewingUploadedVideo: { url: string; title: string; thumbnail?: string; duration?: string } | null = null;
  showUploadedVideoModal: boolean = false;
  showDeleteVideoModal: boolean = false;
  
  // Section Management
  sections: (Section & { available?: boolean })[] = []; // Store all sections with availability toggle
  activeSectionId: string | null = null; // Currently active/selected section
  
  // Content Management (legacy - will migrate to sections)
  contentItems: ContentItem[] = []; // Store all content items for backward compatibility
  viewingContentItem: ContentItem | null = null; // Track which content item is being viewed
  
  // Editing States
  editingCourseName: boolean = false; // Track if editing course name
  showEditCourseDetailsModal: boolean = false; // Track if showing edit course details modal
  savingCourseName: boolean = false; // Track if saving course name to backend
  savingCourseDetails: boolean = false; // Track if saving course details to backend
  editingCourseNameValue: string = ''; // Temp value for editing course name
  editingCourseDescriptionValue: string = ''; // Temp value for editing course description
  editingCoursePreferences: {
    educationalStage: string[];
    country: number[];
  } = {
    educationalStage: [],
    country: []
  };
  editingSection: boolean = false; // Track if editing section
  editingSectionValue: string = ''; // Temp value for editing section
  editingSectionId: string | null = null; // Track which section is being edited
  
  // Section Menu
  showSectionMenu: boolean = false; // Track section menu visibility
  menuSectionId: string | null = null; // Track which section's menu is open
  
  // Delete Section
  showDeleteSectionModal: boolean = false; // Track delete section modal visibility
  sectionToDelete: Section | null = null; // Track which section is being deleted
  deleteConfirmationInput: string = '';
  readonly deleteKeyword: string = 'delete';
  sectionDeleting: boolean = false; // waiting state when deleting a section
  sectionSaving: boolean = false;   // waiting state when saving/creating section name
  showStartFromScratchModal: boolean = false; // Track start from scratch modal visibility
  
  // Add Section Modal
  showAddSectionModal: boolean = false; // Track add section modal visibility
  sectionCreationMode: 'upload' | 'ai' | 'manual' | null = null; // Track current section creation mode
  uploadStep: 1 | null = null; // Track upload step (1=file upload)
  
  // Manual Section Creation
  manualSectionName: string = '';
  manualSectionDescription: string = '';
  aiSuggestedSectionName: string | null = null;
  suggestingSectionName: boolean = false;
  generatingSectionTitles: boolean = false;
  
  // Content Block Selection Modal
  showContentBlockModal: boolean = false;
  showContentTypeSelectionModal: boolean = false; // New modal for selecting type after creation
  selectedDraftItem: ContentItem | null = null; // Item being configured
  selectedTitleSuggestion: SectionTitleSuggestion | null = null;
  selectedSectionIdForBlock: string | null = null;
  contentBlockType: 'text' | 'audio' | 'video' | 'attachment' | null = null;
  sectionFileUploading: boolean = false; // Track section file upload state
  sectionFileUploadError: string | null = null; // Track section file upload errors
  sectionFileUploadErrorIsFileSize: boolean = false; // Track if error is file-size related
  sectionFileSelected: boolean = false; // Track if a file has been selected
  sectionFileUploadProgress: number = 0; // Track upload progress percentage (0-100)
  sectionFileUploadStep: string = ''; // Track current upload step
  sectionFileUploadInterval: any = null; // Interval for progress simulation
  pageRangeStart: number | null = null; // Optional page range start
  pageRangeEnd: number | null = null; // Optional page range end
  usePageRange: boolean = false; // Whether to use page range
  
  // AI Instruction Generation
  aiInstructionText: string = '';
  aiGenerating: boolean = false;
  aiGenerationStep: 1 | 2 | 3 | null = null; // Track which AI generation step is active (1=instructions, 2=options, 3=preview)
  aiGenerationCurrentLesson: number = 0; // Current lesson being generated (1-based)
  aiGenerationTotalLessons: number = 0; // Total number of lessons to generate
  
  // AI Preferences (Step 0)
  aiPreferences: {
    contentSource: ('youtube' | 'text' | 'text-to-audio')[];
  } = {
    contentSource: []
  };
  
  // Course-level preferences (set during course creation)
  coursePreferences: {
    educationalStage: string[];
    country: number[];
  } = {
    educationalStage: [],
    country: []
  };
  
  // Saved preferences for the course (stored after first successful section creation)
  savedCoursePreferences: {
    contentSource: ('youtube' | 'text' | 'text-to-audio')[];
  } | null = null;
  
  // Countries for preferences
  countries: Country[] = [];
  loadingCountries: boolean = false;
  
  // AI Wizard Step 2: Content Type Selection
  aiContentTypes: {
    text: boolean;
    quiz: boolean;
    youtube: boolean;
    summary: boolean;
    homework: boolean;
  } = {
    text: true,
    quiz: false,
    youtube: false,
    summary: false,
    homework: false
  };
  
  // YouTube-specific options
  aiYoutubeOptions: {
    maxVideos: number; // 1, 2, or 3
    length: 'short' | 'medium'; // Short (≤5 min) or Medium (≤10 min)
    mode: 'attach-only' | 'attach-with-summary'; // Attach video only or attach + AI summary
  } = {
    maxVideos: 1,
    length: 'short',
    mode: 'attach-only'
  };
  
  // Advanced options
  showAdvancedOptions: boolean = false;
  aiAdvancedOptions: {
    targetLength: '10-15' | '20-30'; // minutes
    difficulty: 'easy' | 'medium' | 'exam-focus';
    language: 'arabic-only' | 'english-only' | 'bilingual';
    tone: 'friendly' | 'formal';
  } = {
    targetLength: '10-15',
    difficulty: 'medium',
    language: 'bilingual',
    tone: 'friendly'
  };
  
  // AI Plan Preview (Step 3)
  aiPlanPreview: Array<{
    type: 'text' | 'video' | 'quiz' | 'summary' | 'homework';
    title: string;
    duration?: string;
    youtubeUrl?: string;
    editable: boolean;
  }> = [];
  
  // Dhikr/Istighfar display
  currentDhikr: string = '';
  currentDhikrTranslation: string = '';
  dhikrInterval: any = null;
  dhikrIndex: number = 0;
  textEditorDhikrInterval: any = null;
  
  // Undo Toast
  showUndoToast: boolean = false; // Track undo toast visibility
  deletedSection: Section | null = null; // Store deleted section for undo
  undoToastTimeout: any = null; // Timeout for auto-hiding undo toast
  courseCoverPreview: string | null = null;
  readonly defaultCourseCover = 'assets/images/no-image-course.png';

  // Step 1: Category Selection
  loading = false;
  loadingSummaryData: boolean = false; // Track if summary data is being loaded from localStorage
  smartSix: Category[] = [];
  allCategories: Category[] = [];
  selectedCategory: Category | null = null;
  selectedCategoryId: number | null = null;

  // Step 2: Course Basics
  courseName: string = '';
  courseDescription: string = '';
  courseTitleSuggestions: { title: string; rationale?: string; topics?: string[] }[] = [];
  loadingTitles: boolean = false;
  currentTerm: number = 1; // 1 or 2, detected from date
  courseMode: 'curriculum' | 'general' = 'curriculum';
  subjectSlug: string = '';
  subjectSlugSuggestions: string[] = ['physics', 'algebra', 'geometry', 'calculus', 'programming', 'biology', 'chemistry', 'history', 'literature', 'language'];
  // Topic selection from title card
  availableTopics: string[] = [];
  selectedTopic: string = '';
  editingTopic: string | null = null;
  editingTopicValue: string = '';
  units: { id: string; name: string; order: number }[] = [];
  loadingUnits: boolean = false;
  editingUnitId: string | null = null;
  editingUnitName: string = '';

  student: any = null;
  profileLoaded = false;
  
  // Localized labels pulled from backend
  localizedCountryName: string | null = null;
  localizedStageName: string | null = null;

  // CKEditor
  public Editor = DecoupledEditor;
  
  public editorConfig = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'fontSize',
        'fontFamily',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'bulletedList',
        'numberedList',
        'outdent',
        'indent',
        '|',
        'blockQuote',
        'codeBlock',
        '|',
        'insertImage',
        '|',
        'undo',
        'redo'
      ]
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify']
    },
    language: this.currentLang === 'ar' ? 'ar' : 'en',
    image: {
      toolbar: [
        'imageTextAlternative',
        '|',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'resizeImage:25',
        'resizeImage:50',
        'resizeImage:75',
        'resizeImage:original'
      ],
      resizeOptions: [
        { name: 'resizeImage:25', value: '25', label: '25%', icon: 'small' },
        { name: 'resizeImage:50', value: '50', label: '50%', icon: 'medium' },
        { name: 'resizeImage:75', value: '75', label: '75%', icon: 'large' },
        { name: 'resizeImage:original', value: null, label: this.currentLang === 'ar' ? 'الحجم الأصلي' : 'Original', icon: 'original' }
      ],
      styles: ['inline', 'block', 'side'],
      // Configure image insertion to only allow upload, disable file manager
      insert: {
        type: 'auto',
        // Disable file manager integration
        integrations: ['upload', 'url']
      }
    },
    heading: {
      options: [
        { model: 'paragraph', title: this.currentLang === 'ar' ? 'فقرة' : 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: this.currentLang === 'ar' ? 'عنوان رئيسي' : 'Heading 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: this.currentLang === 'ar' ? 'عنوان فرعي' : 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: this.currentLang === 'ar' ? 'عنوان ثالث' : 'Heading 3', class: 'ck-heading_heading3' }
      ]
    }
  };

  get currentLang(): 'ar' | 'en' { return this.i18n.current; }
  get isRTL(): boolean { return this.currentLang === 'ar'; }
  get hasCustomCourseCover(): boolean { return !!this.courseCoverPreview; }
  get courseCoverDisplay(): string { return this.courseCoverPreview ?? this.defaultCourseCover; }
  get hasServerCourseCover(): boolean {
    return !!(this.draftCourseId && this.courseCoverPreview && this.courseCoverPreview !== this.defaultCourseCover);
  }
  get deleteCoverTitle(): string {
    return this.currentLang === 'ar' ? 'حذف صورة الغلاف؟' : 'Delete cover image?';
  }
  get deleteCoverMessage(): string {
    return this.currentLang === 'ar'
      ? 'سيتم حذف صورة الغلاف نهائيًا من الدورة. هل تريد المتابعة؟'
      : 'The cover image will be permanently removed from the course. Do you want to continue?';
  }
  get canContinue(): boolean {
    if (this.currentStep === 1) {
      // In Step 1, require category, course name (min 3 chars), and at least one educational stage
      return this.selectedCategory !== null && 
             this.courseName.trim().length >= 3 &&
             this.coursePreferences.educationalStage.length > 0;
    }
    if (this.currentStep === 2) {
      return this.courseName.trim().length >= 3;
    }
    return false;
  }

  get showStep1(): boolean { return this.currentStep === 1; }
  get showStep2(): boolean { return this.currentStep === 2; }
  
  getSectionDisplayName(sectionName: string): string {
    // Format as "Section 1" in bold, followed by section name
    // The HTML template will handle the bold styling
    return sectionName;
  }
  
  getSectionNumberLabel(): string {
    // Returns "Section 1" or "القسم 1"
    return this.currentLang === 'ar' ? 'القسم 1' : 'Section 1';
  }
  
  getItemCountDisplay(count: number): string {
    const safeCount = count ?? 0;
    if (this.currentLang === 'ar') {
      if (safeCount === 1) return 'عنصر';
      if (safeCount === 2) return 'عنصرين';
      return `${safeCount} عناصر`;
    }
    return `${safeCount} ${safeCount === 1 ? 'item' : 'items'}`;
  }
  
  get showSummarySkeleton(): boolean {
    // Show skeleton when data is being loaded/restored from localStorage or backend
    if (this.loadingSummaryData) return true; // Always show skeleton when loading summary data
    
    // Also show skeleton if we have a draft but haven't fully loaded the category yet
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    const hasDraft = !!(draft?.category_id && draft?.name && draft.name.trim().length >= 3);
    
    if (!hasDraft) return false; // No draft, don't show skeleton
    if (this.step2Locked && this.selectedCategory) return false; // Data fully loaded, don't show skeleton
    
    // Show skeleton if we have a draft but category hasn't been found in allCategories yet
    return hasDraft && !this.selectedCategory && this.allCategories.length > 0;
  }

  get countryName(): string {
    // Always use localized name from backend (based on current Accept-Language header)
    if (this.localizedCountryName && this.localizedCountryName.trim()) {
      return this.localizedCountryName;
    }
    // Fallback to raw names based on current language
    const student = this.student as any;
    if (this.currentLang === 'ar' && student?.country_name_ar) {
      return student.country_name_ar;
    }
    if (student?.country_name_en) {
      return student.country_name_en;
    }
    if (student?.country_name) {
      return student.country_name;
    }
    return this.currentLang === 'ar' ? 'الدولة' : 'Country';
  }

  get stageName(): string {
    // Always use localized name from backend (based on current Accept-Language header)
    if (this.localizedStageName && this.localizedStageName.trim()) {
      return this.localizedStageName;
    }
    // Fallback to raw names based on current language
    const student = this.student as any;
    if (this.currentLang === 'ar' && student?.stage_name_ar) {
      return student.stage_name_ar;
    }
    if (student?.stage_name_en) {
      return student.stage_name_en;
    }
    if (student?.education_stage_name || student?.stage_name) {
      return student.education_stage_name || student.stage_name;
    }
    return this.currentLang === 'ar' ? 'غير محددة' : 'Not set';
  }

  ngOnInit(): void {
    if (!this.universalAuth.validateAccess('Student')) return;
    
    // Load countries for course preferences
    this.loadCountries();
    this.student = this.universalAuth.getCurrentUser();
    
    // Detect current term from date (Term 1: Sept-Feb)
    this.currentTerm = this.detectTerm();
    
    // Set loading state for summary data
    this.loadingSummaryData = true;
    
    this.syncDraftFromServer(() => {
      this.afterDraftLoaded();
    });
    
    // Subscribe to language changes from I18nService to reload profile
    // Skip the first emission (current value) and only react to actual changes
    this.languageChangeSubscription = this.i18n.lang$.pipe(skip(1)).subscribe(lang => {
      console.log('Language changed to:', lang, '- Reloading profile with localized country/stage names');
      // Use a delay to ensure Accept-Language header is updated via interceptor
      // The interceptor reads from storage, which should be updated by now
      setTimeout(() => {
        this.loadProfileFromBackend();
      }, 500); // Increased delay to ensure storage is updated
    });
    
    // Also listen for window events (for compatibility)
    if (typeof window !== 'undefined') {
      window.addEventListener('languageChanged', ((event: CustomEvent<{ lang: string }>) => {
        const { lang } = event.detail;
        console.log('Language changed via window event to:', lang, '- Reloading profile with localized country/stage names');
        setTimeout(() => {
          this.loadProfileFromBackend();
        }, 500); // Match the delay from the observable subscription
      }) as EventListener);
    }
    
    // Check if contentId is in route params (for lesson builder persistence)
    // This will be handled after draft is loaded in afterDraftLoaded
  }

  ngOnDestroy(): void {
    // Clean up progress interval
    this.stopProgressSimulation();
    if (this.languageChangeSubscription) {
      this.languageChangeSubscription.unsubscribe();
    }

    if (this.pendingImageUploads.size) {
      this.cleanupPendingImageUploads();
    }
  }

  private loadProfileFromBackend(): void {
    this.loading = true;
    // Use /profile/me endpoint which returns localized country and stage names
    // The Accept-Language header is automatically added by langInterceptor
    console.log('Loading profile with language:', this.currentLang);
    this.http.get<any>(`${this.baseUrl}/profile/me`)
      .subscribe({
      next: (res) => {
          if (res) {
            console.log('Profile loaded - localized_country_name:', res.localized_country_name, 'localized_stage_name:', res.localized_stage_name);
            
            // Update student data from backend response
            this.student = {
              ...this.student,
              ...res
            };
            
            // Extract localized names (these are based on current Accept-Language header)
            // Backend returns name_ar when Accept-Language is 'ar', name_en otherwise
            this.localizedCountryName = res.localized_country_name || null;
            this.localizedStageName = res.localized_stage_name || null;
            
            console.log('Updated localized names - country:', this.localizedCountryName, 'stage:', this.localizedStageName);
            
            this.profileLoaded = true;
            this.loading = false;
            
            // Force change detection to update the view with new localized names
            this.cdr.detectChanges();
            
            // Always restore content items after profile loads
            this.restoreContentItemsFromStorage();
            
            // Now that we have the profile, fetch categories based on stage_id
            this.loadSmartSix();
          }
        },
        error: (err) => {
          console.error('Failed to load profile:', err);
          this.loading = false;
          
          // Handle 401 errors gracefully - user may need to re-authenticate
          if (err.status === 401) {
            this.universalAuth.forceLogout('Session expired. Please login again.');
          } else {
            // Always restore content items even on error
            this.restoreContentItemsFromStorage();
            
            // Fallback to localStorage data if API fails
            this.profileLoaded = true;
            this.loadSmartSix();
          }
        }
      });
  }

  public onReady( editor: DecoupledEditor ): void {
    // Store editor instance for later use
    this.currentEditor = editor;
    
    // Remove dropdown from image button - make it always upload from computer
    // Wait for toolbar to be ready, then modify the image button
    setTimeout(() => {
      const toolbarElement = editor.ui.view.toolbar.element;
      if (toolbarElement) {
        // Find the image button in the toolbar
        const imageButton = toolbarElement.querySelector('[aria-label*="image" i], [aria-label*="Image" i]') as HTMLElement;
        if (imageButton) {
          // Hide the dropdown arrow if it exists
          const arrow = imageButton.querySelector('.ck-button__arrow, .ck-dropdown__arrow') as HTMLElement;
          if (arrow) {
            arrow.style.display = 'none';
          }
          
          // Override click to directly open file picker
          imageButton.addEventListener('click', (e: Event) => {
            // Check if it's clicking the arrow (which we've hidden, but just in case)
            const target = e.target as HTMLElement;
            if (target.classList.contains('ck-button__arrow') || target.closest('.ck-button__arrow')) {
              return; // Don't do anything if clicking the arrow
            }
            
            // Create a file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (fileEvent: Event) => {
              const fileTarget = fileEvent.target as HTMLInputElement;
              const file = fileTarget.files?.[0];
              if (file) {
                // Use the file repository to upload
                const fileRepository = editor.plugins.get('FileRepository');
                const loader = fileRepository.createLoader(file);
                if (loader) {
                  // Trigger the upload
                  loader.upload().then((response: any) => {
                    editor.model.change((writer: any) => {
                      const imageElement = writer.createElement('imageBlock', {
                        src: response.default || response.url
                      });
                      editor.model.insertContent(imageElement, editor.model.document.selection);
                    });
                  }).catch((error: any) => {
                    console.error('Image upload failed:', error);
                  });
                }
              }
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
            };
            document.body.appendChild(input);
            input.click();
            e.preventDefault();
            e.stopPropagation();
          }, true); // Use capture phase to intercept before CKEditor's handler
        }
      }
    }, 200);
    
    const currentContentId = this.ensureCurrentEditingContentId();
    const uploadUrl = this.contentImageUploadUrl;
    
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
      return new CKEditor5CustomUploadAdapter(loader, {
        uploadUrl,
        token: this.universalAuth.getAccessToken(),
        contentId: currentContentId ? String(currentContentId) : undefined,
        onUploadStart: (file: File) => {
          // Track that an upload is starting - we'll find the image in the editor
          const tempUrl = URL.createObjectURL(file);
          this.uploadingImageUrls.add(tempUrl);
          // Mark images as uploading - check periodically for blob URLs
          this.markImageAsUploading(editor, tempUrl);
          
          // Also listen for when the image is inserted
          const model = editor.model;
          const imageInsertListener = () => {
            model.document.off('change:data', imageInsertListener);
            setTimeout(() => {
              this.markImageAsUploading(editor, tempUrl);
            }, 50);
          };
          model.document.on('change:data', imageInsertListener);
        },
        onUploaded: (asset) => {
          this.registerPendingImageAsset(asset);
          // Remove loading state once upload is complete - check both blob URLs and the final URL
          this.uploadingImageUrls.forEach((url) => {
            this.removeImageUploadingState(editor, url);
          });
          if (asset.url) {
            this.removeImageUploadingState(editor, asset.url);
          }
          // Clean up blob URLs
          this.uploadingImageUrls.forEach((url) => {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
          this.uploadingImageUrls.clear();
        },
        onError: (error) => {
          console.error('CKEditor image upload failed:', error);
          const message = this.currentLang === 'ar'
            ? 'فشل رفع الصورة. حاول مرة أخرى.'
            : 'Failed to upload the image. Please try again.';
          this.toastr.error(message);
          // Clean up any uploading states
          this.uploadingImageUrls.clear();
          this.removeAllImageUploadingStates(editor);
        },
        onAbort: (asset) => {
          if (asset?.key) {
            this.pendingImageUploads.delete(asset.key);
            this.ai.deleteDraftContentImages([asset.key]).subscribe({
              error: (error: unknown) => {
                console.error('Failed to delete aborted editor image:', error);
              }
            });
          }
          // Clean up uploading state
          if (asset?.url) {
            this.removeImageUploadingState(editor, asset.url);
          }
        }
      });
    };
   
    const element = editor.ui.getEditableElement()!;
    const parent = element.parentElement!;
    
    const direction = this.isRTL ? 'rtl' : 'ltr';
    
    // Set direction SYNCHRONOUSLY and IMMEDIATELY before any rendering
    element.setAttribute('dir', direction);
    element.style.setProperty('direction', direction, 'important');
    
    // Override lang if it conflicts
    if (this.isRTL) {
      element.setAttribute('lang', 'ar');
    } else {
      element.setAttribute('lang', 'en');
    }
    
    // Set direction on toolbar
    const toolbar = editor.ui.view.toolbar.element;
    if (toolbar) {
      toolbar.setAttribute('dir', direction);
      toolbar.style.setProperty('direction', direction, 'important');
    }
    
    // Function to enforce direction - must work in both focused and blurred states
    const enforceDirection = () => {
      const currentDir = element.getAttribute('dir');
      if (currentDir !== direction) {
        element.setAttribute('dir', direction);
        element.style.setProperty('direction', direction, 'important');
      }
      
      // Override lang if it conflicts
      if (this.isRTL) {
        const currentLang = element.getAttribute('lang');
        if (currentLang !== 'ar') {
          element.setAttribute('lang', 'ar');
        }
      } else {
        const currentLang = element.getAttribute('lang');
        if (currentLang !== 'en') {
          element.setAttribute('lang', 'en');
        }
      }
      
      // Set direction on toolbar
      if (toolbar) {
        const toolbarDir = toolbar.getAttribute('dir');
        if (toolbarDir !== direction) {
          toolbar.setAttribute('dir', direction);
          toolbar.style.setProperty('direction', direction, 'important');
        }
      }
    };
    
    // Enforce direction on focus events (when clicking to edit)
    // This ensures direction is correct even when editor is focused
    editor.ui.focusTracker.on('change:isFocused', () => {
      // Use requestAnimationFrame to batch updates and prevent glitches
      requestAnimationFrame(() => {
        enforceDirection();
      });
    });
    
    // Use a smart MutationObserver that only updates when direction actually changes
    // Use requestAnimationFrame to batch updates and prevent visual glitches
    let rafScheduled = false;
    const observer = new MutationObserver(() => {
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
          const currentDir = element.getAttribute('dir');
          if (currentDir !== direction) {
            enforceDirection();
          }
          rafScheduled = false;
        });
      }
    });
    
    // Observe the editable element for dir attribute changes
    // This catches when CKEditor tries to change direction
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['dir', 'lang']
    });
    
    // Also check periodically to catch any missed changes
    const periodicCheck = setInterval(() => {
      requestAnimationFrame(() => {
        const currentDir = element.getAttribute('dir');
        if (currentDir !== direction) {
          enforceDirection();
        }
      });
    }, 1000);
    
    // Clean up when editor is destroyed
    editor.on('destroy', () => {
      observer.disconnect();
      clearInterval(periodicCheck);
    });

    parent.insertBefore(
      editor.ui.view.toolbar.element!,
      element
    );

    const initialData = this.pendingEditorData ?? (this.textContent && this.textContent.trim().length
      ? this.textContent
      : '<p></p>');
    editor.setData(initialData);
    this.pendingEditorData = null;

    this.setupEditorImageTracking(editor);
  }


  
  private loadSmartSix(): void {
    const stage_id = this.student?.education_stage_id ?? this.student?.stage_id;
    if (!stage_id) {
      console.warn('No stage_id found in user profile');
      this.loading = false;
      return;
    }

    this.loading = true;
    this.http.get<{categories: Category[]}>(`${this.baseUrl}/categories/suggestions/${stage_id}`)
      .subscribe({
        next: (res) => {
          this.smartSix = res.categories || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load Smart Six categories:', err);
          this.smartSix = [];
          this.loading = false;
        }
      });
  }

  private loadAllCategories(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    
    // Always restore content items from localStorage first
    this.restoreContentItemsFromStorage();
    
    this.http.get<{categories: Category[]}>(`${this.baseUrl}/categories`)
      .subscribe({
        next: (res) => {
          this.allCategories = res.categories || [];
          
          // Restore selectedCategory after categories are loaded
          // This is needed because allCategories might be empty when ngOnInit runs
          if (draft?.category_id && !this.selectedCategory) {
            this.selectedCategory = this.allCategories.find(c => c.id === draft.category_id) || null;
            if (this.selectedCategory) {
              this.selectedCategoryId = draft.category_id;
            }
          }
          
          // Ensure content items are restored again after categories load (in case draft changed)
          this.restoreContentItemsFromStorage();
          
          // If draft has both category and course name, restore locked state
          if (draft?.name && draft.name.trim().length >= 3) {
            this.step2Locked = true;
            this.currentStep = 1; // Stay on Step 1 but show read-only summary
          }
          
          // Always restore content items from localStorage if they exist
          this.restoreContentItemsFromStorage();
          
          // Data is fully loaded now, hide skeleton
          this.loadingSummaryData = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load all categories:', err);
          this.allCategories = [];
          
          // Even on error, ensure content items are restored from localStorage
          this.restoreContentItemsFromStorage();
          
          // Even on error, stop showing skeleton
          this.loadingSummaryData = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.selectedCategoryId = category.id;
    
    // Determine mode: curriculum if has stage/country, otherwise general
    const hasStage = !!(this.student?.education_stage_id ?? this.student?.stage_id);
    const hasCountry = !!this.student?.country_id;
    this.courseMode = (hasStage && hasCountry) ? 'curriculum' : 'general';
    
    // Save immediately when category changes
    const userId = this.student?.id || this.student?.user_id;
    const draft: Partial<CourseDraft> = {
      category_id: category.id,
      category_name: this.currentLang === 'ar' ? category.name_ar : category.name_en,
      mode: this.courseMode,
      context: {
        stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
        country_id: this.student?.country_id,
        term: this.currentTerm
      },
      preferences: {
        educationalStage: this.coursePreferences.educationalStage.length > 0 
          ? this.coursePreferences.educationalStage 
          : undefined,
        country: this.coursePreferences.country.length > 0 
          ? this.coursePreferences.country 
          : undefined
      },
      user_id: userId,
      last_saved_at: new Date().toISOString()
    };
    this.ai.saveDraft(draft, userId);
    
    // Don't auto-load titles - user will click button to generate
  }

  clearCategorySelection(): void {
    this.selectedCategory = null;
    this.selectedCategoryId = null;
    this.courseName = '';
    this.courseTitleSuggestions = [];
    this.loadingTitles = false;
    
    // Clear category from draft
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    delete draft.category_id;
    delete draft.category_name;
    this.ai.saveDraft(draft, userId);
  }

  onNgSelectChange(): void {
    if (this.selectedCategoryId) {
      const category = this.allCategories.find(cat => cat.id === this.selectedCategoryId);
      if (category) {
        this.selectCategory(category);
      } else {
        this.selectedCategory = null;
      }
    } else {
      this.clearCategorySelection();
    }
  }

  onCourseNameChange(): void {
    // Auto-save on change
    if (this.courseName.trim().length >= 3) {
      // Don't populate topics/sections - sections will be created in step 2
      this.availableTopics = [];
      this.selectedTopic = '';
      this.subjectSlug = '';
      this.saveDraftStep2();
    }
  }

  onSubjectSlugChange(): void {
    // Auto-save on change
    if (this.subjectSlug.trim().length > 0) {
      this.saveDraftStep2();
    }
  }

  // Detect term from date: Term 1 (Sept-Feb), Term 2 (Mar-Aug)
  private detectTerm(date: Date = new Date()): number {
    const month = date.getMonth() + 1; // 1-12
    // Term 1: September (9) to February (2)
    // Term 2: March (3) to August (8)
    return (month >= 9 || month <= 2) ? 1 : 2;
  }

  // Toggle between curriculum and general skills mode
  toggleCourseMode(): void {
    this.courseMode = this.courseMode === 'curriculum' ? 'general' : 'curriculum';
    this.saveDraftStep2();
  }

  // Toggle term (Term 1 <-> Term 2)
  toggleTerm(): void {
    this.currentTerm = this.currentTerm === 1 ? 2 : 1;
    this.saveDraftStep2();
  }

  private updateContinueLoadingState(isLoading: boolean): void {
    if (this.savingDraftCourse === isLoading) {
      return;
    }
    this.savingDraftCourse = isLoading;
    this.cdr.markForCheck();
  }

  private resolveErrorMessage(error: unknown, fallbackEn: string, fallbackAr: string): string {
    const fallback = this.currentLang === 'ar' ? fallbackAr : fallbackEn;

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeHttpError = error as { error?: unknown; message?: unknown };
    const nestedMessage = maybeHttpError?.error && typeof maybeHttpError.error === 'object'
      ? (maybeHttpError.error as { message?: unknown }).message
      : undefined;

    const messageCandidate = nestedMessage ?? maybeHttpError?.message;

    if (typeof messageCandidate === 'string' && messageCandidate.trim().length > 0) {
      return messageCandidate.trim();
    }

    return fallback;
  }

  private buildContinueErrorMessage(error: unknown): string {
    return this.resolveErrorMessage(
      error,
      'We could not save your progress. Please try again.',
      'حدث خطأ أثناء حفظ تقدمك. يرجى المحاولة مرة أخرى.'
    );
  }

  private getCoverUploadErrorMessage(error: unknown): string {
    return this.resolveErrorMessage(
      error,
      'Failed to upload cover image. Please try again.',
      'فشل رفع صورة الغلاف. يرجى المحاولة مرة أخرى.'
    );
  }

  continue(): void {
    if (this.savingDraftCourse) {
      return;
    }

    if (this.currentStep === 1) {
      if (!this.canContinue || !this.selectedCategory || this.courseName.trim().length < 3) {
        return;
      }

      this.continueErrorMessage = null;
      // Step 1 Complete: Save category and course name to draft
      const userId = this.student?.id || this.student?.user_id;
      const draft: Partial<CourseDraft> = {
        version: 1,
        stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
        country_id: this.student?.country_id,
        locale: this.currentLang,
        category_id: this.selectedCategory.id,
        category_name: this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en,
        name: this.courseName.trim(),
        subject_slug: this.selectedTopic.trim() || this.subjectSlug.trim(),
        mode: this.courseMode,
        context: {
          stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
          country_id: this.student?.country_id,
          term: this.currentTerm
        },
        user_id: userId,
        last_saved_at: new Date().toISOString()
      };

      this.ai.saveDraft(draft, userId);
      const payload = this.buildDraftCoursePayload();
      this.updateContinueLoadingState(true);

      this.ai.createDraftCourse(payload).pipe(
        finalize(() => this.updateContinueLoadingState(false))
      ).subscribe({
        next: (response: DraftCourseResponse) => {
          this.handleDraftCourseResponse(response, userId);
          if (!this.sections || this.sections.length === 0) {
            this.initializeSections();
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to create draft course', error);
          this.continueErrorMessage = this.buildContinueErrorMessage(error);
        }
      });
    } else if (this.currentStep === 2) {
      if (!this.canContinue) {
        return;
      }

      this.continueErrorMessage = null;
      this.updateContinueLoadingState(true);
      try {
        // Step 2 Complete: Save course basics to draft
        const userId = this.student?.id || this.student?.user_id;
        const draft: Partial<CourseDraft> = {
          name: this.courseName.trim(),
          subject_slug: this.selectedTopic.trim() || this.subjectSlug.trim(),
          user_id: userId,
          last_saved_at: new Date().toISOString()
        };

        this.ai.saveDraft(draft, userId);
        
        // Lock Step 2 inputs - hide them and show read-only values
        this.step2Locked = true;
        this.cdr.detectChanges();
        
        // Force another change detection to ensure view updates
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
        
        // Note: Navigation to Step 3 will be handled elsewhere or stay on page
      } finally {
        this.updateContinueLoadingState(false);
      }
    }
  }

  goBack(): void {
    if (this.currentStep === 2) {
      // If Step 2 is locked, show warning modal
      if (this.step2Locked) {
        this.warningModalType = 'goBack';
        this.showWarningModal = true;
      } else {
        // If not locked, just go back without warning
        this.currentStep = 1;
        this.clearStep2Data();
      }
    } else if (this.currentStep === 1) {
      // Navigate away or cancel - clear everything
      const userId = this.student?.id || this.student?.user_id;
      this.ai.clearDraft(userId);
      this.router.navigateByUrl('/student/dashboard');
    }
  }

  clearStep2Data(): void {
    // Clear all course-related form data
    this.courseName = '';
    this.selectedTopic = '';
    this.subjectSlug = '';
    this.availableTopics = [];
    this.courseTitleSuggestions = [];
    this.loadingTitles = false;
    this.editingTopic = null;
    this.editingTopicValue = '';
    this.step2Locked = false;
    
    // Clear all course-related data from localStorage
    const userId = this.student?.id || this.student?.user_id;
    this.ai.clearDraft(userId);
    
    // Only keep category selection, clear everything else
    if (this.selectedCategory) {
      const draft: Partial<CourseDraft> = {
        version: 1,
        category_id: this.selectedCategory.id,
        category_name: this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en,
        user_id: userId
      };
      this.ai.saveDraft(draft, userId);
    }
    
    this.cdr.detectChanges();
  }

  confirmGoBack(): void {
    // User confirmed - clear everything and go back
    this.showWarningModal = false;
    this.warningModalType = null;
    this.currentStep = 1;
    this.clearStep2Data();
  }

  cancelGoBack(): void {
    // User cancelled - just close modal
    this.showWarningModal = false;
    this.warningModalType = null;
    this.itemToDelete = null;
    this.isDeletingContent = false;
  }

  // Content Type Modal Methods
  openContentTypeModal(contentType: 'video' | 'resources' | 'text' | 'audio' | 'quiz'): void {
    // For text content, open editor directly instead of modal
    if (contentType === 'text') {
      // Reset state for creating a new content item
      this.viewingContentItem = null;
      this.subsectionTitle = '';
      this.textContent = '';
      this.currentEditor = null;
      this.textSaveError = null;
      // Close AI hint modal if it's open
      this.showAIHintModal = false;
      this.aiHint = '';
      this.pendingAiAction = null;
      this.showTextEditor = true;
      this.selectedContentType = 'text';
      this.pendingImageUploads.clear();
      this.currentEditingContentId = this.generateDraftContentId();
      this.editorActiveImageKeys.clear();
      this.editorKnownImageMap.clear();
      this.editorDeletedImageKeys.clear();
      this.cdr.detectChanges();
      return;
    }

    if (contentType === 'resources') {
      this.openResourceModal();
      return;
    }
    
    if (contentType === 'video') {
      this.openVideoModal();
      return;
    }
    
    if (contentType === 'audio') {
      this.openAudioModal('audio');
      return;
    }
    
    if (contentType === 'quiz') {
      this.openQuizWizard();
      return;
    }
    
    // For other content types, show the AI/Manual choice modal
    this.selectedContentType = contentType;
    this.showContentTypeModal = true;
    this.cdr.detectChanges();
  }

  closeContentTypeModal(): void {
    this.showContentTypeModal = false;
    this.selectedContentType = null;
    this.cdr.detectChanges();
  }

  getContentTypeModalTitle(): string {
    if (!this.selectedContentType) return '';
    
    const titles = {
      video: this.currentLang === 'ar' ? 'إضافة فيديو' : 'Add Video',
      resources: this.currentLang === 'ar' ? 'إضافة موارد' : 'Add Resources',
      text: this.currentLang === 'ar' ? 'إضافة درس نصي' : 'Add Text Lesson',
      audio: this.currentLang === 'ar' ? 'إضافة صوت' : 'Add Audio',
      quiz: this.currentLang === 'ar' ? 'إنشاء اختبار' : 'Create Quiz'
    };
    
    return titles[this.selectedContentType];
  }

  getContentTypeModalDescription(): string {
    if (!this.selectedContentType) return '';
    
    const descriptions = {
      video: this.currentLang === 'ar' 
        ? 'اختر طريقة إنشاء المحتوى للفيديو' 
        : 'Choose how to create video content',
      resources: this.currentLang === 'ar' 
        ? 'اختر طريقة إنشاء المحتوى للموارد' 
        : 'Choose how to create resources content',
      text: this.currentLang === 'ar' 
        ? 'اختر طريقة إنشاء المحتوى للدرس النصي' 
        : 'Choose how to create text lesson content',
      audio: this.currentLang === 'ar' 
        ? 'اختر طريقة إنشاء المحتوى للصوت' 
        : 'Choose how to create audio content',
      quiz: this.currentLang === 'ar' 
        ? 'اختر طريقة إنشاء المحتوى للاختبار' 
        : 'Choose how to create quiz content'
    };
    
    return descriptions[this.selectedContentType];
  }

  selectCreationMode(mode: 'ai' | 'manual'): void {
    if (this.selectedContentType === 'quiz') {
      // For quiz, directly open wizard
      this.openQuizWizard();
      return;
    }
    
    // TODO: Implement creation mode logic for other types
    console.log(`Selected ${mode} mode for ${this.selectedContentType}`);
    
    // Close modal
    this.closeContentTypeModal();
    
    // Here you would typically navigate to the content creation page
    // For now, we'll just log the action
    // Example: this.router.navigate(['/student/content/create'], { queryParams: { type: this.selectedContentType, mode } });
  }

  // ============ QUIZ WIZARD METHODS ============
  openQuizWizard(): void {
    if (!this.activeSectionId) {
      this.toastr?.warning?.(this.currentLang === 'ar' ? 'يرجى تحديد قسم أولاً' : 'Please select a section first');
      return;
    }

    const activeSection = this.sections.find(s => s.id === this.activeSectionId);
    if (!activeSection || !activeSection.name || !activeSection.name.trim()) {
      this.toastr?.warning?.(this.currentLang === 'ar' ? 'يرجى تسمية القسم أولاً' : 'Please name the section first');
      return;
    }

    // Reset quiz wizard state
    this.quizMode = null;
    this.quizSettings = {
      title: activeSection.name || '',
      full_score: 40,
      time_limit: null,
      allowed_types: ['mcq', 'true_false', 'matching', 'ordering'],
      auto_weighting: true,
      question_count: 10,
      max_attempts: null
    };
    this.currentQuizId = null;
    this.quizQuestions = [];
    this.showQuizWizardModal = true;
    this.closeContentTypeModal();
    this.cdr.detectChanges();
  }

  closeQuizWizard(): void {
    this.showQuizWizardModal = false;
    this.quizMode = null;
    this.currentQuizId = null;
    this.cdr.detectChanges();
  }

  selectQuizMode(mode: 'manual' | 'ai'): void {
    this.quizMode = mode;
    this.cdr.detectChanges();
  }

  async saveQuizSettings(): Promise<void> {
    if (!this.activeSectionId) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'لا يوجد قسم نشط' : 'No active section');
      return;
    }

    if (!this.quizSettings.title || !this.quizSettings.title.trim()) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'عنوان الاختبار مطلوب' : 'Quiz title is required');
      return;
    }

    if (this.quizSettings.full_score <= 0) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'يجب أن يكون مجموع الدرجات الكلي أكبر من صفر' : 'Full score must be greater than zero');
      return;
    }

    if (!this.quizMode) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'يرجى اختيار نمط الاختبار' : 'Please select quiz mode');
      return;
    }

    let requestedQuestionCount = Math.round(Number(this.quizSettings.question_count) || 0);
    requestedQuestionCount = Math.max(1, Math.min(50, requestedQuestionCount));
    if (this.quizMode === 'ai' && (!requestedQuestionCount || Number.isNaN(requestedQuestionCount))) {
      this.toastr?.error?.(
        this.currentLang === 'ar'
          ? 'يرجى تحديد عدد الأسئلة المطلوب توليدها (من 1 إلى 50)'
          : 'Please specify how many questions to generate (1-50)'
      );
      return;
    }
    if (this.quizMode === 'ai') {
      this.quizSettings.question_count = requestedQuestionCount;
    }

    try {
      const sectionId = Number(this.activeSectionId);
      if (isNaN(sectionId)) {
        this.toastr?.error?.(this.currentLang === 'ar' ? 'معرف القسم غير صالح' : 'Invalid section ID');
        return;
      }

      const meta: Record<string, unknown> = {
        mode: this.quizMode,
        full_score: this.quizSettings.full_score,
        time_limit: this.quizSettings.time_limit || null,
        max_attempts: this.quizSettings.max_attempts || null,
        question_count: 0,
        auto_weighting: this.quizSettings.auto_weighting,
        allowed_types: this.quizSettings.allowed_types,
        ...(this.quizMode === 'ai' ? { requested_question_count: requestedQuestionCount } : {}),
        ...(this.quizMode === 'ai' ? {
          ai_generation_info: {
            used: true,
            source: 'section_context'
          }
        } : {})
      };

      const payload: CreateSectionContentPayload = {
        type: 'quiz',
        title: this.quizSettings.title.trim(),
        body_html: undefined,
        status: true,
        meta
      };

      this.creatingQuiz = true;
      this.cdr.detectChanges();

      this.ai.createSectionContent(sectionId, payload).subscribe({
        next: (response) => {
          this.creatingQuiz = false;
          this.currentQuizId = String(response.content.id);
          this.showQuizWizardModal = false;
          
          if (this.quizMode === 'manual') {
            this.openQuizEditor();
          } else if (this.quizMode === 'ai') {
            this.openQuizEditor();
            // Optionally auto-trigger AI generation
            // this.generateAIQuizQuestions();
          }
          
          // Refresh section content
          if (this.activeSectionId) {
            this.loadedSectionContentIds.delete(this.activeSectionId);
            this.ensureSectionContentLoaded(this.activeSectionId);
          }
          this.toastr?.success?.(this.currentLang === 'ar' ? 'تم إنشاء الاختبار بنجاح' : 'Quiz created successfully');
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.creatingQuiz = false;
          console.error('Error creating quiz:', error);
          this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إنشاء الاختبار' : 'Failed to create quiz');
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      console.error('Error saving quiz settings:', error);
      this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في حفظ إعدادات الاختبار' : 'Failed to save quiz settings');
    }
  }

  // ============ QUIZ EDITOR METHODS ============
  openQuizEditor(): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    // Load quiz metadata from section content if available
    const activeSection = this.sections.find(s => s.id === this.activeSectionId);
    if (activeSection && activeSection.content_items) {
      const quizItem = activeSection.content_items.find(item => item.id === this.currentQuizId && item.type === 'quiz');
      if (quizItem && quizItem.meta) {
        const meta = quizItem.meta as Record<string, unknown>;
        this.quizMode = (meta['mode'] as 'manual' | 'ai') || 'manual';
        this.quizSettings.title = quizItem.title;
        this.quizSettings.full_score = Number(meta['full_score']) || 40;
        this.quizSettings.time_limit = meta['time_limit'] ? Number(meta['time_limit']) : null;
        this.quizSettings.allowed_types = Array.isArray(meta['allowed_types']) ? meta['allowed_types'] as string[] : ['mcq', 'true_false', 'matching', 'ordering'];
        this.quizSettings.auto_weighting = meta['auto_weighting'] !== false;
        const requestedCount = Number(meta['requested_question_count']);
        const actualCount = Number(meta['question_count']);
        const fallbackCount = actualCount > 0 ? actualCount : 10;
        this.quizSettings.question_count = Number.isFinite(requestedCount) && requestedCount > 0
          ? Math.max(1, Math.min(50, Math.round(requestedCount)))
          : fallbackCount;
        this.quizSettings.max_attempts = meta['max_attempts'] !== undefined && meta['max_attempts'] !== null 
          ? Number(meta['max_attempts']) 
          : null;
      }
    }

    this.showQuizEditorModal = true;
    this.loadQuizQuestions();
    this.cdr.detectChanges();
  }

  closeQuizEditor(): void {
    this.showQuizEditorModal = false;
    this.currentQuizId = null;
    this.quizQuestions = [];
    this.currentQuestion = null;
    this.showQuestionEditor = false;
    this.editingQuizSettings = false;
    this.cdr.detectChanges();
  }

  updateTimeLimit(value: string): void {
    this.quizSettings.time_limit = value && value.trim() ? Number(value) : null;
  }

  updateMaxAttempts(value: string): void {
    this.quizSettings.max_attempts = value && value.trim() ? Number(value) : null;
  }

  updateQuizSettings(): void {
    if (!this.currentQuizId || !this.activeSectionId || this.savingQuizSettings) {
      return;
    }

    this.savingQuizSettings = true;
    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    // Build meta object with updated settings
    const activeSection = this.sections.find(s => s.id === this.activeSectionId);
    const quizItem = activeSection?.content_items?.find(item => item.id === this.currentQuizId && item.type === 'quiz');
    const existingMeta = (quizItem?.meta as Record<string, unknown>) || {};

    const meta: Record<string, unknown> = {
      ...existingMeta,
      full_score: this.quizSettings.full_score,
      time_limit: this.quizSettings.time_limit || null,
      max_attempts: this.quizSettings.max_attempts || null
      // Preserve other settings (mode, allowed_types, auto_weighting, etc.) from existingMeta
    };

    const payload = {
      title: this.quizSettings.title,
      meta: meta
    };

    this.ai.updateSectionContent(sectionId, contentId, payload).subscribe({
      next: (response) => {
        this.savingQuizSettings = false;
        this.editingQuizSettings = false;
        
        // Update the quiz item in sections (update title and meta)
        if (activeSection && activeSection.content_items) {
          const itemIndex = activeSection.content_items.findIndex(item => item.id === this.currentQuizId);
          if (itemIndex >= 0) {
            activeSection.content_items[itemIndex] = {
              ...activeSection.content_items[itemIndex],
              title: this.quizSettings.title,
              meta: meta
            };
          }
        }

        this.toastr?.success?.(
          this.currentLang === 'ar' ? 'تم تحديث إعدادات الاختبار بنجاح' : 'Quiz settings updated successfully'
        );
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.savingQuizSettings = false;
        console.error('Error updating quiz settings:', error);
        this.toastr?.error?.(
          this.currentLang === 'ar' ? 'فشل في تحديث إعدادات الاختبار' : 'Failed to update quiz settings'
        );
        this.cdr.detectChanges();
      }
    });
  }

  testQuiz(): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    if (this.quizQuestions.length === 0) {
      this.toastr?.warning?.(this.currentLang === 'ar' ? 'لا توجد أسئلة في الاختبار' : 'No questions in the quiz');
      return;
    }

    // Navigate to quiz test page with query parameters
    this.router.navigate(['/student/starter/quiz-test'], {
      queryParams: {
        quizId: this.currentQuizId,
        sectionId: this.activeSectionId
      }
    });
  }

  loadQuizQuestions(): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    this.quizLoading = true;
    this.cdr.detectChanges();

    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    if (isNaN(sectionId) || isNaN(contentId)) {
      this.quizLoading = false;
      this.toastr?.error?.(this.currentLang === 'ar' ? 'معرفات غير صالحة' : 'Invalid IDs');
      return;
    }

    this.ai.getQuizQuestions(sectionId, contentId).subscribe({
      next: (response) => {
        this.quizQuestions = response.questions || [];
        this.quizLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading quiz questions:', error);
        this.quizQuestions = [];
        this.quizLoading = false;
        this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في تحميل الأسئلة' : 'Failed to load questions');
        this.cdr.detectChanges();
      }
    });
  }


  // ============ QUIZ QUESTION METHODS ============
  addNewQuestion(questionType: 'mcq' | 'true_false' | 'matching' | 'ordering'): void {
    const newQuestion: Partial<QuizQuestion> = {
      question_type: questionType,
      prompt: '',
      payload: this.createDefaultPayload(questionType),
      position: this.quizQuestions.length + 1,
      points: 0,
      explanation: null
    };
    
    this.currentQuestion = newQuestion as QuizQuestion;
    this.showQuestionEditor = true;
    this.cdr.detectChanges();
  }

  editQuestion(question: QuizQuestion): void {
    this.currentQuestion = { ...question };
    this.showQuestionEditor = true;
    this.cdr.detectChanges();
  }

  deleteQuestion(question: QuizQuestion): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    const confirmed = confirm(
      this.currentLang === 'ar' 
        ? 'هل أنت متأكد من حذف هذا السؤال؟'
        : 'Are you sure you want to delete this question?'
    );

    if (!confirmed) {
      return;
    }

    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    if (isNaN(sectionId) || isNaN(contentId)) {
      return;
    }

    this.ai.deleteQuizQuestion(sectionId, contentId, question.id).subscribe({
      next: () => {
        this.quizQuestions = this.quizQuestions.filter(q => q.id !== question.id);
        this.loadQuizQuestions(); // Reload to get updated points
        this.toastr?.success?.(this.currentLang === 'ar' ? 'تم حذف السؤال بنجاح' : 'Question deleted successfully');
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting question:', error);
        this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في حذف السؤال' : 'Failed to delete question');
      }
    });
  }

  savingQuestion: boolean = false;

  saveQuestion(question: Partial<QuizQuestion>): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    if (!question.prompt || !question.prompt.trim()) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'نص السؤال مطلوب' : 'Question prompt is required');
      return;
    }

    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    if (isNaN(sectionId) || isNaN(contentId)) {
      return;
    }

    this.savingQuestion = true;

    const payload: CreateQuizQuestionPayload = {
      question_type: question.question_type!,
      prompt: question.prompt.trim(),
      payload: question.payload!,
      explanation: question.explanation || null,
      position: question.position
    };

    if (question.id) {
      // Update existing question
      this.ai.updateQuizQuestion(sectionId, contentId, question.id, payload).subscribe({
        next: (response) => {
          const index = this.quizQuestions.findIndex(q => q.id === question.id);
          if (index >= 0) {
            this.quizQuestions[index] = response.question;
          }
          this.savingQuestion = false;
          this.showQuestionEditor = false;
          this.currentQuestion = null;
          this.loadQuizQuestions(); // Reload to get updated points
          this.toastr?.success?.(this.currentLang === 'ar' ? 'تم تحديث السؤال بنجاح' : 'Question updated successfully');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating question:', error);
          this.savingQuestion = false;
          this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في تحديث السؤال' : 'Failed to update question');
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new question
      this.ai.createQuizQuestion(sectionId, contentId, payload).subscribe({
        next: (response) => {
          this.quizQuestions.push(response.question);
          this.savingQuestion = false;
          this.showQuestionEditor = false;
          this.currentQuestion = null;
          this.loadQuizQuestions(); // Reload to get updated points
          this.toastr?.success?.(this.currentLang === 'ar' ? 'تم إضافة السؤال بنجاح' : 'Question added successfully');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating question:', error);
          this.savingQuestion = false;
          this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إضافة السؤال' : 'Failed to add question');
          this.cdr.detectChanges();
        }
      });
    }
  }

  cancelQuestionEdit(): void {
    this.showQuestionEditor = false;
    this.currentQuestion = null;
    this.cdr.detectChanges();
  }

  moveQuestionUp(question: QuizQuestion): void {
    const index = this.quizQuestions.findIndex(q => q.id === question.id);
    if (index <= 0) {
      return;
    }

    const newQuestions = [...this.quizQuestions];
    [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
    
    this.reorderQuestions(newQuestions);
  }

  moveQuestionDown(question: QuizQuestion): void {
    const index = this.quizQuestions.findIndex(q => q.id === question.id);
    if (index >= this.quizQuestions.length - 1) {
      return;
    }

    const newQuestions = [...this.quizQuestions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    
    this.reorderQuestions(newQuestions);
  }

  reorderQuestions(questions: QuizQuestion[]): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    if (isNaN(sectionId) || isNaN(contentId)) {
      return;
    }

    const reorderPayload = questions.map((q, index) => ({
      id: q.id,
      position: index + 1
    }));

    this.ai.reorderQuizQuestions(sectionId, contentId, reorderPayload).subscribe({
      next: () => {
        this.quizQuestions = questions;
        this.loadQuizQuestions(); // Reload to ensure sync
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error reordering questions:', error);
        this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إعادة ترتيب الأسئلة' : 'Failed to reorder questions');
        this.loadQuizQuestions(); // Reload on error
      }
    });
  }

  generateAIQuizQuestions(): void {
    if (!this.currentQuizId || !this.activeSectionId) {
      return;
    }

    const sectionId = Number(this.activeSectionId);
    const contentId = Number(this.currentQuizId);

    if (isNaN(sectionId) || isNaN(contentId)) {
      return;
    }

    this.generatingQuiz = true;
    this.startTextEditorDhikrRotation(); // Start istighfar rotation
    this.cdr.detectChanges();

    const questionCount = Math.max(1, Math.min(50, Math.round(Number(this.quizSettings.question_count) || 10)));
    this.quizSettings.question_count = questionCount;

    const payload: GenerateQuizPayload = {
      question_count: questionCount,
      allowed_types: this.quizSettings.allowed_types
    };

    this.ai.generateAIQuizQuestions(sectionId, contentId, payload).subscribe({
      next: (response) => {
        this.generatingQuiz = false;
        this.stopTextEditorDhikrRotation(); // Stop istighfar rotation
        if (response.questions && response.questions.length > 0) {
          this.quizQuestions = response.questions;
          this.toastr?.success?.(
            this.currentLang === 'ar' 
              ? `تم إنشاء ${response.questions.length} سؤال بنجاح`
              : `Generated ${response.questions.length} questions successfully`
          );
          this.loadQuizQuestions(); // Reload to get distributed points
        } else {
          this.toastr?.warning?.(this.currentLang === 'ar' ? 'لم يتم إنشاء أي أسئلة' : 'No questions generated');
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error generating quiz questions:', error);
        this.generatingQuiz = false;
        this.stopTextEditorDhikrRotation(); // Stop istighfar rotation on error
        this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إنشاء الأسئلة' : 'Failed to generate questions');
        this.cdr.detectChanges();
      }
    });
  }

  createDefaultPayload(questionType: 'mcq' | 'true_false' | 'matching' | 'ordering'): QuizQuestionPayload {
    switch (questionType) {
      case 'mcq':
        return {
          choices: ['', '', '', ''],
          correct_index: 0
        };
      case 'true_false':
        return {
          correct_answer: true
        };
      case 'matching':
        return {
          pairs: [
            { left: '', right: '' },
            { left: '', right: '' }
          ]
        };
      case 'ordering':
        return {
          items: ['', ''],
          correct_order: [0, 1]
        };
      default:
        return {};
    }
  }

  getQuizInfo(quizItem: ContentItem): { questionCount: number; fullScore: number; pointsPerQuestion: number } {
    const meta = (quizItem.meta || {}) as Record<string, unknown>;
    const questionCount = Number(meta['question_count']) || 0;
    const fullScore = Number(meta['full_score']) || 0;
    const pointsPerQuestion = questionCount > 0 ? fullScore / questionCount : 0;
    
    return {
      questionCount,
      fullScore,
      pointsPerQuestion: Math.round(pointsPerQuestion * 100) / 100
    };
  }

  toggleQuestionType(type: string): void {
    const index = this.quizSettings.allowed_types.indexOf(type);
    if (index >= 0) {
      this.quizSettings.allowed_types.splice(index, 1);
    } else {
      this.quizSettings.allowed_types.push(type);
    }
    this.cdr.detectChanges();
  }

  getQuestionTypeLabel(type: string): string {
    const labels: Record<string, { ar: string; en: string }> = {
      mcq: { ar: 'اختيار من متعدد', en: 'Multiple Choice' },
      true_false: { ar: 'صحيح/خطأ', en: 'True/False' },
      matching: { ar: 'مطابقة', en: 'Matching' },
      ordering: { ar: 'ترتيب', en: 'Ordering' }
    };
    const label = labels[type] || { ar: type, en: type };
    return this.currentLang === 'ar' ? label.ar : label.en;
  }

  Math = Math; // Expose Math for template use
  String = String; // Expose String for template use

  // Question Editor Helpers
  trackByChoiceIndex(index: number, item: string): number {
    return index;
  }

  updateMcqChoice(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.currentQuestion && this.currentQuestion.payload.choices) {
      this.currentQuestion.payload.choices[index] = input.value;
    }
  }

  addMcqChoice(): void {
    if (this.currentQuestion && this.currentQuestion.payload.choices && this.currentQuestion.payload.choices.length < 10) {
      this.currentQuestion.payload.choices.push('');
    }
  }

  removeMcqChoice(index: number): void {
    if (this.currentQuestion && this.currentQuestion.payload.choices && this.currentQuestion.payload.choices.length > 2) {
      const correctIndex = this.currentQuestion.payload.correct_index || 0;
      this.currentQuestion.payload.choices.splice(index, 1);
      if (correctIndex >= index && correctIndex > 0) {
        this.currentQuestion.payload.correct_index = correctIndex - 1;
      } else if (correctIndex === index) {
        this.currentQuestion.payload.correct_index = 0;
      }
    }
  }

  addMatchingPair(): void {
    if (this.currentQuestion && this.currentQuestion.payload.pairs) {
      this.currentQuestion.payload.pairs.push({ left: '', right: '' });
    }
  }

  removeMatchingPair(index: number): void {
    if (this.currentQuestion && this.currentQuestion.payload.pairs && this.currentQuestion.payload.pairs.length > 2) {
      this.currentQuestion.payload.pairs.splice(index, 1);
    }
  }

  addOrderingItem(): void {
    if (this.currentQuestion && this.currentQuestion.payload.items) {
      this.currentQuestion.payload.items.push('');
      this.currentQuestion.payload.correct_order = this.currentQuestion.payload.items.map((_, i) => i);
    }
  }

  removeOrderingItem(index: number): void {
    if (this.currentQuestion && this.currentQuestion.payload.items && this.currentQuestion.payload.items.length > 2) {
      this.currentQuestion.payload.items.splice(index, 1);
      this.currentQuestion.payload.correct_order = this.currentQuestion.payload.items.map((_, i) => i);
    }
  }

  // TrackBy function for ordering items to prevent focus loss
  trackByOrderingItemIndex(index: number, item: string): number {
    return index;
  }

  // Update ordering item value manually to prevent focus loss
  updateOrderingItem(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.currentQuestion && this.currentQuestion.payload.items) {
      this.currentQuestion.payload.items[index] = input.value;
    }
  }

  // Text Editor Methods
  closeTextEditor(saved: boolean = false): void {
    if (saved) {
      this.pendingImageUploads.clear();
    } else {
      this.cleanupPendingImageUploads();
    }

    if (this.editorImageChangeDebounce !== null) {
      clearTimeout(this.editorImageChangeDebounce);
      this.editorImageChangeDebounce = null;
    }

    this.editorActiveImageKeys.clear();
    this.editorKnownImageMap.clear();
    this.editorDeletedImageKeys.clear();
    this.pendingEditorData = null;

    this.showTextEditor = false;
    // Reset editor instance when closing
    this.currentEditor = null;
    this.selectedContentType = null;
    this.subsectionTitle = '';
    this.textContent = '';
    this.textSaveError = null;
    // Reset viewingContentItem to ensure clean state for next creation
    if (!saved) {
      this.currentEditingContentId = null;
      this.viewingContentItem = null;
    }
    this.cdr.detectChanges();
  }

  cancelTextEditor(): void {
    this.savingTextContent = false;
    this.textSaveError = null;
    this.closeTextEditor(false);
  }

  get isEditorUploading(): boolean {
    return this.hasActiveEditorUploads();
  }

  generateTextWithAI(): void {
    if (this.generatingWithAI) return;
    
    // Validate that subsection title is provided (users cannot generate without title)
    if (!this.subsectionTitle || this.subsectionTitle.trim().length === 0) {
      alert(this.currentLang === 'ar'
        ? 'الرجاء إدخال عنوان الدرس قبل إنشاء المحتوى بالذكاء الاصطناعي.'
        : 'Please enter a lesson title before generating content with AI.');
      return;
    }

    // Warn user if content already exists (will be replaced)
    const existingContent = this.currentEditor ? this.currentEditor.getData() : this.textContent;
    if (existingContent && existingContent.trim().length > 0) {
      const confirmReplace = confirm(
        this.currentLang === 'ar'
          ? 'المحتوى الحالي سيتم استبداله بالمحتوى الذي سيولده الذكاء الاصطناعي. هل تريد المتابعة؟'
          : 'The current content will be replaced with new AI-generated content. Do you want to continue?'
      );
      if (!confirmReplace) {
        return;
      }
    }

    // Show hint modal first
    this.pendingAiAction = 'textContent';
    
    // Pre-fill hint from meta field if it exists (max 100 words from AI generation)
    if (this.viewingContentItem?.meta && typeof this.viewingContentItem.meta === 'object') {
      const meta = this.viewingContentItem.meta as any;
      if (meta.hint && typeof meta.hint === 'string') {
        this.aiHint = meta.hint;
      } else {
        this.aiHint = '';
      }
    } else {
      this.aiHint = '';
    }
    
    this.showAIHintModal = true;
  }
  
  proceedWithAIGeneration(withHint: boolean = false): void {
    const action = this.pendingAiAction;
    const hintValue = withHint ? this.aiHint.trim() : '';
    
    // Close hint modal and reset hint state for next time
    this.showAIHintModal = false;
    this.aiHint = '';
    this.pendingAiAction = null;
    
    if (action === 'textContent') {
      this.generateTextContentWithAI(hintValue);
    }
  }
  
  private generateTextContentWithAI(hint?: string): void {
    if (this.generatingWithAI) return;
    
    this.generatingWithAI = true;
    this.startTextEditorDhikrRotation();
    
    const grade = this.stageName || '';
    const country = this.countryName || '';
    const course_name = this.courseName || '';
    const category = this.selectedCategory 
      ? (this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en)
      : '';
    
    let sectionName = '';
    if (this.activeSectionId) {
      const activeSection = this.sections.find(s => s.id === this.activeSectionId);
      if (activeSection) {
        sectionName = activeSection.name;
      }
    }
    const section = sectionName || this.selectedTopic || this.subjectSlug || '';
    const title = this.subsectionTitle.trim();
    const hintText = hint?.trim() || '';
    
    const restrictions: string[] = [];
    if (course_name) {
      restrictions.push(
        this.currentLang === 'ar' 
          ? `يجب أن يكون المحتوى متعلقًا فقط بدورة "${course_name}" ولا يتضمن مواضيع خارجية`
          : `Content must be strictly related to the course "${course_name}" and must not include unrelated topics`
      );
    }
    if (section) {
      restrictions.push(
        this.currentLang === 'ar'
          ? `يجب أن يكون المحتوى متعلقًا بقسم "${section}" فقط`
          : `Content must be strictly related to the section "${section}" only`
      );
    }
    if (title) {
      restrictions.push(
        this.currentLang === 'ar'
          ? `يجب أن يركز المحتوى على العنوان "${title}" فقط ولا يتجاوزه`
          : `Content must focus strictly on the title "${title}" and must not deviate from it`
      );
    }
    
    const payload: any = {
      grade,
      country,
      course_name,
      category,
      section,
      title,
      locale: this.currentLang
    };
    
    const richContentInstruction = this.currentLang === 'ar'
      ? 'ينبغي أن يكون المحتوى بتنسيق HTML صالح ومتوافق مع CKEditor 5، مع تضمين عناوين منسقة بمستويات مناسبة، قوائم نقطية أو مرقمة، جداول منظمة عند الحاجة، روابط سليمة، نصوص مميزة باستخدام الوسوم <strong> و <em>، واستخدام رموز تعبيرية (Unicode emoji) مناسبة لزيادة التوضيح متى ما أمكن دون مبالغة. يُمنع استخدام سكربتات أو وسوم غير مدعومة. يجب إرجاع النتيجة النهائية في JSON بالهيكل { "content": "..." }.'
      : 'Return the final result as JSON with the shape { "content": "..." }. The HTML string must be valid for CKEditor 5 and feel rich: include semantic headings, bullet/numbered lists, well-structured tables where useful, safe links, highlighted text via <strong> / <em>, and sprinkle relevant Unicode emojis to enhance clarity (without overusing them). Absolutely no scripts or unsupported embeds.';

    if (restrictions.length > 0) {
      restrictions.push(richContentInstruction);
      payload.restrictions = restrictions.join('. ');
      payload.instructions = this.currentLang === 'ar'
        ? `مهم جداً: يجب أن يقتصر المحتوى على موضوع الدورة "${course_name}" وقسم "${section}" والعنوان "${title}" فقط. لا تتضمن أي معلومات أو أمثلة غير متعلقة بهذه الموضوعات.`
        : `CRITICAL: Content must be strictly limited to the course "${course_name}", section "${section}", and title "${title}" only. Do not include any information or examples unrelated to these topics.`;
    } else {
      payload.instructions = richContentInstruction;
    }
    
    if (payload.instructions && payload.instructions !== richContentInstruction) {
      payload.instructions = `${payload.instructions} ${richContentInstruction}`;
    }
    
    if (hintText) {
      payload.hint = hintText;
    }
    
    console.log('Generating text content with AI...', payload);
    
    this.http.post<{ content: string }>(`${this.baseUrl}/ai/content/text`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.currentLang === 'ar' ? 'ar' : 'en'
      }
    }).subscribe({
      next: (response) => {
        const generatedContent = response.content || '<p>No content generated.</p>';
        this.textContent = generatedContent;
        
        // Update CKEditor if it exists
        if (this.currentEditor) {
          this.currentEditor.setData(generatedContent);
        }
        
        this.generatingWithAI = false;
        this.stopTextEditorDhikrRotation();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('AI text generation error:', error);
        this.textContent = `<p>${this.currentLang === 'ar' ? 'فشل في إنشاء المحتوى. يرجى المحاولة مرة أخرى.' : 'Failed to generate content. Please try again.'}</p>`;
        this.generatingWithAI = false;
        this.stopTextEditorDhikrRotation();
        this.cdr.detectChanges();
      }
    });
  }
  
  cancelAIHint(): void {
    this.showAIHintModal = false;
    this.aiHint = '';
    this.pendingAiAction = null;
  }

  saveTextContent(): void {
    console.log('=== saveTextContent called ===');
    console.log('savingTextContent:', this.savingTextContent);
    console.log('subsectionTitle:', this.subsectionTitle);
    console.log('viewingContentItem:', this.viewingContentItem);
    console.log('currentEditingContentId:', this.currentEditingContentId);
    console.log('currentEditor exists:', !!this.currentEditor);
    console.log('textContent length:', this.textContent?.length || 0);
    
    if (this.savingTextContent) {
      console.log('Already saving, returning early');
      return;
    }

    if (this.hasActiveEditorUploads()) {
      const message = this.currentLang === 'ar'
        ? 'يرجى الانتظار حتى يكتمل رفع جميع الصور قبل الحفظ.'
        : 'Please wait until all image uploads have finished before saving.';
      this.textSaveError = message;
      this.toastr.warning(message);
      console.log('Active uploads detected, returning early');
      return;
    }

    const trimmedTitle = (this.subsectionTitle || '').trim();
    if (!trimmedTitle) {
      this.textSaveError = this.currentLang === 'ar'
        ? 'يرجى إدخال عنوان للدرس.'
        : 'Please provide a lesson title.';
      console.log('No title provided, returning early');
      return;
    }

    // When editing existing content, use its section ID; otherwise use active section
    let targetSectionId: string | undefined;
    if (this.viewingContentItem && this.viewingContentItem.section_id) {
      targetSectionId = this.viewingContentItem.section_id;
      console.log('Using section_id from viewingContentItem:', targetSectionId);
    } else {
      const activeSection = this.getActiveSection() || this.sections[0];
      if (activeSection) {
        targetSectionId = activeSection.id;
        console.log('Using active section ID:', targetSectionId);
      }
    }
    
    if (!targetSectionId) {
      this.textSaveError = this.currentLang === 'ar'
        ? 'لا يوجد قسم متاح لحفظ الدرس.'
        : 'No section is available to attach the lesson.';
      console.log('No targetSectionId found, returning early');
      return;
    }
    
    let targetSection = this.getSection(targetSectionId);
    
    // If section not found, try to ensure it's loaded
    if (!targetSection) {
      console.log('Target section not found. Available sections:', this.sections.map(s => ({ id: s.id, name: s.name, type: typeof s.id })));
      console.log('Looking for section ID:', targetSectionId, 'Type:', typeof targetSectionId);
      
      // Try to ensure section content is loaded (might trigger section load)
      this.ensureSectionContentLoaded(targetSectionId);
      
      // Try again after ensuring content is loaded
      targetSection = this.getSection(targetSectionId);
    }
    
    if (!targetSection) {
      console.error('Section still not found after ensuring content loaded');
      this.textSaveError = this.currentLang === 'ar'
        ? 'القسم المحدد غير موجود. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
        : 'The specified section does not exist. Please refresh the page and try again.';
      return;
    }
    
    console.log('Target section found:', { id: targetSection.id, name: targetSection.name, type: typeof targetSection.id });

    const numericSectionId = Number(targetSectionId);
    if (!Number.isFinite(numericSectionId)) {
      this.textSaveError = this.currentLang === 'ar'
        ? 'يرجى حفظ القسم في الخادم قبل إضافة الدروس.'
        : 'Please sync the section with the server before adding lessons.';
      console.log('Section ID is not numeric:', targetSectionId);
      return;
    }
    
    console.log('All validations passed, proceeding with API call');
    console.log('numericSectionId:', numericSectionId);

    // Get content from editor if available, otherwise use textContent
    let editorContent = '';
    if (this.currentEditor) {
      editorContent = this.currentEditor.getData();
      console.log('Got content from editor, length:', editorContent?.length || 0);
    } else {
      editorContent = this.textContent || '';
      console.log('Got content from textContent, length:', editorContent?.length || 0);
    }
    
    // Ensure we have some content to save
    if (!editorContent || editorContent.trim().length === 0 || editorContent === '<p></p>' || editorContent === '<p><br></p>') {
      this.textSaveError = this.currentLang === 'ar'
        ? 'يرجى إضافة محتوى للدرس قبل الحفظ.'
        : 'Please add content to the lesson before saving.';
      this.savingTextContent = false;
      console.log('No content to save, returning early');
      return;
    }
    
    const payload: CreateSectionContentPayload = {
      type: 'text',
      title: trimmedTitle,
      body_html: editorContent,
      status: true
    };
    
    console.log('Payload prepared:', { type: payload.type, title: payload.title, body_html_length: payload.body_html?.length || 0 });

    const editingItem = this.viewingContentItem;
    const editingContentId = editingItem ? Number(editingItem.id) : NaN;
    const isUpdatingExisting = Number.isFinite(editingContentId);

    const sectionKey = targetSectionId;
    let placeholderItemId: string | null = null;
    let targetSectionIndex = -1;
    let previousItemSnapshot: ContentItem | null = null;

    if (targetSection) {
      if (isUpdatingExisting) {
        targetSectionIndex = targetSection.content_items.findIndex(item => item.id === String(editingItem?.id));
        if (targetSectionIndex >= 0) {
          previousItemSnapshot = { ...targetSection.content_items[targetSectionIndex] };
          targetSection.content_items[targetSectionIndex] = {
            ...targetSection.content_items[targetSectionIndex],
            title: trimmedTitle,
            content: editorContent,
          status: true,
            updatedAt: new Date().toISOString()
          };
          this.setContentStatusPending(previousItemSnapshot.id, true);
        }
      } else {
        placeholderItemId = this.generateDraftContentId();
        const nowIso = new Date().toISOString();
        const placeholder: ContentItem = {
          id: placeholderItemId,
          type: 'text',
          title: trimmedTitle,
          content: editorContent,
          section_id: sectionKey,
          createdAt: nowIso,
          updatedAt: nowIso,
          position: targetSection.content_items.length + 1,
          status: true
        };
        targetSectionIndex = targetSection.content_items.length;
        targetSection.content_items = [...targetSection.content_items, placeholder];
        this.setContentStatusPending(placeholderItemId, true);
      }

      this.rebuildLegacyContentItems();
      this.cdr.detectChanges();
    }

    console.log('Preparing to make API call...');
    console.log('isUpdatingExisting:', isUpdatingExisting);
    console.log('editingContentId:', editingContentId);
    console.log('payload:', payload);
    console.log('editorContent length:', editorContent?.length || 0);
    
    this.savingTextContent = true;
    this.textSaveError = null;
    this.cdr.detectChanges();

    const request$ = isUpdatingExisting
      ? this.ai.updateSectionContent(numericSectionId, editingContentId, payload)
      : this.ai.createSectionContent(numericSectionId, payload);

    console.log('API request created, subscribing...');
    request$
      .pipe(finalize(() => {
        this.savingTextContent = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          const record = response?.content;
          if (!record) {
            console.warn('Content response missing payload.', response);
            return;
          }

          const mappedItem = this.mapContentRecordToItem(record);
          const responseSectionKey = String(record.section_id);
          const responseSection = this.getSection(responseSectionKey);

          if (!responseSection) {
            console.warn('Unable to locate section locally for content record.', record);
            return;
          }

          if (!isUpdatingExisting && placeholderItemId) {
            responseSection.content_items = responseSection.content_items.filter(item => item.id !== placeholderItemId);
            this.setContentStatusPending(placeholderItemId, false);
          }

          const existingIndex = responseSection.content_items.findIndex((item) => item.id === mappedItem.id);
          if (existingIndex >= 0) {
            responseSection.content_items[existingIndex] = mappedItem;
          } else {
            responseSection.content_items.push(mappedItem);
            responseSection.content_items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          }

          responseSection.updatedAt = mappedItem.updatedAt || new Date().toISOString();
          this.loadedSectionContentIds.add(responseSectionKey);
          this.rebuildLegacyContentItems();
          this.saveSections();
          this.setContentStatusPending(mappedItem.id, false);

          this.pruneUnusedPendingImages(record.body_html ?? editorContent);
          this.viewingContentItem = null;
          this.closeTextEditor(true);
        },
        error: (error) => {
          console.error('Failed to save text content to server:', error);
          this.textSaveError = this.currentLang === 'ar'
            ? 'تعذر حفظ الدرس. حاول مرة أخرى.'
            : 'Failed to save the lesson. Please try again.';

          if (placeholderItemId) {
            const fallbackSection = this.getSection(sectionKey);
            if (fallbackSection) {
              fallbackSection.content_items = fallbackSection.content_items.filter(item => item.id !== placeholderItemId);
              this.rebuildLegacyContentItems();
            }
            this.setContentStatusPending(placeholderItemId, false);
          }

          if (previousItemSnapshot && targetSection && targetSectionIndex >= 0) {
            targetSection.content_items[targetSectionIndex] = previousItemSnapshot;
            this.rebuildLegacyContentItems();
            this.setContentStatusPending(previousItemSnapshot.id, false);
          }
        }
      });
  }
  
  // Edit Course Name
  startEditingCourseName(): void {
    this.editingCourseName = true;
    this.editingCourseNameValue = this.courseName;
  }
  
  saveCourseNameEdit(): void {
    const trimmedName = this.editingCourseNameValue.trim();
    if (!trimmedName || this.savingCourseName) {
      return;
    }

    this.savingCourseName = true;
    this.courseName = trimmedName;
    
    // Save to localStorage first
    this.saveDraftStep2();

    // Save to backend
    const userId = this.student?.id || this.student?.user_id;
    const topicValue = this.selectedTopic.trim() || this.subjectSlug.trim();
    
    const payload: UpdateDraftCoursePayload = {
      name: trimmedName,
      subject_slug: topicValue || undefined,
      preferences: {
        educationalStage: this.coursePreferences.educationalStage.length > 0 
          ? this.coursePreferences.educationalStage 
          : undefined,
        country: this.coursePreferences.country.length > 0 
          ? this.coursePreferences.country 
          : undefined
      }
    };

    this.ai.updateDraftCourse(payload).subscribe({
      next: (response) => {
        this.savingCourseName = false;
        this.editingCourseName = false;
        this.editingCourseNameValue = '';
        if (response) {
          this.handleDraftCourseResponse(response, userId);
        }
        this.cdr.detectChanges();
      }
    });
  }
  
  cancelCourseNameEdit(): void {
    this.editingCourseName = false;
    this.editingCourseNameValue = '';
  }
  
  // Edit Course Details (Name, Description, Stage, Country)
  startEditingCourseDetails(): void {
    this.showEditCourseDetailsModal = true;
    this.editingCourseNameValue = this.courseName;
    this.editingCourseDescriptionValue = this.courseDescription;
    this.editingCoursePreferences = {
      educationalStage: [...this.coursePreferences.educationalStage],
      country: [...this.coursePreferences.country]
    };
    // Load countries if not already loaded
    if (this.countries.length === 0) {
      this.loadCountries();
    }
  }
  
  cancelEditingCourseDetails(): void {
    this.showEditCourseDetailsModal = false;
    this.editingCourseNameValue = '';
    this.editingCourseDescriptionValue = '';
    this.editingCoursePreferences = {
      educationalStage: [],
      country: []
    };
  }
  
  saveCourseDetails(): void {
    const trimmedName = this.editingCourseNameValue.trim();
    if (!trimmedName || this.savingCourseDetails || this.editingCoursePreferences.educationalStage.length === 0) {
      return;
    }

    this.savingCourseDetails = true;
    this.courseName = trimmedName;
    this.courseDescription = this.editingCourseDescriptionValue.trim();
    this.coursePreferences.educationalStage = [...this.editingCoursePreferences.educationalStage];
    this.coursePreferences.country = [...this.editingCoursePreferences.country];
    
    // Save to localStorage first
    this.saveDraftStep2();

    // Save to backend
    const userId = this.student?.id || this.student?.user_id;
    const topicValue = this.selectedTopic.trim() || this.subjectSlug.trim();
    
    const payload: UpdateDraftCoursePayload = {
      name: trimmedName,
      subject_slug: topicValue || undefined,
      description: this.courseDescription || undefined,
      preferences: {
        educationalStage: this.coursePreferences.educationalStage.length > 0 
          ? this.coursePreferences.educationalStage 
          : undefined,
        country: this.coursePreferences.country.length > 0 
          ? this.coursePreferences.country 
          : undefined
      }
    };

    this.ai.updateDraftCourse(payload).subscribe({
      next: (response) => {
        this.savingCourseDetails = false;
        this.showEditCourseDetailsModal = false;
        this.editingCourseNameValue = '';
        this.editingCourseDescriptionValue = '';
        if (response) {
          this.handleDraftCourseResponse(response, userId);
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.savingCourseDetails = false;
        console.error('Failed to save course details', error);
        this.cdr.detectChanges();
      }
    });
  }
  
  toggleEditingEducationalStage(stage: string): void {
    const index = this.editingCoursePreferences.educationalStage.indexOf(stage);
    if (index > -1) {
      this.editingCoursePreferences.educationalStage.splice(index, 1);
    } else {
      this.editingCoursePreferences.educationalStage.push(stage);
    }
  }
  
  getEducationalStageDisplayName(stage: string): string {
    const stageNames: { [key: string]: { en: string; ar: string } } = {
      'kindergarten': { en: 'Kindergarten', ar: 'رياض أطفال' },
      'primary': { en: 'Primary School', ar: 'ابتدائي' },
      'middle': { en: 'Middle School', ar: 'متوسط' },
      'high-school': { en: 'High School', ar: 'ثانوي' },
      'university': { en: 'University', ar: 'جامعي' },
      'professional': { en: 'Professional Training', ar: 'تدريب مهني' }
    };
    return stageNames[stage] ? (this.currentLang === 'ar' ? stageNames[stage].ar : stageNames[stage].en) : stage;
  }
  
  // Edit Section
  startEditingSection(sectionId?: string): void {
    this.editingSection = true;
    if (sectionId) {
      this.editingSectionId = sectionId;
      const section = this.sections.find(s => s.id === sectionId);
      this.editingSectionValue = section?.name || '';
    } else {
      // Legacy: edit first section from selectedTopic/subjectSlug
      this.editingSectionValue = this.selectedTopic || this.subjectSlug || '';
    }
  }
  
  saveSectionEdit(): void {
    if (this.editingSectionValue.trim()) {
      if (this.editingSectionId) {
        // Update specific section
        this.updateSectionName();
      } else {
        // Legacy: update first section or selectedTopic
        this.selectedTopic = this.editingSectionValue.trim();
        this.subjectSlug = this.editingSectionValue.trim();
        
        // Also update first section if it exists
        if (this.sections.length > 0) {
          this.sections[0].name = this.editingSectionValue.trim();
          this.sections[0].updatedAt = new Date().toISOString();
          this.saveSections();
        }
        
        this.saveDraftStep2();
        this.editingSection = false;
        this.editingSectionValue = '';
        this.cdr.detectChanges();
      }
    }
  }
  
  cancelSectionEdit(): void {
    this.editingSection = false;
    this.editingSectionId = null;
    this.editingSectionValue = '';
  }
  
  // View Content Item
  viewContentItem(item: ContentItem): void {
    console.log('viewContentItem called with:', item);
    // Open lesson builder for all content types
    this.openLessonBuilder(item);
  }

  // Legacy method - kept for backward compatibility
  viewContentItemLegacy(item: ContentItem): void {
    this.viewingContentItem = item;
    // Set active section to match the content's section
    if (item.section_id) {
      this.setActiveSection(item.section_id);
    }

    // Check if it is a draft (type text and empty content)
    // We treat empty content or just empty paragraph as draft
    const isDraft = item.type === 'text' && (!item.content || item.content.trim() === '' || item.content === '<p></p>');
    
    if (isDraft) {
      this.openContentTypeSelectionModal(item);
      return;
    }

    if (item.type === 'text') {
      // Open text editor with this content
      this.subsectionTitle = item.title;
      this.textContent = item.content || '<p></p>';
      this.textSaveError = null;
      // Close AI hint modal if it's open
      this.showAIHintModal = false;
      this.aiHint = '';
      this.pendingAiAction = null;
      this.showTextEditor = true;
      this.pendingImageUploads.clear();
      this.currentEditingContentId = item.id;
      this.editorKnownImageMap.clear();
      this.editorDeletedImageKeys.clear();
      this.editorActiveImageKeys.clear();

      const existingKeys = this.extractImageKeysFromHtml(this.textContent || '');
      existingKeys.forEach((key) => this.editorActiveImageKeys.add(key));

      if (Array.isArray(item.assets)) {
        item.assets.forEach((asset: any) => {
          const assetKey = asset?.key || asset?.extra?.s3Key || null;
          const assetUrl = asset?.url || null;
          if (assetKey && assetUrl) {
            this.editorKnownImageMap.set(this.normalizeAssetUrl(assetUrl) || assetUrl, assetKey);
            this.editorActiveImageKeys.add(assetKey);
          }
        });
      }
      this.cdr.detectChanges();
    } else if (item.type === 'resources') {
      this.openResourcePreview(item);
    } else if (item.type === 'video') {
      // Open video modal in view mode
      this.videoContentItem = item;
      this.viewingVideoContent = true;
      this.showVideoModal = true;
      this.selectedContentType = 'video';
      this.cdr.detectChanges();
    } else if (item.type === 'quiz') {
      // Open quiz editor modal
      this.currentQuizId = item.id;
      this.openQuizEditor();
    } else if (item.type === 'audio') {
      // Open audio modal in view mode
      this.audioContentItem = item;
      this.viewingAudioContent = true;
      this.showAudioModal = true;
      this.selectedContentType = 'audio';
      this.cdr.detectChanges();
    }
  }
  // Update content item when editing existing content
  updateContentItem(itemId: string, title: string, content: string): void {
    const index = this.contentItems.findIndex(item => item.id === itemId);
    if (index >= 0) {
      this.contentItems[index] = {
        ...this.contentItems[index],
        title: title.trim(),
        content: content,
        updatedAt: new Date().toISOString()
      };
      
      const userId = this.student?.id || this.student?.user_id;
      const draft = this.ai.getDraft(userId);
      this.ai.saveDraft({
        ...draft,
        content_items: this.contentItems
      }, userId);
      
      this.cdr.detectChanges();
    }
  }
  
  // Delete Content Item - Show warning modal first
  deleteContentItem(itemId: string): void {
    this.isDeletingContent = false;
    this.itemToDelete = itemId;
    this.warningModalType = 'deleteContent';
    this.showWarningModal = true;
  }
  
  // Confirm deletion after warning
  confirmDeleteContent(): void {
    if (!this.itemToDelete) return;
    
    this.isDeletingContent = true;
    const targetSection = this.sections.find((section) =>
      section.content_items.some((item) => item.id === this.itemToDelete)
    );

    const numericSectionId = targetSection ? Number(targetSection.id) : NaN;
    const numericContentId = Number(this.itemToDelete);

    const removeLocally = () => {
      if (targetSection) {
        targetSection.content_items = targetSection.content_items.filter((item) => item.id !== this.itemToDelete);
        targetSection.updatedAt = new Date().toISOString();
      } else {
        for (const section of this.sections) {
          const itemIndex = section.content_items.findIndex((item) => item.id === this.itemToDelete);
          if (itemIndex !== -1) {
            section.content_items.splice(itemIndex, 1);
            section.updatedAt = new Date().toISOString();
            break;
          }
        }
      }

      this.contentItems = this.contentItems.filter((item) => item.id !== this.itemToDelete);
      this.saveSections();

      // Close video modal if deleting the currently viewed video
      if (this.viewingVideoContent && this.videoContentItem && this.videoContentItem.id === this.itemToDelete) {
        this.showVideoModal = false;
        this.videoContentItem = null;
        this.viewingVideoContent = false;
      }
      
      // Close audio modal if deleting the currently viewed audio
      if (this.viewingAudioContent && this.audioContentItem && this.audioContentItem.id === this.itemToDelete) {
        this.showAudioModal = false;
        this.audioContentItem = null;
        this.viewingAudioContent = false;
      }
      
      this.showWarningModal = false;
      this.warningModalType = null;
      this.itemToDelete = null;
      this.isDeletingContent = false;
      const successMessage = this.currentLang === 'ar'
        ? 'تم حذف المحتوى بنجاح'
        : 'Content deleted successfully';
      this.toastr.success(successMessage);
      this.cdr.detectChanges();
    };

    if (targetSection && Number.isFinite(numericSectionId) && Number.isFinite(numericContentId)) {
      // Check if this is a video or audio content item that needs S3 deletion
      const contentItem = this.contentItems.find(item => item.id === this.itemToDelete);
      const isVideoContent = contentItem?.type === 'video';
      const isAudioContent = contentItem?.type === 'audio';
      
      // Delete from database first
      this.ai.deleteSectionContent(numericSectionId, numericContentId).subscribe({
        next: () => {
          this.loadedSectionContentIds.add(String(numericSectionId));
          
          // If it's a video with local file, delete from S3
          if (isVideoContent && contentItem?.meta && contentItem.meta['provider'] === 'local' && contentItem.meta['dataUrl']) {
            const videoUrl = contentItem.meta['dataUrl'] as string;
            this.videoUploadService.deleteVideos([videoUrl]).subscribe({
              next: () => {
                console.log('Video file deleted from S3 successfully');
                removeLocally();
              },
              error: (s3Error) => {
                console.error('Failed to delete video file from S3:', s3Error);
                // Still remove locally even if S3 deletion fails
                removeLocally();
                const warningMessage = this.currentLang === 'ar'
                  ? 'تم حذف المحتوى ولكن فشل حذف الملف من التخزين'
                  : 'Content deleted but failed to remove file from storage';
                this.toastr.warning(warningMessage);
              }
            });
          } else if (isAudioContent && contentItem?.meta && (contentItem.meta['provider'] === 'upload' || contentItem.meta['provider'] === 'convert' || contentItem.meta['provider'] === 'generate') && contentItem.meta['dataUrl']) {
            // If it's an audio file (uploaded or generated), delete from S3
            const audioUrl = contentItem.meta['dataUrl'] as string;
            this.audioUploadService.deleteAudios([audioUrl]).subscribe({
              next: () => {
                console.log('Audio file deleted from S3 successfully');
                removeLocally();
              },
              error: (s3Error) => {
                console.error('Failed to delete audio file from S3:', s3Error);
                // Still remove locally even if S3 deletion fails
                removeLocally();
                const warningMessage = this.currentLang === 'ar'
                  ? 'تم حذف المحتوى ولكن فشل حذف الملف الصوتي من التخزين'
                  : 'Content deleted but failed to remove audio file from storage';
                this.toastr.warning(warningMessage);
              }
            });
          } else {
            // Not a local video/audio or no file to delete
            removeLocally();
          }
        },
        error: (error) => {
          console.error('Failed to delete section content from server:', error);
          this.isDeletingContent = false;
          const errorMessage = this.currentLang === 'ar'
            ? 'تعذر حذف المحتوى من الخادم. حاول مرة أخرى.'
            : 'Failed to delete content from the server. Please try again.';
          this.toastr.error(errorMessage);
          this.cdr.detectChanges();
        }
      });
    } else {
      removeLocally();
    }
  }
  
  onContentDrop(event: CdkDragDrop<ContentItem[]>, section: Section): void {
    if (!section || !Array.isArray(section.content_items) || event.previousIndex === event.currentIndex) {
      return;
    }

    const items = section.content_items;
    const movedItem = items[event.previousIndex];
    if (!movedItem) {
      return;
    }

    const revertOrder = () => {
      moveItemInArray(items, event.currentIndex, event.previousIndex);
      this.normalizeSectionContentPositions(section);
      section.updatedAt = new Date().toISOString();
      this.saveSections();
      this.cdr.detectChanges();
    };

    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.normalizeSectionContentPositions(section);
    section.updatedAt = new Date().toISOString();
    this.saveSections();

    const numericSectionId = Number(section.id);
    const numericContentId = Number(movedItem.id);
    const targetPosition = event.currentIndex + 1;

    if (!Number.isFinite(numericSectionId) || !Number.isFinite(numericContentId)) {
      return;
    }

    this.contentReorderLoading.add(String(movedItem.id));
    this.cdr.markForCheck();

    this.ai.updateSectionContent(numericSectionId, numericContentId, {
      type: movedItem.type || 'text',
      title: movedItem.title || '',
      position: targetPosition
    }).subscribe({
      next: (resp) => {
        this.contentReorderLoading.delete(String(movedItem.id));
        if (resp?.content) {
          const idx = items.findIndex(ci => ci.id === String(resp.content.id));
          if (idx >= 0) {
            items[idx].position = resp.content.position;
          }
        }
        this.saveSections();
        this.cdr.detectChanges();
      },
      error: () => {
        this.contentReorderLoading.delete(String(movedItem.id));
        revertOrder();
        const msg = this.currentLang === 'ar'
          ? 'تعذر إعادة ترتيب المحتوى.'
          : 'Failed to reorder content.';
        this.toastr.error(msg);
      }
    });
  }

  // Move Content Item Up
  moveContentItemUp(index: number, sectionId?: string): void {
    // If sectionId provided, move within section
    if (sectionId) {
      const section = this.sections.find(s => s.id === sectionId);
      if (section && index > 0 && index < section.content_items.length) {
        const before = [...section.content_items];
        [section.content_items[index], section.content_items[index - 1]] = [section.content_items[index - 1], section.content_items[index]];
        // Optimistically adjust positions (1-based)
        const moved = section.content_items[index - 1];
        const swapped = section.content_items[index];
        if (typeof moved.position === 'number') moved.position = index; // new pos
        if (typeof swapped.position === 'number') swapped.position = index + 1; // shifted down

        this.contentReorderLoading.add(String(moved.id));
        this.contentReorderLoading.add(String(swapped.id));
        this.cdr.markForCheck();

        section.updatedAt = new Date().toISOString();
        this.saveSections();
        this.cdr.detectChanges();

        const numericSectionId = Number(sectionId);
        const numericContentId = Number(moved.id);
        const targetPosition = index; // 1-based
        if (Number.isFinite(numericSectionId) && Number.isFinite(numericContentId)) {
          this.ai.updateSectionContent(numericSectionId, numericContentId, { type: moved.type || 'text', title: moved.title || '', position: targetPosition })
            .subscribe({
              next: (resp) => {
                // Ensure local positions are consistent after server normalization
                const rec = resp?.content;
                if (rec) {
                  const updatedIdx = section.content_items.findIndex(ci => ci.id === String(rec.id));
                  if (updatedIdx >= 0) {
                    section.content_items[updatedIdx].position = rec.position;
                  }
                }
                // Finalize order by position just in case
                section.content_items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                this.contentReorderLoading.delete(String(moved.id));
                this.contentReorderLoading.delete(String(swapped.id));
                this.saveSections();
                this.cdr.detectChanges();
              },
              error: (_) => {
                // Revert on error
                section.content_items = before;
                this.contentReorderLoading.delete(String(moved.id));
                this.contentReorderLoading.delete(String(swapped.id));
                this.saveSections();
                this.cdr.detectChanges();
                const msg = this.currentLang === 'ar' ? 'تعذر تحديث ترتيب المحتوى.' : 'Failed to update content order.';
                this.toastr.error(msg);
              }
            });
        }
        return;
      }
    }
    
    // Legacy: move in contentItems
    if (index === 0) return;
    const items = [...this.contentItems];
    [items[index], items[index - 1]] = [items[index - 1], items[index]];
    this.contentItems = items;
    this.saveContentItemsOrder();
    this.cdr.detectChanges();
  }
  
  // Move Content Item Down
  moveContentItemDown(index: number, sectionId?: string): void {
    // If sectionId provided, move within section
    if (sectionId) {
      const section = this.sections.find(s => s.id === sectionId);
      if (section && index < section.content_items.length - 1) {
        const before = [...section.content_items];
        [section.content_items[index], section.content_items[index + 1]] = [section.content_items[index + 1], section.content_items[index]];
        // Optimistically adjust positions (1-based)
        const moved = section.content_items[index + 1];
        const swapped = section.content_items[index];
        if (typeof moved.position === 'number') moved.position = index + 2; // new pos
        if (typeof swapped.position === 'number') swapped.position = index + 1; // shifted up

        this.contentReorderLoading.add(String(moved.id));
        this.contentReorderLoading.add(String(swapped.id));
        this.cdr.markForCheck();

        section.updatedAt = new Date().toISOString();
        this.saveSections();
        this.cdr.detectChanges();

        const numericSectionId = Number(sectionId);
        const numericContentId = Number(moved.id);
        const targetPosition = index + 2; // 1-based
        if (Number.isFinite(numericSectionId) && Number.isFinite(numericContentId)) {
          this.ai.updateSectionContent(numericSectionId, numericContentId, { type: moved.type || 'text', title: moved.title || '', position: targetPosition })
            .subscribe({
              next: (resp) => {
                const rec = resp?.content;
                if (rec) {
                  const updatedIdx = section.content_items.findIndex(ci => ci.id === String(rec.id));
                  if (updatedIdx >= 0) {
                    section.content_items[updatedIdx].position = rec.position;
                  }
                }
                section.content_items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                this.contentReorderLoading.delete(String(moved.id));
                this.contentReorderLoading.delete(String(swapped.id));
                this.saveSections();
                this.cdr.detectChanges();
              },
              error: (_) => {
                section.content_items = before;
                this.contentReorderLoading.delete(String(moved.id));
                this.contentReorderLoading.delete(String(swapped.id));
                this.saveSections();
                this.cdr.detectChanges();
                const msg = this.currentLang === 'ar' ? 'تعذر تحديث ترتيب المحتوى.' : 'Failed to update content order.';
                this.toastr.error(msg);
              }
            });
        }
        return;
      }
    }
    
    // Legacy: move in contentItems
    if (index === this.contentItems.length - 1) return;
    const items = [...this.contentItems];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    this.contentItems = items;
    this.saveContentItemsOrder();
    this.cdr.detectChanges();
  }

  private normalizeSectionContentPositions(section: Section): void {
    if (!section || !Array.isArray(section.content_items)) {
      return;
    }
    section.content_items.forEach((item, idx) => {
      item.position = idx + 1;
    });
  }
  
  // Save content items order to localStorage
  private saveContentItemsOrder(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    this.ai.saveDraft({
      ...draft,
      content_items: this.contentItems
    }, userId);
  }
  
  // Always retrieve content items from localStorage
  private restoreContentItemsFromStorage(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    
    if (draft?.content_items && Array.isArray(draft.content_items) && draft.content_items.length > 0) {
      this.contentItems = [...draft.content_items]; // Create a new array to avoid reference issues
      console.log('Restored content items from localStorage:', this.contentItems.length, 'items');
    } else {
      // Only reset if empty or not set
      if (!this.contentItems || this.contentItems.length === 0) {
        this.contentItems = [];
      }
    }
  }
  
  // Track by function for content items
  trackByContentId(index: number, item: ContentItem): string {
    return item.id;
  }

  isReordering(contentId: string): boolean {
    return this.contentReorderLoading.has(String(contentId));
  }

  isReorderingSection(sectionId: string): boolean {
    return this.sectionReorderLoading.has(String(sectionId));
  }
  
  // Track by function for sections
  trackBySectionId(index: number, section: Section): string {
    return section.id;
  }
  
  // ============ SECTION MANAGEMENT METHODS ============
  
  // Initialize or migrate sections from existing data
  private initializeSections(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    
    // If sections already exist in draft, restore them
    if (draft.sections && draft.sections.length > 0) {
      this.sections = draft.sections.map(s => {
        const section = s as Section & { available?: boolean };
        return {
          ...s,
          isCollapsed: this.getSectionCollapseState(s.id) ?? s.isCollapsed ?? false,
          available: section.available !== false // Default to true if not set
        };
      });
      this.sortSectionsByStoredOrder();
      this.normalizeSectionOrdering();
      return;
    }
    
    // Don't create default section - user will add sections manually or via file upload
    this.sections = [];
  }
  
  // Open Add Section Modal
  openAddSectionModal(): void {
    // Check if there's an unnamed section
    if (this.sections.some(section => !section.name || section.name.trim() === '')) {
      this.cdr.detectChanges();
      this.toastr?.warning?.(
        this.currentLang === 'ar'
          ? 'يرجى تسمية القسم الحالي قبل إنشاء قسم جديد.'
          : 'Please name the current section before creating a new one.'
      );
      return;
    }
    this.showAddSectionModal = true;
    this.sectionCreationMode = null; // Reset mode selection
    this.sectionFileUploadError = null;
    this.sectionFileSelected = false; // Reset file selection
    this.aiInstructionText = ''; // Reset AI instruction text
    this.manualSectionName = '';
    this.manualSectionDescription = '';
    this.aiSuggestedSectionName = null;
  }
  
  // Show file upload section
  showFileUploadSection(): void {
    this.sectionCreationMode = 'upload';
    this.aiInstructionText = ''; // Clear AI instruction when switching
    this.aiGenerationStep = null; // Clear AI generation step
    // Reset preferences
    this.aiPreferences = {
      contentSource: []
    };
    this.uploadStep = 1; // Go directly to file upload step
    this.cdr.detectChanges();
  }
  
  // Show AI instruction section
  showAIInstructionSection(): void {
    this.sectionCreationMode = 'ai';
    this.aiInstructionText = '';
    this.sectionFileSelected = false; // Clear file selection when switching
    this.clearSelectedSectionFile();
    
    // Reset preferences
    this.aiPreferences = {
      contentSource: []
    };
    // Go directly to instruction step (skip preferences)
    this.aiGenerationStep = 1;
    this.cdr.detectChanges();
  }

  resetAIWizardState(): void {
    // Reset preferences
    this.aiPreferences = {
      contentSource: []
    };
    this.uploadStep = null;
    this.aiContentTypes = {
      text: true,
      quiz: false,
      youtube: false,
      summary: false,
      homework: false
    };
    this.aiYoutubeOptions = {
      maxVideos: 1,
      length: 'short',
      mode: 'attach-only'
    };
    this.showAdvancedOptions = false;
    this.aiAdvancedOptions = {
      targetLength: '10-15',
      difficulty: 'medium',
      language: 'bilingual',
      tone: 'friendly'
    };
    this.aiPlanPreview = [];
  }
  
  // Proceed from preferences step to instruction step
  // Load countries from backend
  private loadCountries(): void {
    if (this.countries.length > 0) {
      return; // Already loaded
    }
    this.loadingCountries = true;
    this.geographyService.getCountries().subscribe({
      next: (response) => {
        // Sort countries: Arab countries first, then others
        // Arab country ISO codes (2-letter codes)
        const arabCountryCodes = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'IQ', 'SY', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD', 'PS'];
        const countries = response.countries;
        
        // Separate Arab and other countries
        const arabCountries: Country[] = [];
        const otherCountries: Country[] = [];
        
        countries.forEach(country => {
          const isoCode = country.iso_code?.toUpperCase() || '';
          // Check if ISO code matches any Arab country (first 2 characters)
          const isArab = arabCountryCodes.some(code => isoCode.startsWith(code));
          
          if (isArab) {
            arabCountries.push(country);
          } else {
            otherCountries.push(country);
          }
        });
        
        // Sort Arab countries alphabetically, then other countries
        arabCountries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        otherCountries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        this.countries = [...arabCountries, ...otherCountries];
        this.loadingCountries = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading countries:', error);
        this.loadingCountries = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  // Toggle content source selection
  toggleContentSource(source: 'youtube' | 'text' | 'text-to-audio'): void {
    const index = this.aiPreferences.contentSource.indexOf(source);
    if (index > -1) {
      this.aiPreferences.contentSource.splice(index, 1);
    } else {
      this.aiPreferences.contentSource.push(source);
    }
  }
  
  // Toggle course educational stage selection
  toggleCourseEducationalStage(stage: string): void {
    const index = this.coursePreferences.educationalStage.indexOf(stage);
    if (index > -1) {
      this.coursePreferences.educationalStage.splice(index, 1);
    } else {
      this.coursePreferences.educationalStage.push(stage);
    }
    this.cdr.detectChanges();
  }
  
  // Get country name by ID
  getCountryName(countryId: number): string {
    const country = this.countries.find(c => c.id === countryId);
    return country?.name || '';
  }

  proceedToAIStep2(): void {
    if (!this.aiInstructionText || this.aiInstructionText.trim().length < 20) {
      this.toastr?.warning?.(
        this.currentLang === 'ar'
          ? 'يرجى كتابة تعليمات واضحة (20 حرف على الأقل)'
          : 'Please write clear instructions (at least 20 characters)'
      );
      return;
    }
    this.aiGenerationStep = 2;
  }

  proceedToAIStep3(): void {
    if (!this.hasAnyContentTypeSelected()) {
      this.toastr?.warning?.(
        this.currentLang === 'ar'
          ? 'يرجى اختيار نوع محتوى واحد على الأقل'
          : 'Please select at least one content type'
      );
      return;
    }
    // Generate preview plan based on selected options
    this.generateAIPlanPreview();
    this.aiGenerationStep = 3;
  }

  hasAnyContentTypeSelected(): boolean {
    return this.aiContentTypes.text || 
           this.aiContentTypes.quiz || 
           this.aiContentTypes.youtube || 
           this.aiContentTypes.summary || 
           this.aiContentTypes.homework;
  }

  onYouTubeToggle(): void {
    if (!this.aiContentTypes.youtube) {
      // Reset YouTube options when unchecked
      this.aiYoutubeOptions = {
        maxVideos: 1,
        length: 'short',
        mode: 'attach-only'
      };
    }
  }

  applyPreset(preset: 'quick-explainer' | 'video-first' | 'full-section'): void {
    // Reset all first
    this.aiContentTypes = {
      text: false,
      quiz: false,
      youtube: false,
      summary: false,
      homework: false
    };

    switch (preset) {
      case 'quick-explainer':
        this.aiContentTypes.text = true;
        this.aiContentTypes.quiz = true;
        break;
      case 'video-first':
        this.aiContentTypes.youtube = true;
        this.aiContentTypes.text = true;
        this.aiYoutubeOptions.maxVideos = 2;
        this.aiYoutubeOptions.mode = 'attach-with-summary';
        break;
      case 'full-section':
        this.aiContentTypes.text = true;
        this.aiContentTypes.youtube = true;
        this.aiContentTypes.quiz = true;
        this.aiYoutubeOptions.maxVideos = 1;
        break;
    }
  }

  generateAIPlanPreview(): void {
    this.aiPlanPreview = [];
    let itemIndex = 1;

    // Text lessons
    if (this.aiContentTypes.text) {
      const textCount = this.aiAdvancedOptions.targetLength === '20-30' ? 3 : 2;
      for (let i = 0; i < textCount; i++) {
        this.aiPlanPreview.push({
          type: 'text',
          title: this.currentLang === 'ar' 
            ? `درس ${itemIndex}: شرح ${itemIndex}` 
            : `Lesson ${itemIndex}: Explanation ${itemIndex}`,
          editable: true
        });
        itemIndex++;
      }
    }

    // YouTube videos
    if (this.aiContentTypes.youtube) {
      for (let i = 0; i < this.aiYoutubeOptions.maxVideos; i++) {
        this.aiPlanPreview.push({
          type: 'video',
          title: this.currentLang === 'ar'
            ? `فيديو ${i + 1}: مثال من الحياة الواقعية`
            : `Video ${i + 1}: Real Life Examples`,
          duration: this.aiYoutubeOptions.length === 'short' ? '≤5 min' : '≤10 min',
          editable: true
        });
        itemIndex++;
      }
    }

    // Quiz
    if (this.aiContentTypes.quiz) {
      this.aiPlanPreview.push({
        type: 'quiz',
        title: this.currentLang === 'ar' ? 'اختبار: 5 أسئلة متعددة الخيارات' : 'Quiz: 5 MCQ questions',
        editable: true
      });
      itemIndex++;
    }

    // Summary card
    if (this.aiContentTypes.summary) {
      this.aiPlanPreview.push({
        type: 'summary',
        title: this.currentLang === 'ar' ? 'بطاقة ملخص' : 'Summary card',
        editable: true
      });
      itemIndex++;
    }

    // Homework
    if (this.aiContentTypes.homework) {
      this.aiPlanPreview.push({
        type: 'homework',
        title: this.currentLang === 'ar' ? 'واجب منزلي / مهام تدريبية' : 'Homework / practice tasks',
        editable: true
      });
      itemIndex++;
    }
  }

  getContentTypeIcon(type: string): string {
    switch (type) {
      case 'text': return '📄';
      case 'video': return '🎥';
      case 'quiz': return '📝';
      case 'summary': return '📋';
      case 'homework': return '📚';
      default: return '📄';
    }
  }

  previewPlanItem(index: number): void {
    // TODO: Implement preview functionality
    this.toastr?.info?.(
      this.currentLang === 'ar'
        ? 'معاينة قريباً'
        : 'Preview coming soon'
    );
  }

  editPlanItemTitle(index: number): void {
    const item = this.aiPlanPreview[index];
    const newTitle = prompt(
      this.currentLang === 'ar' ? 'أدخل العنوان الجديد:' : 'Enter new title:',
      item.title
    );
    if (newTitle && newTitle.trim()) {
      item.title = newTitle.trim();
    }
  }

  removePlanItem(index: number): void {
    this.aiPlanPreview.splice(index, 1);
  }

  // Generate AI content from instructions
  async generateAIContent(): Promise<void> {
    if (!this.aiInstructionText || this.aiInstructionText.trim().length < 20) {
      this.toastr?.warning?.(
        this.currentLang === 'ar'
          ? 'يرجى كتابة تعليمات واضحة (20 حرف على الأقل)'
          : 'Please write clear instructions (at least 20 characters)'
      );
      return;
    }

    if (!this.draftCourseId) {
      this.toastr?.error?.(
        this.currentLang === 'ar'
          ? 'لم يتم العثور على معرف الدورة'
          : 'Course ID not found'
      );
      return;
    }

    // Start generation process
    this.aiGenerating = true;
    this.sectionFileUploading = true; // Reuse the upload progress UI
    this.sectionFileUploadError = null;
    this.sectionFileUploadProgress = 0;
    this.sectionFileUploadStep = this.currentLang === 'ar' 
      ? '🤖 جاري إنشاء المحتوى بالذكاء الاصطناعي...'
      : '🤖 Creating content with AI...';
    
    // Start progress simulation for AI generation
    this.startAIProgressSimulation();

    // Map preferences contentSource to content generation flags
    const hasText = this.aiPreferences.contentSource.includes('text');
    const hasYoutube = this.aiPreferences.contentSource.includes('youtube');
    const hasTextToAudio = this.aiPreferences.contentSource.includes('text-to-audio');
    
    // Build request data with all options
    const requestData: any = {
      courseId: this.draftCourseId,
      instructions: this.aiInstructionText.trim(),
      preferences: {
        contentSource: this.aiPreferences.contentSource,
        educationalStage: this.coursePreferences.educationalStage,
        country: this.coursePreferences.country.length > 0 ? this.coursePreferences.country : undefined
      },
      // Map preferences to content generation flags for backend
      generateText: hasText || this.aiContentTypes.text,
      generateYoutube: hasYoutube || this.aiContentTypes.youtube,
      generateAudio: hasTextToAudio,
      contentTypes: {
        text: this.aiContentTypes.text || hasText,
        quiz: this.aiContentTypes.quiz,
        youtube: this.aiContentTypes.youtube || hasYoutube,
        summary: this.aiContentTypes.summary,
        homework: this.aiContentTypes.homework
      },
      advancedOptions: {
        targetLength: this.aiAdvancedOptions.targetLength,
        difficulty: this.aiAdvancedOptions.difficulty,
        language: this.aiAdvancedOptions.language,
        tone: this.aiAdvancedOptions.tone
      }
    };

    // Add YouTube-specific options if YouTube is selected
    if (this.aiContentTypes.youtube) {
      requestData.youtubeOptions = {
        maxVideos: this.aiYoutubeOptions.maxVideos,
        length: this.aiYoutubeOptions.length,
        mode: this.aiYoutubeOptions.mode
      };
    }

    this.http.post<any>(`${this.baseUrl}/courses/draft/sections/ai-generate`, requestData).subscribe({
      next: (response) => {
        this.stopProgressSimulation();
        console.log('AI content generated successfully:', response);
        
        // Update total lessons if available in response
        if (response.section?.content_items?.length) {
          this.aiGenerationTotalLessons = response.section.content_items.length;
          this.aiGenerationCurrentLesson = this.aiGenerationTotalLessons;
          console.log(`AI generated ${this.aiGenerationTotalLessons} lesson(s) based on content complexity`);
        }
        
        // Show completion
        this.sectionFileUploadProgress = 100;
        this.sectionFileUploadStep = this.currentLang === 'ar' ? '✅ اكتمل!' : '✅ Complete!';
        
        if (response.success && response.section) {
          // Save preferences for future sections
          if (!this.savedCoursePreferences) {
            this.savedCoursePreferences = {
              contentSource: [...this.aiPreferences.contentSource]
            };
          }
          
          // Add the new section to the sections array
          const newSection: Section & { available: boolean } = {
            id: response.section.id,
            number: response.section.number || response.section.sort_order,
            sort_order: response.section.sort_order,
            name: response.section.name,
            content_items: response.section.content_items || [],
            available: response.section.available,
            isCollapsed: false,
            createdAt: response.section.createdAt,
            updatedAt: response.section.updatedAt
          };
          this.sections.push(newSection);
          
          // Normalize section ordering
          this.normalizeSectionOrdering();
          
          // Save sections to storage
          this.saveSections();
          
          // Set the new section as active
          this.setActiveSection(newSection.id);
          
          // Small delay to show completion, then close
          setTimeout(() => {
            this.aiGenerating = false;
            this.sectionFileUploading = false;
            this.sectionFileUploadProgress = 0;
            this.sectionFileUploadStep = '';
            this.aiGenerationStep = null;
            this.aiGenerationCurrentLesson = 0;
            this.aiGenerationTotalLessons = 0;
            
            // Show success message
            this.toastr?.success?.(
              response.message || (this.currentLang === 'ar'
                ? 'تم إنشاء القسم مع عناوين الدروس والتلميحات!'
                : 'Section created with lesson titles and hints!')
            );
            
            // Close the modal
            this.closeAddSectionModal();
            
            // Clear the instruction text
            this.aiInstructionText = '';
            this.cdr.detectChanges();
          }, 1000);
        } else {
          this.aiGenerating = false;
          this.sectionFileUploading = false;
          this.sectionFileUploadProgress = 0;
          this.sectionFileUploadStep = '';
          this.aiGenerationStep = null;
          this.aiGenerationCurrentLesson = 0;
          this.aiGenerationTotalLessons = 0;
          
          this.toastr?.error?.(
            this.currentLang === 'ar'
              ? 'فشل في إنشاء القسم. يرجى المحاولة مرة أخرى.'
              : 'Failed to create section. Please try again.'
          );
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.stopProgressSimulation();
        console.error('Error generating AI content:', error);
        
        this.sectionFileUploadError = error.error?.message || (this.currentLang === 'ar'
          ? 'حدث خطأ أثناء إنشاء المحتوى بالذكاء الاصطناعي'
          : 'An error occurred while generating AI content');
        
        this.aiGenerating = false;
        this.sectionFileUploading = false;
        this.sectionFileUploadProgress = 0;
        this.sectionFileUploadStep = '';
        this.aiGenerationStep = null;
        this.aiGenerationCurrentLesson = 0;
        this.aiGenerationTotalLessons = 0;
        this.cdr.detectChanges();
      }
    });
  }
  
  // Start AI progress simulation (similar to file upload but with AI-specific steps)
  startAIProgressSimulation(): void {
    // Reset step tracking
    this.aiGenerationStep = null;
    this.aiGenerationCurrentLesson = 0;
    this.aiGenerationTotalLessons = 0;
    
    // Start dhikr rotation for AI generation too
    this.startDhikrRotation();
    
    let currentProgress = 0;
    let stepACompleted = false;
    let stepBCompleted = false;
    let stepCStarted = false;

    this.sectionFileUploadInterval = setInterval(() => {
      // Step 1: Generate section title (0-30%)
      if (!stepACompleted && currentProgress < 30) {
        this.aiGenerationStep = 1;
        this.sectionFileUploadStep = this.currentLang === 'ar' 
          ? '🎯 إنشاء عنوان القسم...' 
          : '🎯 Creating section title...';
        currentProgress += 1.2;
      } else if (!stepACompleted && currentProgress >= 30) {
        stepACompleted = true;
        this.aiGenerationStep = null; // Hide Step 1
        currentProgress = 30;
      }
      // Step 2: Generate lesson titles (30-50%)
      else if (!stepBCompleted && currentProgress < 50) {
        this.aiGenerationStep = 2;
        this.sectionFileUploadStep = this.currentLang === 'ar' 
          ? '📝 إنشاء عناوين الدروس...' 
          : '📝 Creating lesson titles...';
        currentProgress += 1.0;
      } else if (!stepBCompleted && currentProgress >= 50) {
        stepBCompleted = true;
        this.aiGenerationStep = null; // Hide Step 2
        // Estimate total lessons (will be updated from actual response)
        // Use a reasonable estimate based on typical generation
        this.aiGenerationTotalLessons = Math.floor(3 + Math.random() * 4); // Random 3-6 for better UX
        currentProgress = 50;
      }
      // Step 3 removed - only generating titles and hints, not full content
      // After Step 2, we jump to saving (50-95%)
      else if (!stepCStarted) {
        stepCStarted = true;
        this.aiGenerationStep = null; // Hide steps during saving
        this.sectionFileUploadStep = this.currentLang === 'ar' 
          ? `💾 حفظ القسم والدروس...` 
          : `💾 Saving section and lessons...`;
        currentProgress = 70;
      } else if (stepCStarted && currentProgress < 95) {
        // Simulate saving progress
        this.sectionFileUploadStep = this.currentLang === 'ar' 
          ? `💾 حفظ القسم مع ${this.aiGenerationTotalLessons} دروس...` 
          : `💾 Saving section with ${this.aiGenerationTotalLessons} lessons...`;
        currentProgress += 1.5;
      }
      
      // Cap at 95% until actual completion
      if (currentProgress > 95) {
        currentProgress = 95;
      }
      
      this.sectionFileUploadProgress = Math.round(currentProgress);
      this.cdr.detectChanges();
    }, 300); // Update every 300ms
  }
  
  // Clear selected file
  clearSelectedSectionFile(): void {
    this.sectionFileSelected = false;
    this.sectionFileUploadError = null;
    this.usePageRange = false;
    this.pageRangeStart = null;
    this.pageRangeEnd = null;
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]#sectionFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }
  
  // Upload the selected file
  uploadSelectedSectionFile(): void {
    const fileInput = document.querySelector('input[type="file"]#sectionFileInput') as HTMLInputElement;
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      return;
    }
    this.uploadSectionFile(fileInput.files[0]);
  }

  // Close Add Section Modal
  closeAddSectionModal(): void {
    if (!this.sectionFileUploading && !this.aiGenerating) {
      this.showAddSectionModal = false;
      this.sectionCreationMode = null;
      this.aiGenerationStep = null;
      this.aiInstructionText = '';
      this.resetAIWizardState();
      this.sectionFileSelected = false;
      this.sectionFileUploadError = null;
      this.usePageRange = false;
      this.pageRangeStart = null;
      this.pageRangeEnd = null;
      this.stopProgressSimulation();
      this.sectionFileUploadProgress = 0;
      this.sectionFileUploadStep = '';
      this.manualSectionName = '';
      this.manualSectionDescription = '';
      this.aiSuggestedSectionName = null;
    }
  }

  // Show Manual Section Creation Form
  showManualSectionForm(): void {
    this.sectionCreationMode = 'manual';
    this.manualSectionName = '';
    this.manualSectionDescription = '';
    this.aiSuggestedSectionName = null;
    this.suggestingSectionName = false;
    // Auto-suggest section name
    this.suggestSectionName();
    this.cdr.detectChanges();
  }

  // Suggest section name using AI
  suggestSectionName(): void {
    if (!this.selectedCategory || !this.courseName) return;
    
    this.suggestingSectionName = true;
    const categoryId = this.selectedCategory.id;
    // stage_id expects a number, but educationalStage is string[], so we pass undefined
    // TODO: Add mapping from educational stage strings to numeric IDs if needed
    const stageId: number | undefined = undefined;
    const countryId = this.coursePreferences.country.length > 0 
      ? this.coursePreferences.country[0] 
      : undefined;
    const locale = this.currentLang;
    
    // Use getUnits to get section name suggestions
    this.ai.getUnits({
      category_id: categoryId,
      course_name: this.courseName,
      stage_id: stageId,
      country_id: countryId,
      locale: locale
    }).subscribe({
      next: (response) => {
        this.suggestingSectionName = false;
        if (response.units && response.units.length > 0) {
          // Use the first unit name as suggestion, or find one that matches section number
          const sectionNumber = this.sections.length + 1;
          const matchingUnit = response.units.find(u => u.order === sectionNumber);
          this.aiSuggestedSectionName = matchingUnit?.name || response.units[0]?.name || null;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error suggesting section name:', error);
        this.suggestingSectionName = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Create section with name and description
  createManualSection(): void {
    const trimmedName = this.manualSectionName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      this.toastr?.warning?.(
        this.currentLang === 'ar'
          ? 'يرجى إدخال اسم القسم (حرفين على الأقل)'
          : 'Please enter a section name (at least 2 characters)'
      );
      return;
    }

    const trimmedDescription = this.manualSectionDescription.trim();
    const newSectionNumber = this.sections.length + 1;
    const newSection: Section & { available: boolean } = {
      id: `section-${Date.now()}`,
      number: newSectionNumber,
      sort_order: newSectionNumber,
      name: trimmedName,
      description: trimmedDescription || null,
      content_items: [],
      isCollapsed: false,
      available: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sections.push(newSection);
    this.setActiveSection(newSection.id);
    this.normalizeSectionOrdering();
    
    // Save section to backend
    this.saveSections();
    
    // Generate titles/hints for this section
    this.generateSectionTitles(newSection);
    
    // Reset form and close modal
    this.manualSectionName = '';
    this.manualSectionDescription = '';
    this.aiSuggestedSectionName = null;
    this.sectionCreationMode = null;
    this.closeAddSectionModal();
    this.cdr.detectChanges();
  }

  // Generate AI titles/hints for a section
  generateSectionTitles(section: Section): void {
    if (!this.selectedCategory || !section.name) return;
    
    this.generatingSectionTitles = true;
    const categoryId = this.selectedCategory.id;
    // stage_id expects a number, but educationalStage is string[], so we pass undefined
    // TODO: Add mapping from educational stage strings to numeric IDs if needed
    const stageId: number | undefined = undefined;
    const countryId = this.coursePreferences.country.length > 0 
      ? this.coursePreferences.country[0] 
      : undefined;
    const locale = this.currentLang;
    
    this.ai.getTitles({
      category_id: categoryId,
      stage_id: stageId,
      country_id: countryId,
      locale: locale,
      category_name: this.selectedCategory ? (this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en) : undefined,
      term: undefined,
      mode: 'general'
    }).subscribe({
      next: (response) => {
        this.generatingSectionTitles = false;
        if (response.titles && response.titles.length > 0) {
          // Convert titles to SectionTitleSuggestion format
          section.suggestedTitles = response.titles.map((title, index) => ({
            title: title.title,
            hint: title.rationale || title.topics?.join(', ') || '',
            position: index + 1
          }));
          this.saveSections(); // Save to localStorage
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error generating section titles:', error);
        this.generatingSectionTitles = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Use AI suggested name
  useSuggestedName(): void {
    if (this.aiSuggestedSectionName) {
      this.manualSectionName = this.aiSuggestedSectionName;
      this.cdr.detectChanges();
    }
  }

  // Open content block selection modal for a suggested title
  openContentBlockModal(sectionId: string, titleSuggestion: SectionTitleSuggestion): void {
    // Instead of asking for type, immediately create a draft item
    this.createDraftContent(sectionId, titleSuggestion);
  }

  // Create a draft content item from suggestion
  createDraftContent(sectionId: string, titleSuggestion: SectionTitleSuggestion): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newItem: ContentItem = {
      id: this.generateDraftContentId(),
      type: 'text', // Default to text, but empty content marks it as draft
      title: titleSuggestion.title,
      content: '', // Empty content
      section_id: sectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: section.content_items.length + 1,
      status: true,
      meta: {
        hint: titleSuggestion.hint // Store hint in meta
      }
    };

    section.content_items.push(newItem);
    this.saveSections();
    this.cdr.detectChanges();
    
    this.toastr?.success?.(
      this.currentLang === 'ar' 
        ? 'تم إنشاء المحتوى. انقر عليه لتحديد نوعه.' 
        : 'Content created. Click on it to select its type.'
    );
  }

  // Open Content Type Selection Modal
  openContentTypeSelectionModal(item: ContentItem): void {
    this.selectedDraftItem = item;
    this.showContentTypeSelectionModal = true;
    this.cdr.detectChanges();
  }

  closeContentTypeSelectionModal(): void {
    this.showContentTypeSelectionModal = false;
    this.selectedDraftItem = null;
    this.cdr.detectChanges();
  }

  // Select content type for a draft item
  selectContentType(type: 'text' | 'audio' | 'video' | 'resources'): void {
    if (!this.selectedDraftItem) return;

    const item = this.selectedDraftItem;
    this.closeContentTypeSelectionModal();

    // Update item type
    item.type = type;
    
    // Open specific editor/modal
    if (type === 'text') {
      // Initialize content if empty so it's not treated as draft
      if (!item.content || item.content.trim() === '') {
        item.content = '<p></p>';
      }
      this.viewContentItem(item); // Will open text editor since type is text
    } else if (type === 'audio') {
      this.audioForm.title = item.title;
      this.audioForm.description = (item.meta as any)?.hint || '';
      this.openAudioModal('audio');
      // Link the modal to this item
      this.currentEditingContentId = item.id;
    } else if (type === 'video') {
      this.videoForm.title = item.title;
      this.openVideoModal();
      // Link the modal to this item
      this.currentEditingContentId = item.id;
    } else if (type === 'resources') {
      this.resourceForm.title = item.title;
      this.resourceForm.description = (item.meta as any)?.hint || '';
      this.openResourceModal();
      // Link the modal to this item
      this.currentEditingContentId = item.id;
    }
    
    this.saveSections();
    this.cdr.detectChanges();
  }

  // Close content block selection modal
  closeContentBlockModal(): void {
    this.showContentBlockModal = false;
    this.selectedSectionIdForBlock = null;
    this.selectedTitleSuggestion = null;
    this.contentBlockType = null;
    this.cdr.detectChanges();
  }

  // Select content block type and proceed
  selectContentBlockType(type: 'text' | 'audio' | 'video' | 'attachment'): void {
    if (!this.selectedSectionIdForBlock || !this.selectedTitleSuggestion) return;
    
    this.contentBlockType = type;
    this.closeContentBlockModal();
    
    // Set active section
    this.setActiveSection(this.selectedSectionIdForBlock);
    
    // Open the appropriate content creation modal/editor
    if (type === 'text') {
      // Pre-fill title from suggestion
      this.subsectionTitle = this.selectedTitleSuggestion.title;
      this.textContent = '';
      this.viewingContentItem = null;
      this.currentEditor = null;
      this.textSaveError = null;
      // Close AI hint modal if it's open
      this.showAIHintModal = false;
      this.aiHint = '';
      this.pendingAiAction = null;
      this.showTextEditor = true;
      this.selectedContentType = 'text';
      this.pendingImageUploads.clear();
      this.currentEditingContentId = this.generateDraftContentId();
      this.editorActiveImageKeys.clear();
      this.editorKnownImageMap.clear();
      this.editorDeletedImageKeys.clear();
    } else if (type === 'audio') {
      // Pre-fill title from suggestion
      this.audioForm.title = this.selectedTitleSuggestion.title;
      this.audioForm.description = this.selectedTitleSuggestion.hint || '';
      this.openAudioModal('audio');
    } else if (type === 'video') {
      // Pre-fill title from suggestion
      this.videoForm.title = this.selectedTitleSuggestion.title;
      this.openVideoModal();
    } else if (type === 'attachment') {
      // Pre-fill title from suggestion
      this.resourceForm.title = this.selectedTitleSuggestion.title;
      this.resourceForm.description = this.selectedTitleSuggestion.hint;
      this.openResourceModal();
    }
    
    this.cdr.detectChanges();
  }

  // Handle Section File Selection
  onSectionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.sectionFileSelected = false;
      this.usePageRange = false;
      this.pageRangeStart = null;
      this.pageRangeEnd = null;
      return;
    }

    // Mark file as selected
    this.sectionFileSelected = true;
    // Reset page range when new file is selected
    this.usePageRange = false;
    this.pageRangeStart = null;
    this.pageRangeEnd = null;

    // Validate file type
    const validTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    const validExtensions = ['.doc', '.docx', '.pdf', '.ppt', '.pptx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      this.sectionFileUploadError = this.currentLang === 'ar'
        ? 'نوع الملف غير مدعوم. يرجى رفع ملف Word (.doc, .docx)، PDF (.pdf)، أو PowerPoint (.ppt, .pptx)'
        : 'Unsupported file type. Please upload a Word (.doc, .docx), PDF (.pdf), or PowerPoint (.ppt, .pptx) file';
      input.value = '';
      this.sectionFileSelected = false;
      this.cdr.detectChanges();
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.sectionFileUploadError = this.currentLang === 'ar'
        ? 'حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت'
        : 'File size is too large. Maximum size is 50MB';
      input.value = '';
      this.sectionFileSelected = false;
      this.cdr.detectChanges();
      return;
    }

    this.sectionFileUploadError = null;
    // Don't auto-upload, wait for user to confirm language option
    this.cdr.detectChanges();
  }

  // Upload Section File and Generate Content
  uploadSectionFile(file: File): void {
    // Close add section modal and open progress modal
    this.showAddSectionModal = false;
    this.sectionFileUploading = true;
    this.sectionFileUploadError = null;
    this.sectionFileUploadProgress = 0;
    this.sectionFileUploadStep = this.currentLang === 'ar' ? 'جاري رفع الملف...' : 'Uploading file...';

    const formData = new FormData();
    formData.append('file', file);
    
    // Map preferences to backend format
    // Content source preferences
    const hasText = this.aiPreferences.contentSource.includes('text');
    const hasYoutube = this.aiPreferences.contentSource.includes('youtube');
    const hasTextToAudio = this.aiPreferences.contentSource.includes('text-to-audio');
    
    formData.append('generateText', hasText ? 'true' : 'false');
    formData.append('generateYoutube', hasYoutube ? 'true' : 'false');
    formData.append('generateAudio', hasTextToAudio ? 'true' : 'false');
    
    // Add page range if specified
    if (this.usePageRange && this.pageRangeStart && this.pageRangeEnd) {
      const pageRange = {
        start: Math.max(1, Math.floor(this.pageRangeStart)),
        end: Math.max(1, Math.floor(this.pageRangeEnd))
      };
      // Ensure start <= end
      if (pageRange.start > pageRange.end) {
        [pageRange.start, pageRange.end] = [pageRange.end, pageRange.start];
      }
      formData.append('pageRange', JSON.stringify(pageRange));
    }
    
    // Add preferences to form data for AI context
    if (this.aiPreferences.contentSource.length > 0) {
      formData.append('preferences[contentSource]', JSON.stringify(this.aiPreferences.contentSource));
    }
    if (this.coursePreferences.educationalStage.length > 0) {
      formData.append('preferences[educationalStage]', JSON.stringify(this.coursePreferences.educationalStage));
    }
    if (this.coursePreferences.country.length > 0) {
      formData.append('preferences[country]', JSON.stringify(this.coursePreferences.country));
    }

    // Get draft course ID
    if (!this.draftCourseId) {
      this.sectionFileUploadError = this.currentLang === 'ar'
        ? 'خطأ: لم يتم العثور على مسودة الدورة'
        : 'Error: Draft course not found';
      this.sectionFileUploading = false;
      this.sectionFileUploadProgress = 0;
      this.sectionFileUploadStep = '';
      this.stopProgressSimulation();
      this.cdr.detectChanges();
      return;
    }

    // Start progress simulation
    this.startProgressSimulation();

    this.http.post<{ success: boolean; section: Section; message?: string }>(
      `${this.baseUrl}/courses/draft/sections/upload-and-generate`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${this.universalAuth.getAccessToken()}`
        }
      }
    ).subscribe({
      next: (response) => {
        this.stopProgressSimulation();
        this.sectionFileUploadProgress = 100;
        this.sectionFileUploadStep = this.currentLang === 'ar' ? 'اكتمل!' : 'Complete!';
        
        if (response.success && response.section) {
          // Save preferences for future sections
          if (!this.savedCoursePreferences) {
            this.savedCoursePreferences = {
              contentSource: [...this.aiPreferences.contentSource]
            };
          }
          
          // Add the new section
          const newSection: Section & { available: boolean } = {
            ...response.section,
            available: true,
            isCollapsed: false
          };
          this.sections.push(newSection);
          this.setActiveSection(newSection.id);
          this.normalizeSectionOrdering();
          this.saveSections();
          
          // Section content will be loaded automatically when setActiveSection is called
          // The backend returns the section with content_items already populated
          
          // Small delay to show completion, then close progress modal
          setTimeout(() => {
            this.sectionFileUploading = false;
            this.sectionFileUploadProgress = 0;
            this.sectionFileUploadStep = '';
            this.clearSelectedSectionFile(); // Reset file selection
            this.toastr?.success?.(
              this.currentLang === 'ar'
                ? 'تم إنشاء القسم مع دروس كاملة وغنية بالمحتوى! 🎉'
                : 'Section created with complete and rich lesson content! 🎉'
            );
          this.cdr.detectChanges();
        }, 1000);
      } else {
          this.sectionFileUploadError = response.message || (this.currentLang === 'ar'
            ? 'فشل في إنشاء القسم'
            : 'Failed to create section');
          this.sectionFileUploading = false;
          this.sectionFileUploadProgress = 0;
          this.sectionFileUploadStep = '';
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.stopProgressSimulation();
        console.error('Error uploading section file:', error);
        this.sectionFileUploadError = error.error?.message || (this.currentLang === 'ar'
          ? 'حدث خطأ أثناء معالجة الملف'
          : 'An error occurred while processing the file');
        this.sectionFileUploadErrorIsFileSize = false; // Default to false

        // Check if error is file-size related
        if (error.status === 400 && error.error?.message) {
          const errorMessage = error.error.message.toLowerCase();
          const tooLong = errorMessage.includes('2000') || 
                         errorMessage.includes('2,000') || 
                         errorMessage.includes('words') && (errorMessage.includes('exceed') || errorMessage.includes('too large') || errorMessage.includes('split'));
          if (tooLong) {
            this.sectionFileUploadError = this.currentLang === 'ar'
              ? 'الملف يتجاوز 2000 كلمة. يرجى تقسيمه بحيث يحتوي كل ملف على قسم واحد لا يزيد عن 2000 كلمة.'
              : 'File exceeds 2,000 words. Please split it so each file contains one section and stays under 2,000 words.';
            this.sectionFileUploadErrorIsFileSize = true;
          }
        } else if (error.error?.message) {
          // Check if backend error message mentions file size
          const errorMessage = error.error.message.toLowerCase();
          if (errorMessage.includes('split') && (errorMessage.includes('file') || errorMessage.includes('words') || errorMessage.includes('2000'))) {
            this.sectionFileUploadErrorIsFileSize = true;
          }
        }

        this.sectionFileUploading = false;
        this.sectionFileUploadProgress = 0;
        this.sectionFileUploadStep = '';
        this.cdr.detectChanges();
      }
    });
  }

  // Dhikr/Istighfar phrases for display during loading
  private getDhikrPhrases() {
    if (this.currentLang === 'ar') {
      return [
        { text: 'سُبْحَانَ اللَّهِ', translation: '' },
        { text: 'الْحَمْدُ لِلَّهِ', translation: '' },
        { text: 'لَا إِلَٰهَ إِلَّا اللَّهُ', translation: '' },
        { text: 'اللَّهُ أَكْبَرُ', translation: '' },
        { text: 'أَسْتَغْفِرُ اللَّهَ', translation: '' },
        { text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translation: '' },
        { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', translation: '' },
        { text: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', translation: '' }
      ];
    } else {
      return [
        { text: 'Subhan Allah', translation: 'Glory be to Allah' },
        { text: 'Alhamdulillah', translation: 'All praise is due to Allah' },
        { text: 'La ilaha illa Allah', translation: 'There is no god but Allah' },
        { text: 'Allahu Akbar', translation: 'Allah is the Greatest' },
        { text: 'Astaghfirullah', translation: 'I seek forgiveness from Allah' },
        { text: 'La hawla wa la quwwata illa billah', translation: 'There is no power nor strength except with Allah' },
        { text: 'Subhan Allah wa bihamdihi', translation: 'Glory be to Allah and praise Him' },
        { text: 'Subhan Allah al-Azeem', translation: 'Glory be to Allah, the Magnificent' }
      ];
    }
  }

  // Start dhikr rotation
  private startDhikrRotation(): void {
    this.stopDhikrRotation(); // Clear any existing interval
    
    const dhikrPhrases = this.getDhikrPhrases();
    this.dhikrIndex = 0;
    
    // Set initial dhikr
    this.updateCurrentDhikr(dhikrPhrases[this.dhikrIndex]);
    
    // Rotate every 3 seconds
    this.dhikrInterval = setInterval(() => {
      this.dhikrIndex = (this.dhikrIndex + 1) % dhikrPhrases.length;
      this.updateCurrentDhikr(dhikrPhrases[this.dhikrIndex]);
    }, 3000);
  }
  
  // Update current dhikr display
  private updateCurrentDhikr(dhikr: { text: string; translation: string }): void {
    this.currentDhikr = dhikr.text;
    this.currentDhikrTranslation = dhikr.translation;
    this.cdr.detectChanges();
  }
  
  // Stop dhikr rotation
  private stopDhikrRotation(): void {
    if (this.dhikrInterval) {
      clearInterval(this.dhikrInterval);
      this.dhikrInterval = null;
    }
    this.currentDhikr = '';
    this.currentDhikrTranslation = '';
    this.dhikrIndex = 0;
    this.cdr.detectChanges();
  }

  // Start dhikr rotation for text editor AI generation
  private startTextEditorDhikrRotation(): void {
    this.stopTextEditorDhikrRotation(); // Clear any existing interval
    
    const dhikrPhrases = this.currentLang === 'ar' 
      ? ['أستغفر الله العظيم', 'سبحان الله', 'الحمد لله', 'لا إله إلا الله', 'الله أكبر']
      : ['Astaghfirullah', 'SubhanAllah', 'Alhamdulillah', 'La ilaha illallah', 'Allahu Akbar'];
    
    let index = 0;
    this.currentDhikr = dhikrPhrases[0];
    
    // Rotate every 2 seconds with fade effect
    this.textEditorDhikrInterval = setInterval(() => {
      index = (index + 1) % dhikrPhrases.length;
      this.currentDhikr = dhikrPhrases[index];
      this.cdr.detectChanges();
    }, 2000);
  }

  // Stop text editor dhikr rotation
  private stopTextEditorDhikrRotation(): void {
    if (this.textEditorDhikrInterval) {
      clearInterval(this.textEditorDhikrInterval);
      this.textEditorDhikrInterval = null;
    }
    this.currentDhikr = '';
    this.cdr.detectChanges();
  }

  // Simulate progress with steps
  startProgressSimulation(): void {
    const steps = [
      { progress: 10, step: this.currentLang === 'ar' ? '📤 جاري رفع الملف...' : '📤 Uploading file...' },
      { progress: 20, step: this.currentLang === 'ar' ? '📄 استخراج النص من الملف...' : '📄 Extracting text from file...' },
      { progress: 35, step: this.currentLang === 'ar' ? '🔍 تحليل المحتوى وتحديد اللغة...' : '🔍 Analyzing content & detecting language...' },
      { progress: 50, step: this.currentLang === 'ar' ? '🎯 الخطوة 1: إنشاء عنوان القسم...' : '🎯 Step 1: Creating section title...' },
      { progress: 65, step: this.currentLang === 'ar' ? '📝 الخطوة 2: إنشاء عناوين الدروس...' : '📝 Step 2: Creating lesson titles...' },
      { progress: 80, step: this.currentLang === 'ar' ? '📚 الخطوة 3: كتابة محتوى كامل لكل درس...' : '📚 Step 3: Writing full content for each lesson...' },
      { progress: 90, step: this.currentLang === 'ar' ? '✨ إضافة التنسيق والأمثلة...' : '✨ Adding formatting and examples...' },
      { progress: 95, step: this.currentLang === 'ar' ? '💾 حفظ القسم والدروس في قاعدة البيانات...' : '💾 Saving section and lessons to database...' }
    ];
    
    // Start dhikr rotation when progress starts
    this.startDhikrRotation();

    let currentStepIndex = 0;
    let currentProgress = 0;

    this.sectionFileUploadInterval = setInterval(() => {
      // Move to next step if progress threshold reached
      if (currentStepIndex < steps.length - 1 && currentProgress >= steps[currentStepIndex].progress) {
        currentStepIndex++;
        this.sectionFileUploadStep = steps[currentStepIndex].step;
      }

      // Increment progress (slower as we approach 95%)
      if (currentProgress < 95) {
        if (currentProgress < 20) {
          currentProgress += 2; // Fast initial progress
        } else if (currentProgress < 50) {
          currentProgress += 1.5;
        } else if (currentProgress < 70) {
          currentProgress += 1;
        } else if (currentProgress < 90) {
          currentProgress += 0.8;
        } else {
          currentProgress += 0.3; // Slow down near completion
        }
        
        // Cap at 95% until actual completion
        if (currentProgress > 95) {
          currentProgress = 95;
        }
        
        this.sectionFileUploadProgress = Math.round(currentProgress);
        this.cdr.detectChanges();
      }
    }, 300); // Update every 300ms
  }

  stopProgressSimulation(): void {
    if (this.sectionFileUploadInterval) {
      clearInterval(this.sectionFileUploadInterval);
      this.sectionFileUploadInterval = null;
    }
    // Also stop dhikr rotation when progress stops
    this.stopDhikrRotation();
  }

  clearSectionFileError(): void {
    this.sectionFileUploadError = null;
    this.sectionFileUploadErrorIsFileSize = false;
    this.sectionFileUploading = false;
    this.sectionFileUploadProgress = 0;
    this.sectionFileUploadStep = '';
    this.clearSelectedSectionFile();
    this.cdr.detectChanges();
  }

  hasUnnamedSection(): boolean {
    try {
      return (this.sections || []).some(s => !s.name || !s.name.trim());
    } catch {
      return false;
    }
  }
  
  moveSectionUp(sectionId: string): void {
    const index = this.sections.findIndex(section => section.id === sectionId);
    if (index <= 0) {
      return;
    }

    const movedSection = this.sections[index];
    const swappedSection = this.sections[index - 1];

    // Optimistic update: swap sections immediately
    [this.sections[index], this.sections[index - 1]] = [this.sections[index - 1], this.sections[index]];
    this.normalizeSectionOrdering();

    // Check if all sections are persisted (have numeric IDs)
    const allPersisted = this.sections.every(s => !isNaN(Number(s.id)) && Number(s.id) > 0);

    if (allPersisted) {
      // Mark sections as reordering
      this.sectionReorderLoading.add(String(movedSection.id));
      this.sectionReorderLoading.add(String(swappedSection.id));
      this.cdr.detectChanges();

      // Build payload for backend
      const sectionsPayload = this.sections.map((s, idx) => ({
        id: Number(s.id),
        position: idx + 1
      }));

      this.ai.reorderDraftSections(sectionsPayload).subscribe({
        next: (response) => {
          // Update sections from response if available
          if (response.sections && Array.isArray(response.sections)) {
            response.sections.forEach((updatedSection: any) => {
              const localSection = this.sections.find(s => String(s.id) === String(updatedSection.id));
              if (localSection) {
                localSection.number = updatedSection.position;
                localSection.sort_order = updatedSection.position;
              }
            });
          }
          this.sectionReorderLoading.delete(String(movedSection.id));
          this.sectionReorderLoading.delete(String(swappedSection.id));
          this.saveSections();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to reorder sections:', error);
          // Rollback: swap back
          [this.sections[index - 1], this.sections[index]] = [this.sections[index], this.sections[index - 1]];
          this.normalizeSectionOrdering();
          this.sectionReorderLoading.delete(String(movedSection.id));
          this.sectionReorderLoading.delete(String(swappedSection.id));
          this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إعادة ترتيب الأقسام.' : 'Failed to reorder sections.');
          this.cdr.detectChanges();
        }
      });
    } else {
      // Some sections are temporary, just save locally
      this.saveSections();
      this.cdr.detectChanges();
    }
  }

  moveSectionDown(sectionId: string): void {
    const index = this.sections.findIndex(section => section.id === sectionId);
    if (index === -1 || index >= this.sections.length - 1) {
      return;
    }

    const movedSection = this.sections[index];
    const swappedSection = this.sections[index + 1];

    // Optimistic update: swap sections immediately
    [this.sections[index], this.sections[index + 1]] = [this.sections[index + 1], this.sections[index]];
    this.normalizeSectionOrdering();

    // Check if all sections are persisted (have numeric IDs)
    const allPersisted = this.sections.every(s => !isNaN(Number(s.id)) && Number(s.id) > 0);

    if (allPersisted) {
      // Mark sections as reordering
      this.sectionReorderLoading.add(String(movedSection.id));
      this.sectionReorderLoading.add(String(swappedSection.id));
      this.cdr.detectChanges();

      // Build payload for backend
      const sectionsPayload = this.sections.map((s, idx) => ({
        id: Number(s.id),
        position: idx + 1
      }));

      this.ai.reorderDraftSections(sectionsPayload).subscribe({
        next: (response) => {
          // Update sections from response if available
          if (response.sections && Array.isArray(response.sections)) {
            response.sections.forEach((updatedSection: any) => {
              const localSection = this.sections.find(s => String(s.id) === String(updatedSection.id));
              if (localSection) {
                localSection.number = updatedSection.position;
                localSection.sort_order = updatedSection.position;
              }
            });
          }
          this.sectionReorderLoading.delete(String(movedSection.id));
          this.sectionReorderLoading.delete(String(swappedSection.id));
          this.saveSections();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to reorder sections:', error);
          // Rollback: swap back
          [this.sections[index + 1], this.sections[index]] = [this.sections[index], this.sections[index + 1]];
          this.normalizeSectionOrdering();
          this.sectionReorderLoading.delete(String(movedSection.id));
          this.sectionReorderLoading.delete(String(swappedSection.id));
          this.toastr?.error?.(this.currentLang === 'ar' ? 'فشل في إعادة ترتيب الأقسام.' : 'Failed to reorder sections.');
          this.cdr.detectChanges();
        }
      });
    } else {
      // Some sections are temporary, just save locally
      this.saveSections();
      this.cdr.detectChanges();
    }
  }
  
  // Toggle Section Fold/Unfold
  toggleSectionFold(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      // Toggle current section
      section.isCollapsed = !section.isCollapsed;
      // If we just opened this section, close all others (accordion behavior)
      if (!section.isCollapsed) {
        for (const other of this.sections) {
          if (other.id === section.id) continue;
          // Close regardless of previous state (treat undefined as open)
          other.isCollapsed = true;
          this.setSectionCollapseState(other.id, true);
        }
      }
      this.setSectionCollapseState(sectionId, section.isCollapsed);
      this.saveSections();
      this.cdr.detectChanges();
    }
  }
  
  // Get Section Collapse State from localStorage
  private getSectionCollapseState(sectionId: string): boolean | null {
    try {
      const key = `section_collapse_${sectionId}`;
      const value = localStorage.getItem(key);
      return value === 'true';
    } catch {
      return null;
    }
  }
  
  // Set Section Collapse State in localStorage
  private setSectionCollapseState(sectionId: string, isCollapsed: boolean): void {
    try {
      const key = `section_collapse_${sectionId}`;
      localStorage.setItem(key, String(isCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }
  
  // Open Section Menu
  openSectionMenu(sectionId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.menuSectionId = sectionId;
    this.showSectionMenu = true;
  }
  
  // Close Section Menu
  closeSectionMenu(): void {
    this.showSectionMenu = false;
    this.menuSectionId = null;
  }
  
  // Rename Section
  renameSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      this.editingSectionId = sectionId;
      this.editingSectionValue = section.name;
      this.editingSection = true;
      this.closeSectionMenu();
      this.cdr.detectChanges();
    }
  }
  
  // Duplicate Section
  duplicateSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newSectionNumber = this.sections.length + 1;
    const duplicatedSection: Section & { available: boolean } = {
      id: `section-${Date.now()}`,
      number: newSectionNumber,
      sort_order: newSectionNumber,
      name: `${section.name} (${this.currentLang === 'ar' ? 'نسخة' : 'Copy'})`,
      content_items: section.content_items.map(item => ({
        ...item,
        id: `content-${Date.now()}-${Math.random()}`,
        section_id: `section-${Date.now()}`
      })),
      isCollapsed: false,
      available: section.available !== false, // Preserve availability from original
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sections.push(duplicatedSection);
    this.closeSectionMenu();
    this.normalizeSectionOrdering();
    this.saveSections();
    this.cdr.detectChanges();
  }
  
  // Delete Section
  deleteSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    this.sectionToDelete = section;
    this.showDeleteSectionModal = true;
    this.deleteConfirmationInput = '';
    this.closeSectionMenu();
    this.cdr.detectChanges();
  }
  
  // Confirm Delete Section
  confirmDeleteSection(): void {
    if (!this.sectionToDelete) return;
    if (this.sectionRequiresConfirmation() && !this.canConfirmDeleteSection()) {
      return;
    }

    const sectionId = this.sectionToDelete.id;
    const proceedLocalRemoval = () => {
      // Store deleted section for undo
      this.deletedSection = { ...this.sectionToDelete! };
      // Remove section locally
      this.sections = this.sections.filter(s => s.id !== sectionId);
      this.normalizeSectionOrdering();
      if (this.activeSectionId === sectionId) {
        this.setActiveSection(this.sections.length > 0 ? this.sections[0].id : null);
      }
      this.saveSections();
      this.showDeleteSectionModal = false;
      this.sectionToDelete = null;
      this.deleteConfirmationInput = '';
      // Show undo toast
      this.showUndoToast = true;
      this.undoToastTimeout = setTimeout(() => {
        this.hideUndoToast();
      }, 5000);
      this.sectionDeleting = false;
      this.cdr.detectChanges();
    };

    // If this section exists on backend (numeric id), delete there first
    const isPersisted = !isNaN(Number(sectionId));
    this.sectionDeleting = true;
    if (isPersisted) {
      this.ai.deleteDraftSection(sectionId).subscribe({
        next: () => proceedLocalRemoval(),
        error: () => proceedLocalRemoval()
      });
    } else {
      proceedLocalRemoval();
    }
  }

  cancelDeleteSection(): void {
    this.showDeleteSectionModal = false;
    this.sectionToDelete = null;
    this.deleteConfirmationInput = '';
    this.cdr.detectChanges();
  }

  canConfirmDeleteSection(): boolean {
    return this.deleteConfirmationInput.trim().toLowerCase() === this.deleteKeyword;
  }
  
  sectionRequiresConfirmation(): boolean {
    if (!this.sectionToDelete) return false;
    return (this.sectionToDelete.content_items?.length ?? 0) > 0;
  }
  
  // Toggle Section Availability
  toggleSectionAvailability(sectionId: string, event: Event): void {
    event.stopPropagation();
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.available = !(section.available !== false); // Toggle: true becomes false, undefined/false becomes true
      section.updatedAt = new Date().toISOString();
      this.saveSections();
      this.cdr.detectChanges();
    }
  }

  // Undo Delete Section
  undoDeleteSection(): void {
    if (!this.deletedSection) return;
    
    // Restore section
    this.sections.push(this.deletedSection);
    this.sortSectionsByStoredOrder();
    this.normalizeSectionOrdering();
    this.saveSections();
    this.hideUndoToast();
    this.cdr.detectChanges();
  }
  
  // Hide Undo Toast
  hideUndoToast(): void {
    this.showUndoToast = false;
    if (this.undoToastTimeout) {
      clearTimeout(this.undoToastTimeout);
      this.undoToastTimeout = null;
    }
    this.deletedSection = null;
    this.cdr.detectChanges();
  }

  // Start from Scratch - Clear everything
  confirmStartFromScratch(): void {
    if (this.deletingDraftCourse) {
      return;
    }

    this.deletingDraftCourse = true;
    const userId = this.student?.id || this.student?.user_id;

    const resetState = () => {
      this.deletingDraftCourse = false;
      this.ai.clearDraft(userId);

      // Clear all component state
      this.courseName = '';
      this.selectedTopic = '';
      this.subjectSlug = '';
      this.availableTopics = [];
      this.selectedCategory = null;
      this.selectedCategoryId = null;
      this.courseTitleSuggestions = [];
      this.units = [];
    this.sections = [];
    this.contentItems = [];
    this.setActiveSection(null);
      this.step2Locked = false;
      this.currentStep = 1;
      this.editingCourseName = false;
      this.editingCourseNameValue = '';
      this.showStartFromScratchModal = false;

      // Clear any localStorage items related to CKEditor images
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('ckeditor_image_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear CKEditor images from localStorage:', error);
      }

      window.location.reload();
    };

    if (userId && this.universalAuth.isAuthenticated()) {
      this.ai.deleteDraftCourse().subscribe({
        next: () => resetState(),
        error: (error) => {
          console.error('Failed to delete draft course on server:', error);
          resetState();
        }
      });
    } else {
      resetState();
    }
  }
  
  // Save Sections to localStorage
  private saveSections(): void {
    this.normalizeSectionOrdering();
    this.rebuildLegacyContentItems();
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    this.ai.saveDraft({
      ...draft,
      sections: this.sections
    }, userId);
  }

  private normalizeSectionOrdering(): void {
    if (!Array.isArray(this.sections) || this.sections.length === 0) {
      return;
    }

    this.sections.forEach((section, index) => {
      section.sort_order = index + 1;
      section.number = index + 1;
    });
  }

  private sortSectionsByStoredOrder(): void {
    if (!Array.isArray(this.sections) || this.sections.length === 0) {
      return;
    }

    this.sections.sort((a, b) => {
      const orderA = a.sort_order ?? a.number ?? 0;
      const orderB = b.sort_order ?? b.number ?? 0;
      if (orderA === orderB) {
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdA === createdB) {
          return a.id.localeCompare(b.id);
        }
        return createdA - createdB;
      }
      return orderA - orderB;
    });
  }
  
  // Update Section Name (from edit)
  updateSectionName(): void {
    if (!this.editingSectionId || !this.editingSectionValue.trim()) return;
    
    const section = this.sections.find(s => s.id === this.editingSectionId);
    if (section) {
      const newName = this.editingSectionValue.trim();
      const isTemporary = isNaN(Number(section.id));

      const finalizeLocal = () => {
        section.name = newName;
        section.updatedAt = new Date().toISOString();
        if (section.number === 1) {
          this.selectedTopic = section.name;
          this.subjectSlug = section.name;
        }
        this.saveSections();
        this.saveDraftStep2();
        this.editingSection = false;
        this.editingSectionId = null;
        this.editingSectionValue = '';
        this.sectionSaving = false;
        this.cdr.detectChanges();
      };

      this.sectionSaving = true;
      if (isTemporary) {
        // Create on backend and replace local temp id with real numeric id
        this.ai.createDraftSection({ name: newName, available: true }).subscribe({
          next: (response) => {
            // Find the created section by name at end of list (backend returns full draft)
            const created = (response.sections || []).find(s => s.name === newName);
            if (created) {
              section.id = String(created.id);
              section.number = created.position;
              section.sort_order = created.position;
              section.createdAt = created.created_at;
              section.updatedAt = created.updated_at;
            }
            finalizeLocal();
          },
          error: () => {
            // Fallback to local only (should rarely happen)
            finalizeLocal();
          }
        });
      } else {
        // Persist name change on backend
        this.ai.updateDraftSection(section.id, { name: newName }).subscribe({
          next: () => finalizeLocal(),
          error: () => finalizeLocal()
        });
      }
    }
  }
  
  // Get Section by ID
  getSection(sectionId: string | number): Section | undefined {
    // Handle both string and number IDs
    const idStr = String(sectionId);
    const idNum = Number(sectionId);
    return this.sections.find(s => 
      String(s.id) === idStr || Number(s.id) === idNum
    );
  }
  
  setActiveSection(sectionId: string | null): void {
    this.activeSectionId = sectionId;
    if (sectionId) {
      this.ensureSectionContentLoaded(sectionId);
    }
  }
  
  // Get Active Section
  getActiveSection(): Section | undefined {
    if (!this.activeSectionId) return undefined;
    return this.sections.find(s => s.id === this.activeSectionId);
  }
  
  // Keyboard Shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Close menu on Escape
    if (event.key === 'Escape' && this.showSectionMenu) {
      this.closeSectionMenu();
      return;
    }
    
    // N = Add Section (only if step2Locked and not in input/textarea)
    if (event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const target = event.target as HTMLElement;
      if (this.step2Locked && 
          target.tagName !== 'INPUT' && 
          target.tagName !== 'TEXTAREA' && 
          !target.isContentEditable) {
        event.preventDefault();
        this.openAddSectionModal();
      }
    }
    
    // Backspace on selected header → open delete dialog
    // But NOT if user is typing in an input/textarea/editable element
    if (event.key === 'Backspace' && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
      
      // Don't trigger if user is typing in an input field
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return;
      }
      
      if (target.classList.contains('section-content-header') || 
          target.closest('.section-content-header')) {
        event.preventDefault();
        const header = target.closest('.section-content-header');
        if (header) {
          const sectionId = header.getAttribute('data-section-id');
          if (sectionId) {
            this.deleteSection(sectionId);
          }
        }
      }
    }
    
    // Enter on header → fold/unfold
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const target = event.target as HTMLElement;
      if (target.classList.contains('section-content-header') || 
          target.closest('.section-content-header')) {
        event.preventDefault();
        const header = target.closest('.section-content-header');
        if (header) {
          const sectionId = header.getAttribute('data-section-id');
          if (sectionId) {
            this.toggleSectionFold(sectionId);
          }
        }
      }
    }
  }
  
  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showSectionMenu && 
        !target.closest('.section-menu-wrapper') && 
        !target.closest('.section-menu-dropdown')) {
      this.closeSectionMenu();
    }
  }
  
  // Get plain text preview (one line, no HTML styling)
  getTextPreview(htmlContent: string): string {
    if (!htmlContent) return '';
    
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Get all text content, removing HTML tags
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remove extra whitespace and newlines
    text = text.replace(/\s+/g, ' ').trim();
    
    // Return first line (truncate at 100 characters for preview)
    if (text.length > 100) {
      return text.substring(0, 100) + '...';
    }
    
    return text;
  }

  private mapContentRecordToItem(record: SectionContentRecord): ContentItem {
    const allowedTypes: Array<ContentItem['type']> = ['text', 'video', 'resources', 'audio', 'quiz'];
    const normalizedType = allowedTypes.includes(record.type as ContentItem['type'])
      ? (record.type as ContentItem['type'])
      : 'text';

    const rawStatus = record.status;
    let normalizedStatus = false;
    if (typeof rawStatus === 'boolean') {
      normalizedStatus = rawStatus;
    } else if (typeof rawStatus === 'string') {
      normalizedStatus = ['published', 'true', 'active', 'ready', 'success'].includes(rawStatus.trim().toLowerCase());
    }

    const meta = (record.meta ?? {}) as Record<string, unknown>;
    const mappedAssets: ContentAsset[] = (record.assets ?? []).map((asset: any) => ({
      id: asset.id ?? undefined,
      url: asset.url ?? '',
      filename: asset.filename ?? null,
      position: asset.position ?? null,
      kind: asset.kind ?? null,
      mime: asset.mime ?? asset.extra?.mime ?? null,
      filesize_bytes: asset.filesize_bytes ?? asset.extra?.filesize_bytes ?? null,
      pages: asset.pages ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      extra: asset.extra ?? {}
    }));

    const baseItem: ContentItem = {
      id: String(record.id),
      type: normalizedType,
      title: record.title,
      content: record.body_html ?? '',
      section_id: String(record.section_id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      position: record.position,
      status: normalizedStatus,
      meta,
      assets: mappedAssets
    };

    if (normalizedType === 'resources') {
      const fileAsset = mappedAssets.find((asset) => (asset.kind ?? 'file') === 'file');
      const descriptionValue = typeof meta['description'] === 'string' && (meta['description'] as string).trim().length > 0
        ? (meta['description'] as string).trim()
        : undefined;
      const detectedKind = (meta['displayType'] as ResourceDisplayType | undefined)
        || this.detectResourceDisplayType((fileAsset?.filename as string) || record.title)
        || 'compressed';
      const fileSize = typeof meta['fileSize'] === 'number'
        ? (meta['fileSize'] as number)
        : fileAsset?.filesize_bytes ?? 0;
      const downloadUrl = typeof meta['url'] === 'string'
        ? (meta['url'] as string)
        : fileAsset?.url;
      const storageKey = typeof meta['key'] === 'string'
        ? (meta['key'] as string)
        : (fileAsset?.extra && typeof fileAsset.extra === 'object')
          ? (fileAsset.extra as any).s3Key
          : undefined;
      const pageCount = typeof meta['pageCount'] === 'number'
        ? (meta['pageCount'] as number)
        : fileAsset?.pages ?? undefined;
      const assetId = typeof meta['assetId'] === 'number'
        ? (meta['assetId'] as number)
        : fileAsset?.id ?? null;
      const previewable = detectedKind === 'pdf' && fileSize <= this.RESOURCE_INLINE_PREVIEW_LIMIT && !!downloadUrl;

      const resourceDetails: ResourceDetails = {
        fileName: (meta['fileName'] as string) || fileAsset?.filename || record.title,
        fileType: (meta['fileType'] as string) || fileAsset?.mime || '',
        fileSize,
        description: descriptionValue,
        previewMode: previewable ? 'inline' : 'download',
        kind: detectedKind,
        pageCount,
        downloadUrl,
        storageKey,
        assetId,
        storage: downloadUrl ? 's3' : undefined
      };

      if (previewable && downloadUrl) {
        resourceDetails.dataUrl = downloadUrl;
      }

      return {
        ...baseItem,
        content: descriptionValue,
        resourceDetails
      };
    }

    return baseItem;
  }

  private rebuildLegacyContentItems(): void {
    const aggregated: ContentItem[] = [];
    for (const section of this.sections) {
      if (!section || !Array.isArray(section.content_items)) {
        continue;
      }
      const sectionId = section.id;
      section.content_items.forEach((item) => {
        aggregated.push({ ...item, section_id: sectionId });
      });
    }
    this.contentItems = aggregated;
  }

  private ensureSectionContentLoaded(sectionId: string | null | undefined): void {
    if (!sectionId || this.loadedSectionContentIds.has(sectionId)) {
      return;
    }

    const numericSectionId = Number(sectionId);
    if (!Number.isFinite(numericSectionId)) {
      return;
    }

    this.ai.getSectionContent(numericSectionId).subscribe({
      next: (response) => {
        const targetSection = this.getSection(sectionId);
        if (!targetSection) {
          return;
        }

        const mappedItems = (response?.content ?? []).map((record) => this.mapContentRecordToItem(record));
        targetSection.content_items = mappedItems;
        if (mappedItems.length > 0) {
          targetSection.updatedAt = mappedItems[mappedItems.length - 1].updatedAt ?? targetSection.updatedAt;
        }

        this.loadedSectionContentIds.add(sectionId);
        this.rebuildLegacyContentItems();
        this.saveSections();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load section content:', error);
      }
    });
  }

  private ensureSectionsContentLoaded(sections: (Section & { available?: boolean })[]): void {
    sections.forEach((section) => this.ensureSectionContentLoaded(section.id));
  }



  selectTitleSuggestion(titleCard: { title: string; rationale?: string; topics?: string[] }): void {
    this.courseName = titleCard.title;
    
    // Don't populate topics/sections - sections will be created in step 2
    this.availableTopics = [];
    this.selectedTopic = '';
    this.subjectSlug = '';
    
    this.saveDraftStep2();
    this.cdr.detectChanges();
  }
  
  selectTopic(topic: string): void {
    // If already editing this topic, don't do anything on click (buttons handle actions)
    if (this.editingTopic === topic) {
      return;
    }
    
    // If switching to a different topic while editing, cancel current edit
    if (this.editingTopic && this.editingTopic !== topic) {
      // Cancel current edit (don't save)
      this.editingTopic = null;
      this.editingTopicValue = '';
    }
    
    // Just select the topic (edit icon will handle editing)
    this.selectedTopic = topic;
    this.subjectSlug = topic;
    this.editingTopic = null; // Make sure we're not editing
    this.editingTopicValue = '';
    this.saveDraftStep2();
    this.cdr.detectChanges();
  }
  
  enterTopicEdit(topic: string): void {
    // Enter edit mode for the selected topic
    this.editingTopic = topic;
    this.editingTopicValue = topic;
    this.cdr.detectChanges();
    
    // Focus the input after view update
    setTimeout(() => {
      const input = document.querySelector(`.topic-input[data-topic="${topic}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
  
  saveTopicEdit(): void {
    if (this.editingTopic && this.editingTopicValue.trim()) {
      // Update the topic in available topics
      const index = this.availableTopics.indexOf(this.editingTopic);
      if (index !== -1) {
        this.availableTopics[index] = this.editingTopicValue.trim();
      }
      
      // Update selected topic if it was the one being edited
      if (this.selectedTopic === this.editingTopic) {
        this.selectedTopic = this.editingTopicValue.trim();
        this.subjectSlug = this.selectedTopic;
      }
      
      this.editingTopic = null;
      this.editingTopicValue = '';
      this.saveDraftStep2();
    }
  }
  
  cancelTopicEdit(): void {
    this.editingTopic = null;
    this.editingTopicValue = '';
  }

  loadUnitSuggestions(): void {
    if (!this.selectedCategory || !this.student) return;
    
    this.loadingUnits = true;
    const payload = {
      category_id: this.selectedCategory.id,
      course_name: this.courseName || undefined,
      stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
      country_id: this.student?.country_id,
      locale: this.currentLang
    };

    this.ai.getUnits(payload).subscribe({
      next: (res) => {
        if (res.units && res.units.length > 0) {
          this.units = res.units.map((u, idx) => ({
            id: `unit-${Date.now()}-${idx}`,
            name: u.name,
            order: u.order || idx + 1
          }));
        }
        this.loadingUnits = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load unit suggestions:', err);
        this.loadingUnits = false;
      }
    });
  }

  addUnit(): void {
    if (this.units.length >= 7) return; // Soft max
    
    const newUnit = {
      id: `unit-${Date.now()}`,
      name: this.currentLang === 'ar' ? 'وحدة جديدة' : 'New Unit',
      order: this.units.length + 1
    };
    
    this.units.push(newUnit);
    this.startEditingUnit(newUnit.id);
    this.saveDraftStep2();
  }

  removeUnit(unitId: string): void {
    this.units = this.units.filter(u => u.id !== unitId);
    // Reorder remaining units
    this.units.forEach((u, idx) => u.order = idx + 1);
    this.saveDraftStep2();
  }

  startEditingUnit(unitId: string): void {
    const unit = this.units.find(u => u.id === unitId);
    if (unit) {
      this.editingUnitId = unitId;
      this.editingUnitName = unit.name;
    }
  }

  saveUnitEdit(unitId: string): void {
    const unit = this.units.find(u => u.id === unitId);
    if (unit && this.editingUnitName.trim()) {
      unit.name = this.editingUnitName.trim();
      this.editingUnitId = null;
      this.editingUnitName = '';
      this.saveDraftStep2();
    }
  }

  cancelUnitEdit(): void {
    this.editingUnitId = null;
    this.editingUnitName = '';
  }

  moveUnitUp(index: number): void {
    if (index === 0) return;
    [this.units[index], this.units[index - 1]] = [this.units[index - 1], this.units[index]];
    this.units.forEach((u, idx) => u.order = idx + 1);
    this.saveDraftStep2();
  }

  moveUnitDown(index: number): void {
    if (index === this.units.length - 1) return;
    [this.units[index], this.units[index + 1]] = [this.units[index + 1], this.units[index]];
    this.units.forEach((u, idx) => u.order = idx + 1);
    this.saveDraftStep2();
  }

  private saveDraftStep2(): void {
    // Use selectedTopic if available, otherwise use subjectSlug
    const topicValue = this.selectedTopic.trim() || this.subjectSlug.trim();
    const userId = this.student?.id || this.student?.user_id;
    
    const draft: Partial<CourseDraft> = {
      name: this.courseName.trim() || undefined,
      subject_slug: topicValue || undefined,
      mode: this.courseMode,
      context: {
        stage_id: this.student?.education_stage_id ?? this.student?.stage_id,
        country_id: this.student?.country_id,
        term: this.currentTerm
      },
      preferences: {
        educationalStage: this.coursePreferences.educationalStage.length > 0 
          ? this.coursePreferences.educationalStage 
          : undefined,
        country: this.coursePreferences.country.length > 0 
          ? this.coursePreferences.country 
          : undefined
      },
      user_id: userId,
      last_saved_at: new Date().toISOString()
    };
    this.ai.saveDraft(draft, userId);
  }

  // Check if should show mode toggle (no stage/country)
  get shouldShowModeToggle(): boolean {
    const hasStage = !!(this.student?.education_stage_id ?? this.student?.stage_id);
    const hasCountry = !!this.student?.country_id;
    return !hasStage || !hasCountry;
  }

  get termLabel(): string {
    const termText = this.currentLang === 'ar' ? `الفصل الدراسي ${this.currentTerm}` : `Term ${this.currentTerm}`;
    return termText;
  }

  getCategoryName(cat: Category | null | undefined): string {
    if (!cat) {
      return '';
    }
    return this.currentLang === 'ar' ? cat.name_ar : cat.name_en;
  }

  private createDefaultResourceForm(): ResourceFormState {
    return {
      title: '',
      description: '',
      displayType: 'compressed',
      fileName: '',
      fileType: '',
      fileSize: 0,
      dataUrl: null,
      previewMode: 'download',
      pageCount: null
    };
  }

  private syncDraftFromServer(onComplete?: () => void): void {
    if (!this.student || !this.universalAuth.isAuthenticated()) {
      onComplete?.();
      return;
    }
    const userId = this.student.id || this.student.user_id;
    if (!userId) {
      onComplete?.();
      return;
    }

    this.ai.getDraftCourse().subscribe({
      next: (response: DraftCourseResponse) => {
        if (response && response.course) {
          this.handleDraftCourseResponse(response, userId);
        } else {
          this.ai.clearDraft(userId);
          this.sections = [];
          this.setActiveSection(null);
          this.step2Locked = false;
        }
        onComplete?.();
      },
      error: (error) => {
        console.error('Failed to sync draft course', error);
        onComplete?.();
      }
    });
  }

  private afterDraftLoaded(): void {
    if (this.draftSyncCompleted) {
      return;
    }
    this.draftSyncCompleted = true;

    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);

    if (draft) {
      if (draft.category_id) {
        this.selectedCategoryId = draft.category_id;
      }
      if (draft.name) {
        this.courseName = draft.name;
      }
      if (draft.subject_slug) {
        this.subjectSlug = draft.subject_slug;
        this.selectedTopic = draft.subject_slug;
      }
      // Note: description is not stored in CourseDraft interface, it's only in the backend
      if (draft.mode) {
        this.courseMode = draft.mode;
      }
      if (draft.context?.term) {
        this.currentTerm = draft.context.term;
      }
      if (draft.cover_image_url) {
        this.courseCoverPreview = draft.cover_image_url;
      }
      if (draft.preferences) {
        if (Array.isArray(draft.preferences.educationalStage)) {
          this.coursePreferences.educationalStage = draft.preferences.educationalStage;
        }
        if (Array.isArray(draft.preferences.country)) {
          this.coursePreferences.country = draft.preferences.country;
        }
      }
      if (draft.category_id && draft.name && draft.name.trim().length >= 3) {
        this.step2Locked = true;
        this.currentStep = 1;
      } else if (draft.category_id) {
        this.currentStep = 2;
      }
    }

    this.loadProfileFromBackend();
    this.loadAllCategories();
    this.initializeSections();
    
    // Check if contentId is in route params (for lesson builder persistence)
    // Wait for sections to be fully initialized and content items to be loaded
    this.route.queryParams.subscribe(params => {
      const contentId = params['contentId'];
      if (contentId && !this.showLessonBuilder) {
        // Wait for sections to be loaded, then load content items if needed
        this.loadAndOpenLessonBuilderWithRetry(contentId);
      }
    });
  }

  private mapApiSectionToLocal(section: DraftCourseSectionResponse): (Section & { available?: boolean }) {
    const id = String(section.id);
    const available = section.available !== false;
    return {
      id,
      number: section.position ?? 1,
      sort_order: section.position ?? 1,
      name: section.name,
      content_items: [],
      isCollapsed: this.getSectionCollapseState(id) ?? false,
      createdAt: section.created_at,
      updatedAt: section.updated_at,
      available
    };
  }

  private registerPendingImageAsset(asset: UploadedEditorImageAsset | undefined): void {
    if (!asset || !asset.key) {
      return;
    }
    this.ensureCurrentEditingContentId();
    this.pendingImageUploads.set(asset.key, asset);

    if (asset.url) {
      const normalized = this.normalizeAssetUrl(asset.url);
      if (normalized) {
        this.editorKnownImageMap.set(normalized, asset.key);
      }
    }

    this.editorDeletedImageKeys.delete(asset.key);
  }

  private cleanupPendingImageUploads(): void {
    if (!this.pendingImageUploads.size) {
      return;
    }

    const keys = Array.from(this.pendingImageUploads.values())
      .map((asset) => asset.key)
      .filter((key): key is string => typeof key === 'string' && key.trim().length > 0);

    if (!keys.length) {
      this.pendingImageUploads.clear();
      return;
    }

    this.pendingImageUploads.clear();

    this.ai.deleteDraftContentImages(keys).subscribe({
      next: () => {
        // All good, nothing else to do.
      },
      error: (error: unknown) => {
        console.error('Failed to delete pending editor images:', error);
      }
    });
  }

  private pruneUnusedPendingImages(finalHtml: string | null | undefined): void {
    if (!this.pendingImageUploads.size) {
      return;
    }

    const html = typeof finalHtml === 'string' ? finalHtml : '';
    const unusedKeys = Array.from(this.pendingImageUploads.values())
      .filter((asset) => {
        if (!asset.key) {
          return false;
        }

        const urlMatch = asset.url ? html.includes(asset.url) : false;
        const keyMatch = html.includes(asset.key);
        return !(urlMatch || keyMatch);
      })
      .map((asset) => asset.key as string);

    if (!unusedKeys.length) {
      this.pendingImageUploads.clear();
      return;
    }

    this.pendingImageUploads.clear();

    this.ai.deleteDraftContentImages(unusedKeys).subscribe({
      next: () => {
        // Unused images removed successfully.
      },
      error: (error: unknown) => {
        console.error('Failed to prune unused editor images:', error);
      }
    });
  }

  private handleDraftCourseResponse(response: DraftCourseResponse | null, userId?: number): void {
    if (!response) {
      return;
    }

    this.loadedSectionContentIds.clear();
    const resolvedUserId = userId ?? this.student?.id ?? this.student?.user_id ?? null;
    let mappedSections: (Section & { available?: boolean })[] = this.sections;

    if (response.course) {
      this.draftCourseId = response.course.id;
      this.courseName = response.course.name || this.courseName;
      this.courseDescription = response.course.description || this.courseDescription;
      this.subjectSlug = response.course.subject_slug || this.subjectSlug;
      this.selectedTopic = this.subjectSlug;
      this.courseCoverPreview = response.course.cover_image_url ?? null;
      if (response.course.category_id) {
        this.selectedCategoryId = response.course.category_id;
      }
      
      // Restore preferences from availability
      if (response.course.availability && response.course.availability.preferences) {
        const prefs = response.course.availability.preferences;
        if (Array.isArray(prefs.educationalStage)) {
          this.coursePreferences.educationalStage = prefs.educationalStage;
        }
        if (Array.isArray(prefs.country)) {
          this.coursePreferences.country = prefs.country;
        }
      }
      
      this.step2Locked = true;
      this.currentStep = 1;
    }

    if (response.sections && response.sections.length) {
      mappedSections = response.sections.map((section) => this.mapApiSectionToLocal(section));
  this.sections = mappedSections;
  this.setActiveSection(mappedSections.length ? mappedSections[0].id : null);
  this.ensureSectionsContentLoaded(mappedSections);
    }

    if (resolvedUserId) {
      const draftForLocal: Partial<CourseDraft> = {
        version: 1,
        user_id: resolvedUserId,
        category_id: response.course?.category_id ?? undefined,
        category_name: this.selectedCategory ? (this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en) : undefined,
        name: response.course?.name ?? this.courseName,
        subject_slug: response.course?.subject_slug ?? this.subjectSlug,
        country_id: response.course?.country_id ?? undefined,
        cover_image_url: response.course?.cover_image_url ?? null,
        // Note: description is stored in backend but not in CourseDraft interface
        last_saved_at: response.course?.updated_at ?? new Date().toISOString(),
        preferences: response.course?.availability?.preferences ? {
          educationalStage: Array.isArray(response.course.availability.preferences.educationalStage) 
            ? response.course.availability.preferences.educationalStage 
            : undefined,
          country: Array.isArray(response.course.availability.preferences.country) 
            ? response.course.availability.preferences.country 
            : undefined
        } : undefined,
        sections: mappedSections
      };
      this.ai.saveDraft(draftForLocal, resolvedUserId);
    }

    this.rebuildLegacyContentItems();
    this.cdr.detectChanges();
  }

  private buildDraftCoursePayload(): CreateDraftCoursePayload {
    const sectionsPayload = this.sections.map((section, index) => ({
      name: section.name,
      position: section.sort_order ?? section.number ?? index + 1,
      description: (section as any).description ?? null,
      available: (section as any).available !== false
    }));

    return {
      course: {
        name: this.courseName.trim(),
        subject_slug: (this.selectedTopic || this.subjectSlug || this.courseName).trim(),
        category_id: this.selectedCategory?.id,
        country_id: this.student?.country_id ?? undefined,
        cover_image_url: this.courseCoverPreview ?? undefined,
        description: this.courseDescription.trim() || undefined,
        preferences: {
          educationalStage: this.coursePreferences.educationalStage.length > 0 
            ? this.coursePreferences.educationalStage 
            : undefined,
          country: this.coursePreferences.country.length > 0 
            ? this.coursePreferences.country 
            : undefined
        }
      },
      sections: sectionsPayload.length > 0 ? sectionsPayload : undefined
    };
  }

  private resetResourceForm(): void {
    this.resourceForm = this.createDefaultResourceForm();
    this.resourceFile = null;
    this.resourceUploadError = null;
    this.resourceUploading = false;
    this.resourceSaving = false;
    this.resourceUploadInProgress = false;
    this.resourceUploadProgress = 0;
    this.resourcePreviewSafeUrl = null;
    this.resourcePreviewItem = null;
    this.resourcePreviewKind = null;
    if (this.resourceUploadSub) {
      this.resourceUploadSub.unsubscribe();
      this.resourceUploadSub = undefined;
    }
  }

  private detectResourceDisplayType(fileName: string): ResourceDisplayType | null {
    const extension = (fileName.split('.').pop() || '').toLowerCase();

    const match = this.resourceTypeOptions.find(option => option.extensions.includes(extension));
    return match ? match.value : null;
  }

  private isResourcePreviewable(displayType: ResourceDisplayType | null, fileSize: number): boolean {
    if (!displayType) {
      return false;
    }
    if (fileSize > this.RESOURCE_INLINE_PREVIEW_LIMIT) {
      return false;
    }
    const option = this.resourceTypeOptions.find(opt => opt.value === displayType);
    return option ? option.previewable : false;
  }

  getResourceAcceptForSelectedType(): string {
    const type = this.resourceForm.displayType;
    switch (type) {
      case 'compressed':
        return '.zip,.rar,application/zip,application/x-zip-compressed,application/x-rar-compressed';
      case 'pdf':
        return '.pdf,application/pdf';
      case 'word':
        return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'excel':
        return '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt':
        return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default:
        return '.zip,.rar,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    }
  }

  openResourceModal(): void {
    this.resetResourceForm();
    this.showResourceModal = true;
    this.selectedContentType = 'resources';
    this.cdr.detectChanges();
  }

  closeResourceModal(force: boolean = false): void {
    if (this.resourceUploadInProgress && !force) {
      return;
    }
    this.showResourceModal = false;
    this.selectedContentType = null;
    this.resetResourceForm();
    this.cdr.detectChanges();
  }

  onResourceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.processResourceFile(file);
    // Reset input so the same file can be selected again if needed
    input.value = '';
  }

  private processResourceFile(file: File): void {
    if (file.size > this.RESOURCE_MAX_SIZE) {
      this.resourceUploadError = this.currentLang === 'ar'
        ? 'الملف كبير جدًا. الحد الأقصى 100 ميجابايت.'
        : 'File is too large. Maximum allowed size is 100 MB.';
      this.resourceFile = null;
      this.resourceForm.fileName = '';
      this.resourceForm.fileType = '';
      this.resourceForm.fileSize = 0;
      this.resourceForm.dataUrl = null;
      this.resourceForm.pageCount = null;
      this.resourcePreviewSafeUrl = null;
      this.cdr.detectChanges();
      return;
    }

    this.resourceUploadError = null;
    this.resourceUploading = true;
    this.resourceFile = file;

    const mimeType = file.type || 'application/octet-stream';
    const displayType = this.detectResourceDisplayType(file.name);

    if (!displayType) {
      this.resourceUploadError = this.currentLang === 'ar'
        ? 'نوع الملف غير مدعوم. الصيغ المسموح بها: ZIP, RAR، PDF، PPT/PPTX، XLS/XLSX، DOC/DOCX.'
        : 'Unsupported file type. Allowed formats are ZIP, RAR, PDF, PPT/PPTX, XLS/XLSX, DOC/DOCX.';
      this.resourceFile = null;
      this.resourceForm.fileName = '';
      this.resourceForm.fileType = '';
      this.resourceForm.fileSize = 0;
      this.resourceForm.dataUrl = null;
      this.resourceForm.pageCount = null;
      this.resourcePreviewSafeUrl = null;
      this.resourceUploading = false;
      this.cdr.detectChanges();
      return;
    }

    const previewable = this.isResourcePreviewable(displayType, file.size);

    this.resourceForm.displayType = displayType;
    this.resourceForm.fileName = file.name;
    this.resourceForm.fileType = mimeType;
    this.resourceForm.fileSize = file.size;
    this.resourceForm.previewMode = previewable ? 'inline' : 'download';
    this.resourceForm.pageCount = null;

    if (!previewable) {
      this.resourceForm.dataUrl = null;
      this.resourcePreviewSafeUrl = null;
      this.resourceUploading = false;
      this.cdr.detectChanges();
      return;
    }

    this.resourceUploading = true;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      this.resourceForm.dataUrl = result;
      this.resourcePreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(result);

      try {
        const arrayBuffer = await this.base64ToArrayBuffer(result);
        const extras = await this.extractResourceMetadataFromArrayBuffer(arrayBuffer, displayType, {
          fileName: file.name,
          mimeType
        });
        if (extras.pageCount !== undefined && extras.pageCount !== null) {
          this.resourceForm.pageCount = extras.pageCount;
        }
      } catch (error) {
        console.warn('Could not extract resource metadata', file.name, error);
      } finally {
        this.resourceUploading = false;
        this.cdr.detectChanges();
      }
    };

    reader.onerror = () => {
      this.resourceUploadError = this.currentLang === 'ar'
        ? 'تعذر قراءة الملف. حاول مرة أخرى.'
        : 'Failed to read file. Please try again.';
      this.resourceUploading = false;
      this.resourceFile = null;
      this.resourceForm.dataUrl = null;
      this.resourceForm.pageCount = null;
      this.resourcePreviewSafeUrl = null;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
  }

  submitResource(): void {
    if (this.resourceSaving || this.resourceUploading || this.resourceUploadInProgress) {
      return;
    }

    const trimmedTitle = this.resourceForm.title.trim();
    if (!trimmedTitle) {
      alert(this.currentLang === 'ar'
        ? 'يرجى إدخال عنوان للموارد.'
        : 'Please provide a title for the resource.');
      return;
    }

    if (!this.resourceFile || !this.resourceForm.fileName) {
      alert(this.currentLang === 'ar'
        ? 'يرجى اختيار ملف للموارد.'
        : 'Please select a file for the resource.');
      return;
    }

    const activeSection = this.getActiveSection() || this.sections[0];
    if (!activeSection) {
      alert(this.currentLang === 'ar'
        ? 'يرجى إنشاء قسم أولاً قبل إضافة الموارد.'
        : 'Please create a section before adding resources.');
      return;
    }

    const numericSectionId = Number(activeSection.id);
    if (!Number.isFinite(numericSectionId)) {
      const message = this.currentLang === 'ar'
        ? 'يرجى حفظ القسم على الخادم قبل إضافة الملفات.'
        : 'Please sync the section with the server before adding resources.';
      this.toastr.warning(message);
      return;
    }

    const description = this.resourceForm.description?.trim();
    const meta: Record<string, unknown> = {
      description: description || undefined,
      displayType: this.resourceForm.displayType,
      fileName: this.resourceForm.fileName,
      fileType: this.resourceForm.fileType,
      fileSize: this.resourceForm.fileSize,
      pageCount: this.resourceForm.pageCount ?? undefined
    };

    this.resourceSaving = true;
    this.resourceUploadInProgress = true;
    this.resourceUploadProgress = 0;
    this.resourceUploadError = null;
    this.cdr.detectChanges();

    this.ai.createSectionContent(numericSectionId, {
      type: 'resources',
      title: trimmedTitle,
      status: true,
      meta
    }).subscribe({
      next: (response) => {
        const record = response?.content;
        if (!record) {
          throw new Error('Empty response while creating resource content.');
        }

        const sectionKey = String(record.section_id);
        const mappedItem = this.mapContentRecordToItem(record);
        if (description && mappedItem) {
          mappedItem.content = description;
          if (mappedItem.resourceDetails) {
            mappedItem.resourceDetails.description = description;
          }
        }

        const targetSection = this.getSection(sectionKey);
        if (targetSection) {
          targetSection.content_items = [...targetSection.content_items, mappedItem].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          targetSection.updatedAt = mappedItem.updatedAt || new Date().toISOString();
        }
        this.loadedSectionContentIds.add(sectionKey);
        this.rebuildLegacyContentItems();
        this.saveSections();
        this.cdr.detectChanges();

        this.resourceUploadProgress = Math.max(this.resourceUploadProgress, 10);
        this.cdr.detectChanges();
        this.uploadResourceFile(this.resourceFile!, numericSectionId, mappedItem, sectionKey);
      },
      error: (error) => {
        this.resourceSaving = false;
        this.resourceUploadInProgress = false;
        const message = this.resolveErrorMessage(
          error,
          'Failed to create the resource. Please try again.',
          'تعذر إنشاء الملف. حاول مرة أخرى.'
        );
        this.toastr.error(message);
        this.cdr.detectChanges();
      }
    });
  }

  private uploadResourceFile(file: File, sectionId: number, item: ContentItem, sectionKey: string): void {
    if (this.resourceUploadSub) {
      this.resourceUploadSub.unsubscribe();
    }

    this.resourceUploadSub = this.ai.uploadDraftContentResource(file, item.id).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          if (total > 0) {
            this.resourceUploadProgress = Math.min(99, Math.max(10, Math.round((event.loaded / total) * 100)));
          } else {
            this.resourceUploadProgress = Math.min(99, Math.max(this.resourceUploadProgress, 25));
          }
          this.cdr.detectChanges();
        } else if (event.type === HttpEventType.Response) {
          const asset = event.body?.asset;
          if (asset) {
            this.applyResourceAsset(sectionId, sectionKey, String(item.id), asset);
          }

          this.resourceUploadProgress = 100;
          this.resourceSaving = false;
          this.resourceUploadInProgress = false;
          if (this.resourceUploadSub) {
            this.resourceUploadSub.unsubscribe();
            this.resourceUploadSub = undefined;
          }

          const successMessage = this.currentLang === 'ar'
            ? 'تم حفظ الملف بنجاح.'
            : 'Resource saved successfully.';
          this.toastr.success(successMessage);

          this.closeResourceModal(true);
        }
      },
      error: (error) => {
        this.handleResourceUploadFailure(error, sectionId, String(item.id), sectionKey);
      }
    });
  }

  private handleResourceUploadFailure(error: unknown, sectionId: number, contentId: string, sectionKey: string): void {
    if (this.resourceUploadSub) {
      this.resourceUploadSub.unsubscribe();
      this.resourceUploadSub = undefined;
    }

    this.resourceSaving = false;
    this.resourceUploadInProgress = false;
    this.resourceUploadProgress = 0;
    this.setContentStatusPending(contentId, false);

    const message = this.resolveErrorMessage(
      error,
      'Failed to upload the resource. Please try again.',
      'تعذر رفع الملف. حاول مرة أخرى.'
    );
    this.toastr.error(message);

    this.removeContentItem(sectionKey, contentId);
    this.resourceFile = null;
    this.resourceForm.fileName = '';
    this.resourceForm.fileType = '';
    this.resourceForm.fileSize = 0;
    this.resourceForm.dataUrl = null;
    this.resourceForm.pageCount = null;
    this.resourcePreviewSafeUrl = null;
    this.resourceUploading = false;
    this.cdr.detectChanges();

    this.ai.deleteSectionContent(sectionId, contentId).subscribe({
      error: (cleanupError) => console.error('Failed to remove resource content after upload failure', cleanupError)
    });
  }

  private applyResourceAsset(sectionId: number, sectionKey: string, contentId: string, asset: UploadResourceResponse['asset']): void {
    const targetSection = this.getSection(sectionKey);
    if (!targetSection) {
      return;
    }

    const itemIndex = targetSection.content_items.findIndex((ci) => ci.id === contentId);
    if (itemIndex === -1) {
      return;
    }

    const currentItem = targetSection.content_items[itemIndex];
    const existingAssets = [...(currentItem.assets ?? [])];
    const fileAssetIndex = existingAssets.findIndex((a) => (a.kind ?? 'file') === 'file');

    const mappedAsset: ContentAsset = {
      id: asset.id ?? undefined,
      url: asset.url,
      filename: asset.filename ?? currentItem.resourceDetails?.fileName ?? currentItem.title,
      position: asset.position ?? (existingAssets.length + 1),
      kind: asset.kind ?? 'file',
      mime: asset.mime ?? null,
      filesize_bytes: asset.size,
      extra: {
        ...(fileAssetIndex >= 0 && existingAssets[fileAssetIndex].extra ? existingAssets[fileAssetIndex].extra : {}),
        s3Key: asset.key,
        mime: asset.mime
      }
    };

    if (fileAssetIndex >= 0) {
      existingAssets[fileAssetIndex] = { ...existingAssets[fileAssetIndex], ...mappedAsset };
    } else {
      existingAssets.push(mappedAsset);
    }

    const meta = { ...(currentItem.meta ?? {}) } as Record<string, unknown>;
    const inferredKind = (meta['displayType'] as ResourceDisplayType | undefined)
      || this.detectResourceDisplayType(mappedAsset.filename || '')
      || 'compressed';
    const fileSize = mappedAsset.filesize_bytes ?? (typeof meta['fileSize'] === 'number' ? (meta['fileSize'] as number) : 0);
    const previewable = inferredKind === 'pdf' && fileSize <= this.RESOURCE_INLINE_PREVIEW_LIMIT;
    const descriptionValue = currentItem.resourceDetails?.description
      ?? (typeof meta['description'] === 'string' ? (meta['description'] as string).trim() : undefined);

    const updatedResourceDetails: ResourceDetails = {
      fileName: mappedAsset.filename || (meta['fileName'] as string) || currentItem.title,
      fileType: mappedAsset.mime || (meta['fileType'] as string) || '',
      fileSize,
      description: descriptionValue,
      previewMode: previewable ? 'inline' : 'download',
      kind: inferredKind,
      pageCount: typeof meta['pageCount'] === 'number' ? (meta['pageCount'] as number) : currentItem.resourceDetails?.pageCount,
      downloadUrl: mappedAsset.url,
      storageKey: (mappedAsset.extra as any)?.s3Key ?? (meta['key'] as string | undefined),
      assetId: mappedAsset.id ?? (typeof meta['assetId'] === 'number' ? (meta['assetId'] as number) : null),
      storage: 's3'
    };

    if (previewable) {
      updatedResourceDetails.dataUrl = mappedAsset.url;
    }

    const updatedMeta: Record<string, unknown> = {
      ...meta,
      description: updatedResourceDetails.description,
      displayType: inferredKind,
      fileName: updatedResourceDetails.fileName,
      fileType: updatedResourceDetails.fileType,
      fileSize: updatedResourceDetails.fileSize,
      pageCount: updatedResourceDetails.pageCount,
      url: mappedAsset.url,
      key: (mappedAsset.extra as any)?.s3Key,
      mime: mappedAsset.mime,
      assetId: updatedResourceDetails.assetId,
      storage: 's3'
    };

    const updatedItem: ContentItem = {
      ...currentItem,
      meta: updatedMeta,
      assets: existingAssets,
      resourceDetails: updatedResourceDetails,
      content: updatedResourceDetails.description,
      updatedAt: new Date().toISOString()
    };

    targetSection.content_items[itemIndex] = updatedItem;
    this.setContentStatusPending(contentId, false);
    this.rebuildLegacyContentItems();
    this.saveSections();
    this.cdr.detectChanges();

    this.ai.updateSectionContent(sectionId, contentId, {
      meta: updatedMeta,
      status: updatedItem.status ?? true
    }).subscribe({
      next: (response) => {
        const content = response?.content;
        if (!content) {
          return;
        }
        const refreshed = this.mapContentRecordToItem(content);
        const refreshedSection = this.getSection(sectionKey);
        if (!refreshedSection) {
          return;
        }
        const refreshedIndex = refreshedSection.content_items.findIndex((ci) => ci.id === refreshed.id);
        if (refreshedIndex !== -1) {
          refreshedSection.content_items[refreshedIndex] = {
            ...refreshedSection.content_items[refreshedIndex],
            ...refreshed
          };
          this.rebuildLegacyContentItems();
          this.saveSections();
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Failed to persist resource metadata', error);
      }
    });
  }

  private removeContentItem(sectionId: string, contentId: string): void {
    const targetSection = this.getSection(sectionId);
    if (targetSection) {
      targetSection.content_items = targetSection.content_items.filter((item) => item.id !== contentId);
      targetSection.updatedAt = new Date().toISOString();
    }

    this.rebuildLegacyContentItems();
    this.saveSections();
    this.pendingContentStatus.delete(contentId);
  }

  openResourcePreview(item: ContentItem): void {
    this.resourcePreviewItem = item;
    const dataUrl = item.resourceDetails?.dataUrl || null;
    const detectedKind = this.detectResourceDisplayType(item.resourceDetails?.fileName || '');
    const displayType = (item.resourceDetails?.kind as ResourceDisplayType | undefined) || detectedKind || 'pdf';
    const previewable = dataUrl ? this.isResourcePreviewable(displayType, item.resourceDetails?.fileSize || 0) : false;

    if (item.resourceDetails && !item.resourceDetails.kind) {
      item.resourceDetails.kind = displayType;
    }

    if (item.resourceDetails) {
      item.resourceDetails.previewMode = previewable ? 'inline' : 'download';
      if (previewable && (item.resourceDetails.pageCount === undefined || item.resourceDetails.pageCount === null)) {
        void this.populateExistingResourceMetadata(item, displayType);
      }
    }

    this.resourcePreviewKind = displayType;
    this.resourcePreviewSafeUrl = previewable && dataUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl)
      : null;
    this.showResourcePreviewModal = true;
    this.cdr.detectChanges();
  }

  closeResourcePreview(): void {
    this.resourcePreviewItem = null;
    this.resourcePreviewSafeUrl = null;
    this.resourcePreviewKind = null;
    this.showResourcePreviewModal = false;
    this.cdr.detectChanges();
  }

  getResourceDisplayLabel(details?: ResourceDetails | null): string {
    if (!details) {
      return this.currentLang === 'ar' ? 'غير محدد' : 'Unspecified';
    }
    const kind = (details.kind as ResourceDisplayType | undefined) || this.detectResourceDisplayType(details.fileName);
    const option = kind ? this.resourceTypeOptions.find(opt => opt.value === kind) : undefined;
    if (!option) {
      return details.fileType || (this.currentLang === 'ar' ? 'غير محدد' : 'Unspecified');
    }
    return this.currentLang === 'ar' ? option.labelAr : option.labelEn;
  }

  getResourceIcon(details?: ResourceDetails | null): string {
    if (!details) return '📁';
    const detectedKind = this.detectResourceDisplayType(details.fileName);
    const kind = (details.kind as ResourceDisplayType | undefined) || detectedKind;
    const option = kind ? this.resourceTypeOptions.find(opt => opt.value === kind) : undefined;
    return option?.icon || '📁';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  isPdfResource(details?: ResourceDetails | null): boolean {
    if (!details) return false;
    const detectedKind = this.detectResourceDisplayType(details.fileName);
    const kind = (details.kind as ResourceDisplayType | undefined) || detectedKind;
    return kind === 'pdf';
  }

  isImageResource(details?: ResourceDetails | null): boolean {
    return false;
  }

  getResourceDownloadName(details?: ResourceDetails | null): string {
    if (!details) {
      return 'resource';
    }
    return details.fileName || 'resource';
  }

  getResourceDetailSeparator(): string {
    return this.currentLang === 'ar' ? '، ' : ', ';
  }

  getResourceDetailEntries(details?: ResourceDetails | null): { label: string; value: string }[] {
    if (!details) {
      return [];
    }

    const labelPages = this.currentLang === 'ar' ? 'الصفحات' : 'Pages';
    const labelSize = this.currentLang === 'ar' ? 'الحجم' : 'Size';
    const labelFile = this.currentLang === 'ar' ? 'الملف' : 'File';
    const labelType = this.currentLang === 'ar' ? 'النوع' : 'Type';

    const entries: { label: string; value: string }[] = [];

    const fileName = details.fileName && details.fileName.trim().length > 0
      ? details.fileName
      : (this.currentLang === 'ar' ? 'بدون اسم' : 'Untitled');
    entries.push({ label: labelFile, value: fileName });

    const typeLabel = this.getResourceDisplayLabel(details);
    if (typeLabel) {
      entries.push({ label: labelType, value: typeLabel });
    }

    if (details.pageCount !== undefined && details.pageCount !== null) {
      entries.push({ label: labelPages, value: `${details.pageCount}` });
    }

    if (details.fileSize) {
      entries.push({ label: labelSize, value: this.formatFileSize(details.fileSize) });
    }

    return entries;
  }

  getVideoDetailEntries(item: ContentItem): { label: string; value: string }[] {
    if (!item || item.type !== 'video' || !item.meta) {
      return [];
    }

    const labelSource = this.currentLang === 'ar' ? 'المصدر' : 'Source';
    const labelDuration = this.currentLang === 'ar' ? 'المدة' : 'Duration';
    const labelProvider = this.currentLang === 'ar' ? 'المنصة' : 'Platform';
    const labelSize = this.currentLang === 'ar' ? 'الحجم' : 'Size';

    const entries: { label: string; value: string }[] = [];
    const meta = item.meta as any;

    // Video source/provider
    if (meta.provider) {
      const providerLabel = meta.provider === 'youtube' 
        ? 'YouTube' 
        : meta.provider === 'local' 
          ? (this.currentLang === 'ar' ? 'ملف محلي' : 'Local File')
          : meta.provider;
      entries.push({ label: labelProvider, value: providerLabel });
    }

    // Duration
    if (meta.duration) {
      const durationFormatted = this.formatDuration(meta.duration);
      entries.push({ label: labelDuration, value: durationFormatted });
    }

    // File size (for local videos)
    if (meta.provider === 'local' && meta.fileSize) {
      entries.push({ label: labelSize, value: this.formatFileSize(meta.fileSize) });
    }

    return entries;
  }

  getAudioDetailEntries(item: ContentItem): { label: string; value: string }[] {
    if (!item || item.type !== 'audio' || !item.meta) {
      return [];
    }

    const labelSource = this.currentLang === 'ar' ? 'المصدر' : 'Source';
    const labelDuration = this.currentLang === 'ar' ? 'المدة' : 'Duration';
    const labelSize = this.currentLang === 'ar' ? 'الحجم' : 'Size';

    const entries: { label: string; value: string }[] = [];
    const meta = item.meta as any;

    // Audio source/provider
    if (meta.provider) {
      const providerLabel = meta.provider === 'upload' 
        ? (this.currentLang === 'ar' ? 'رفع ملف' : 'File Upload')
        : meta.provider === 'convert' 
          ? (this.currentLang === 'ar' ? 'تحويل نص' : 'Text Conversion')
          : meta.provider === 'generate'
            ? (this.currentLang === 'ar' ? 'توليد بالذكاء الاصطناعي' : 'AI Generated')
            : meta.provider;
      entries.push({ label: labelSource, value: providerLabel });
    }

    // Duration (most important for audio)
    if (meta.duration) {
      const durationFormatted = this.formatDuration(meta.duration);
      entries.push({ label: labelDuration, value: durationFormatted });
    }

    // File size
    if (meta.fileSize) {
      entries.push({ label: labelSize, value: this.formatFileSize(meta.fileSize) });
    }

    return entries;
  }

  getResourceDetailEntriesFromForm(): { label: string; value: string }[] {
    if (!this.resourceForm.fileName) {
      return [];
    }

    return this.getResourceDetailEntries({
      fileName: this.resourceForm.fileName,
      fileType: this.resourceForm.fileType,
      fileSize: this.resourceForm.fileSize,
      kind: this.resourceForm.displayType,
      pageCount: this.resourceForm.pageCount ?? undefined,
      description: this.resourceForm.description?.trim() || undefined,
      previewMode: this.resourceForm.previewMode
    });
  }

  private async base64ToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async extractResourceMetadataFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    displayType: ResourceDisplayType,
    info: { fileName: string; mimeType: string }
  ): Promise<Partial<ResourceDetails>> {
    const extras: Partial<ResourceDetails> = {};

    try {
      if (displayType === 'pdf') {
        // @ts-ignore - dynamic runtime import, types resolved at build time post-install
        const pdfjsLib: any = await import('pdfjs-dist/build/pdf');
        if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const typedArray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        const doc = await loadingTask.promise;
        if (doc?.numPages) {
          extras.pageCount = doc.numPages;
        }
        if (doc?.destroy) {
          doc.destroy();
        }
      } else if (displayType === 'word' && info.fileName.toLowerCase().endsWith('.docx')) {
        // @ts-ignore - dynamic runtime import, types resolved at build time post-install
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const appXmlFile = zip.file('docProps/app.xml');
        if (appXmlFile) {
          const appXml = await appXmlFile.async('text');
          const pagesMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
          if (pagesMatch) {
            extras.pageCount = parseInt(pagesMatch[1], 10);
          }
        }
      }
    } catch (error) {
      console.warn('Resource metadata extraction failed', info.fileName, error);
    }

    return extras;
  }

  private getResourcePageLabel(count?: number | null): string | null {
    if (count === undefined || count === null) {
      return null;
    }

    if (this.currentLang === 'ar') {
      if (count === 0) return '0 صفحة';
      if (count === 1) return 'صفحة واحدة';
      if (count === 2) return 'صفحتان';
      if (count >= 3 && count <= 10) return `${count} صفحات`;
      return `${count} صفحة`;
    }

    if (count === 1) {
      return '1 page';
    }
    return `${count} pages`;
  }

  getResourceFormSummary(): string {
    if (!this.resourceForm.fileName) {
      return this.currentLang === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected';
    }

    return this.buildResourceInfo({
      fileName: this.resourceForm.fileName,
      fileType: this.resourceForm.fileType,
      fileSize: this.resourceForm.fileSize,
      kind: this.resourceForm.displayType,
      pageCount: this.resourceForm.pageCount ?? undefined
    });
  }

  buildResourceInfo(details?: ResourceDetails | null): string {
    if (!details) {
      return this.currentLang === 'ar' ? 'الملف: غير محدد' : 'File: N/A';
    }

    const parts: string[] = [];
    const separator = this.currentLang === 'ar' ? '، ' : ', ';
    const labelPages = this.currentLang === 'ar' ? 'الصفحات' : 'Pages';
    const labelSize = this.currentLang === 'ar' ? 'الحجم' : 'Size';
    const labelFile = this.currentLang === 'ar' ? 'الملف' : 'File';
    const labelType = this.currentLang === 'ar' ? 'النوع' : 'Type';

    if (details.pageCount !== undefined && details.pageCount !== null) {
      parts.push(`${labelPages}: ${details.pageCount}`);
    }

    if (details.fileSize) {
      parts.push(`${labelSize}: ${this.formatFileSize(details.fileSize)}`);
    }

    const fileName = details.fileName || (this.currentLang === 'ar' ? 'بدون اسم' : 'Untitled');
    parts.push(`${labelFile}: ${fileName}`);

    const typeLabel = this.getResourceDisplayLabel(details);
    if (typeLabel) {
      parts.push(`${labelType}: ${typeLabel}`);
    }

    return parts.filter(Boolean).join(separator);
  }

  private async populateExistingResourceMetadata(item: ContentItem, displayType: ResourceDisplayType): Promise<void> {
    const details = item.resourceDetails;
    if (!details?.dataUrl) {
      return;
    }

    try {
      const arrayBuffer = await this.base64ToArrayBuffer(details.dataUrl);
      const extras = await this.extractResourceMetadataFromArrayBuffer(arrayBuffer, displayType, {
        fileName: details.fileName,
        mimeType: details.fileType
      });

      let updated = false;
      if (extras.pageCount !== undefined && extras.pageCount !== null && details.pageCount !== extras.pageCount) {
        details.pageCount = extras.pageCount;
        updated = true;
      }

      if (updated) {
        this.saveSections();
        const legacyIndex = this.contentItems.findIndex(ci => ci.id === item.id);
        if (legacyIndex !== -1) {
          this.contentItems[legacyIndex] = {
            ...this.contentItems[legacyIndex],
            resourceDetails: {
              ...this.contentItems[legacyIndex].resourceDetails,
              ...details
            }
          };
          const userId = this.student?.id || this.student?.user_id;
          const draft = this.ai.getDraft(userId);
          this.ai.saveDraft({
            ...draft,
            content_items: this.contentItems
          }, userId);
        }
      }
    } catch (error) {
      console.warn('Failed to populate metadata for existing resource', item.title, error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  getResourceDisplayLabelFromForm(): string {
    if (!this.resourceForm.fileName) {
      return this.currentLang === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected';
    }

    return this.getResourceDisplayLabel({
      fileName: this.resourceForm.fileName,
      fileType: this.resourceForm.fileType,
      fileSize: this.resourceForm.fileSize,
      kind: this.resourceForm.displayType
    });
  }

  onCourseCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file || this.courseCoverUploading) {
      if (input) {
        input.value = '';
      }
      return;
    }

    this.courseCoverUploadError = null;
    this.courseCoverUploadProgress = 0;
    this.courseCoverUploading = true;
    this.courseCoverDeleting = false;
    this.coverImageLoaded = false;
    this.cdr.markForCheck();

    const userId = this.student?.id || this.student?.user_id;

    this.ai.uploadDraftCover(file).subscribe({
      next: (uploadEvent) => {
        if (uploadEvent.type === HttpEventType.UploadProgress) {
          if (uploadEvent.total) {
            const percent = Math.round((uploadEvent.loaded / uploadEvent.total) * 100);
            this.courseCoverUploadProgress = Math.min(99, percent);
          } else {
            this.courseCoverUploadProgress = Math.max(this.courseCoverUploadProgress, 15);
          }
          this.cdr.markForCheck();
        } else if (uploadEvent.type === HttpEventType.Response) {
          this.courseCoverUploadProgress = 100;
          this.courseCoverUploading = false;
          this.coverImageLoaded = false;
          if (uploadEvent.body) {
            this.handleDraftCourseResponse(uploadEvent.body, userId);
          }
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Cover upload failed:', error);
        this.courseCoverUploading = false;
        this.courseCoverUploadProgress = 0;
        this.coverImageLoaded = false;
        this.courseCoverUploadError = this.getCoverUploadErrorMessage(error);
        this.cdr.detectChanges();
      }
    });

    if (input) {
      input.value = '';
    }
  }

  removeCourseCover(): void {
    if (this.courseCoverUploading) {
      return;
    }

    this.courseCoverUploadError = null;
    this.courseCoverUploadProgress = 0;
    this.courseCoverUploading = true;
    this.courseCoverDeleting = true;
    this.coverImageLoaded = false;
    this.cdr.markForCheck();

    const userId = this.student?.id || this.student?.user_id;

    this.ai.deleteDraftCover().subscribe({
      next: (response) => {
        this.courseCoverUploading = false;
        this.courseCoverDeleting = false;
        this.courseCoverUploadProgress = 100;
        if (response) {
          this.handleDraftCourseResponse(response, userId);
        } else {
          this.courseCoverPreview = null;
          this.saveCourseCoverToDraft();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Cover deletion failed:', error);
        this.courseCoverUploading = false;
        this.courseCoverDeleting = false;
        this.courseCoverUploadProgress = 0;
        this.coverImageLoaded = false;
        this.courseCoverUploadError = this.resolveErrorMessage(
          error,
          'Failed to delete cover image. Please try again.',
          'فشل في حذف صورة الغلاف. يرجى المحاولة مرة أخرى.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  private saveCourseCoverToDraft(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    this.ai.saveDraft({
      ...draft,
      cover_image_url: this.courseCoverPreview ?? null
    }, userId);
  }

  confirmDeleteCover(): void {
    if (!this.hasCustomCourseCover || this.courseCoverUploading) {
      this.showDeleteCoverModal = false;
      return;
    }

    this.showDeleteCoverModal = false;
    this.removeCourseCover();
  }

  onCoverImageLoad(): void {
    this.coverImageLoaded = true;
  }

  onCoverImageError(): void {
    this.coverImageLoaded = false;
  }

  formatContentDate(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const locale = this.currentLang === 'ar' ? 'ar' : 'en';

    const sameDay = date.toDateString() === now.toDateString();

    const startOfWeek = new Date(now);
    const currentWeekday = startOfWeek.getDay();
    const daysFromMonday = currentWeekday === 0 ? 6 : currentWeekday - 1; // Monday as start
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);

    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);

    const formatTime = (): string => new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

    const formatDayName = (): string => new Intl.DateTimeFormat(locale, {
      weekday: 'long'
    }).format(date);

    const formatDayMonth = (): string => new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric'
    }).format(date);

    if (sameDay) {
      return formatTime();
    } else if (date >= startOfWeek && date < startOfNextWeek) {
      return `${formatDayName()} • ${formatTime()}`;
    }

    return formatDayMonth();
  }

  private normalizeAssetUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) {
      return null;
    }

    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString();
    } catch (_error) {
      const sanitized = url.split('?')[0]?.trim();
      return sanitized || null;
    }
  }

  private extractKeyFromUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      return path || null;
    } catch (_error) {
      try {
        const sanitized = decodeURIComponent(url.split('?')[0] || '');
        return sanitized.replace(/^\/+/, '') || null;
      } catch (_inner) {
        return null;
      }
    }
  }

  private extractImageKeysFromHtml(html: string | null | undefined): Set<string> {
    const keys = new Set<string>();

    if (!html || !html.trim()) {
      return keys;
    }

    if (typeof document === 'undefined') {
      // Unable to parse safely outside the browser environment
      return keys;
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    const images = Array.from(container.querySelectorAll('img'));
    for (const img of images) {
      const dataKey = img.getAttribute('data-asset-key');
      if (dataKey && dataKey.trim()) {
        keys.add(dataKey.trim());
        continue;
      }

      const src = img.getAttribute('src');
      if (!src) {
        continue;
      }

      const normalizedUrl = this.normalizeAssetUrl(src);
      const mappedKey = normalizedUrl ? this.editorKnownImageMap.get(normalizedUrl) : null;
      if (mappedKey) {
        keys.add(mappedKey);
        continue;
      }

      const extracted = this.extractKeyFromUrl(src);
      if (extracted) {
        keys.add(extracted);
        if (normalizedUrl) {
          this.editorKnownImageMap.set(normalizedUrl, extracted);
        }
      }
    }

    return keys;
  }

  private handleRemovedEditorImageKeys(keys: string[]): void {
    if (!keys.length) {
      return;
    }

    const uniqueKeys = Array.from(new Set(keys));

    this.ai.deleteDraftContentImages(uniqueKeys).subscribe({
      next: () => {
        for (const key of uniqueKeys) {
          this.pendingImageUploads.delete(key);
          this.editorDeletedImageKeys.add(key);

          for (const [url, mappedKey] of Array.from(this.editorKnownImageMap.entries())) {
            if (mappedKey === key) {
              this.editorKnownImageMap.delete(url);
            }
          }
        }
      },
      error: (error: unknown) => {
        console.error('Failed to delete editor images:', error);
      }
    });
  }

  private setupEditorImageTracking(editor: DecoupledEditor): void {
    this.ensureCurrentEditingContentId();

    const syncImageState = () => {
      const html = editor.getData() ?? '';
      const currentKeys = this.extractImageKeysFromHtml(html);
      const previousKeys = new Set(this.editorActiveImageKeys);

      this.editorActiveImageKeys = new Set(currentKeys);

      // Keys currently present should be considered active again
      this.editorActiveImageKeys.forEach((key) => this.editorDeletedImageKeys.delete(key));

      const removedKeys: string[] = [];
      previousKeys.forEach((key) => {
        if (!this.editorActiveImageKeys.has(key) && !this.editorDeletedImageKeys.has(key)) {
          removedKeys.push(key);
        }
      });

      if (removedKeys.length) {
        this.handleRemovedEditorImageKeys(removedKeys);
      }
    };

    syncImageState();

    editor.model.document.on('change:data', () => {
      if (this.editorImageChangeDebounce !== null) {
        clearTimeout(this.editorImageChangeDebounce);
      }

      const schedule = typeof window !== 'undefined' && window.setTimeout ? window.setTimeout.bind(window) : setTimeout;
      this.editorImageChangeDebounce = schedule(() => {
        this.editorImageChangeDebounce = null;
        syncImageState();
      }, 250) as unknown as number;
    });
  }

  private deleteImagesFromHtml(_html: string | null | undefined): void {
    // No-op: the backend now owns deletion for whole content removal.
  }

  private markImageAsUploading(editor: DecoupledEditor, imageUrl: string): void {
    if (!editor) return;
    
    const markImages = () => {
      const editableElement = editor.ui.getEditableElement();
      if (!editableElement) return;
      
      // Find all images, especially blob URLs (which are temporary during upload)
      const images = editableElement.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        // Check if this is a blob URL (temporary during upload) or matches our tracking
        if (src.startsWith('blob:') || this.uploadingImageUrls.has(src) || src === imageUrl) {
          if (!img.classList.contains('ck-image-uploading')) {
            img.classList.add('ck-image-uploading');
            // Add wrapper if not already wrapped
            if (!img.parentElement?.classList.contains('ck-image-upload-wrapper')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'ck-image-upload-wrapper';
              img.parentNode?.insertBefore(wrapper, img);
              wrapper.appendChild(img);
            }
          }
        }
      });
    };
    
    // Try immediately and also after a short delay to catch images that are being inserted
    markImages();
    setTimeout(markImages, 50);
    setTimeout(markImages, 200);
    setTimeout(markImages, 500);
  }

  private removeImageUploadingState(editor: DecoupledEditor, imageUrl: string): void {
    if (!editor) return;
    
    const editableElement = editor.ui.getEditableElement();
    if (!editableElement) return;
    
    // Find and remove loading state from the image
    const images = editableElement.querySelectorAll('img');
    images.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src === imageUrl || src.includes(imageUrl)) {
        img.classList.remove('ck-image-uploading');
        // Remove wrapper if it exists
        const wrapper = img.parentElement;
        if (wrapper?.classList.contains('ck-image-upload-wrapper')) {
          wrapper.parentNode?.insertBefore(img, wrapper);
          wrapper.remove();
        }
        this.uploadingImageUrls.delete(src);
      }
    });
    
    // Also check blob URLs that might have been replaced
    const blobImages = editableElement.querySelectorAll('img[src^="blob:"]');
    blobImages.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (this.uploadingImageUrls.has(src)) {
        img.classList.remove('ck-image-uploading');
        const wrapper = img.parentElement;
        if (wrapper?.classList.contains('ck-image-upload-wrapper')) {
          wrapper.parentNode?.insertBefore(img, wrapper);
          wrapper.remove();
        }
        this.uploadingImageUrls.delete(src);
      }
    });
  }

  private removeAllImageUploadingStates(editor: DecoupledEditor): void {
    if (!editor) return;
    
    const editableElement = editor.ui.getEditableElement();
    if (!editableElement) return;
    
    const images = editableElement.querySelectorAll('img.ck-image-uploading');
    images.forEach((img) => {
      img.classList.remove('ck-image-uploading');
      const wrapper = img.parentElement;
      if (wrapper?.classList.contains('ck-image-upload-wrapper')) {
        wrapper.parentNode?.insertBefore(img, wrapper);
        wrapper.remove();
      }
    });
    
    this.uploadingImageUrls.clear();
  }

  private generateDraftContentId(): string {
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private ensureCurrentEditingContentId(): string {
    if (this.currentEditingContentId && this.currentEditingContentId.trim()) {
      return this.currentEditingContentId;
    }

    if (this.viewingContentItem?.id) {
      this.currentEditingContentId = this.viewingContentItem.id;
      return this.currentEditingContentId;
    }

    const generated = this.generateDraftContentId();
    this.currentEditingContentId = generated;
    return generated;
  }

  private pendingEditorData: string | null = null;

  private hasActiveEditorUploads(): boolean {
    if (!this.currentEditor) {
      return false;
    }

    try {
      const repository: any = this.currentEditor.plugins.get('FileRepository');
      if (!repository || !repository.loaders) {
        return false;
      }

      const rawLoaders = Array.from(
        typeof repository.loaders.values === 'function'
          ? repository.loaders.values()
          : repository.loaders
      );

      return rawLoaders.some((entry: any) => {
        const loader = Array.isArray(entry) ? entry[1] ?? entry[0] : entry;
        if (!loader) {
          return false;
        }

        const status = String(loader.status ?? loader.state ?? '').toLowerCase();
        if (status) {
          return !['idle', 'uploaded', 'complete', 'finished', 'success'].includes(status);
        }

        const uploaded = Number(loader.uploaded ?? loader.uploadedTotal ?? 0);
        const total = Number(loader.uploadTotal ?? loader.total ?? 0);
        return total > 0 && uploaded < total;
      });
    } catch (_error) {
      return false;
    }
  }

  getContentStatusLabel(item: ContentItem | null | undefined): string {
    const state = this.resolveContentStatusState(item?.status);
    switch (state) {
      case 'waiting':
        return this.currentLang === 'ar' ? 'قيد الانتظار' : 'Waiting';
      case 'failed':
        return this.currentLang === 'ar' ? 'فشل' : 'Failed';
      default:
        return this.currentLang === 'ar' ? 'جاهز' : 'Ready';
    }
  }

  getContentStatusClasses(item: ContentItem | null | undefined): string {
    const state = this.resolveContentStatusState(item?.status);
    return `status-${state}`;
  }

  isContentStatusFailed(item: ContentItem | null | undefined): boolean {
    return this.resolveContentStatusState(item?.status) === 'failed';
  }

  private resolveContentStatusState(status: unknown): 'waiting' | 'success' | 'failed' {
    if (typeof status === 'boolean') {
      return status ? 'success' : 'waiting';
    }

    if (status === null || typeof status === 'undefined') {
      return 'success';
    }

    const normalized = String(status).trim().toLowerCase();
    if (!normalized) {
      return 'success';
    }

    if (['waiting', 'pending', 'processing', 'draft', 'queued', 'queue', 'in_progress', 'in-progress', 'false', '0', 'no'].includes(normalized)) {
      return 'waiting';
    }

    if (['failed', 'error', 'rejected', 'cancelled', 'canceled'].includes(normalized)) {
      return 'failed';
    }

    return 'success';
  }

  toggleContentStatus(sectionId: string, contentId: string, event: Event): void {
    event.stopPropagation();

    const section = this.sections.find(s => s.id === sectionId);
    if (!section) {
      return;
    }

    const itemIndex = section.content_items.findIndex(item => item.id === contentId);
    if (itemIndex === -1) {
      return;
    }

    const currentItem = section.content_items[itemIndex];
    const previousState = { ...currentItem };
    const nextStatus = !this.isContentStatusActive(currentItem);
    const timestamp = new Date().toISOString();

    const updatedItem: ContentItem = {
      ...currentItem,
      status: nextStatus,
      updatedAt: timestamp
    };

    section.content_items = [
      ...section.content_items.slice(0, itemIndex),
      updatedItem,
      ...section.content_items.slice(itemIndex + 1)
    ];
    section.updatedAt = timestamp;
    this.rebuildLegacyContentItems();
    this.cdr.detectChanges();
    this.setContentStatusPending(contentId, true);

    const numericSectionId = Number(sectionId);
    const numericContentId = Number(contentId);
    if (!Number.isFinite(numericSectionId) || !Number.isFinite(numericContentId)) {
      return;
    }

    const payload: CreateSectionContentPayload = {
      type: currentItem.type,
      title: currentItem.title,
      status: nextStatus,
      position: currentItem.position
    };

    if (currentItem.type === 'text') {
      payload.body_html = currentItem.content ?? '';
    }

    if (currentItem.meta && Object.keys(currentItem.meta).length > 0) {
      payload.meta = currentItem.meta;
    }

    this.ai.updateSectionContent(numericSectionId, numericContentId, payload).subscribe({
      next: (response) => {
        const record = response?.content;
        if (!record) {
          return;
        }

        const mapped = this.mapContentRecordToItem(record);
        section.content_items = [
          ...section.content_items.slice(0, itemIndex),
          mapped,
          ...section.content_items.slice(itemIndex + 1)
        ];
        section.updatedAt = mapped.updatedAt || section.updatedAt;
        this.rebuildLegacyContentItems();
        this.saveSections();
        this.setContentStatusPending(mapped.id, false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to update content status:', error);
        section.content_items = [
          ...section.content_items.slice(0, itemIndex),
          previousState,
          ...section.content_items.slice(itemIndex + 1)
        ];
        section.updatedAt = previousState.updatedAt || section.updatedAt;
        this.rebuildLegacyContentItems();
        this.saveSections();
        this.setContentStatusPending(contentId, false);
        this.cdr.detectChanges();

        const message = this.currentLang === 'ar'
          ? 'تعذر تحديث حالة المحتوى. حاول مرة أخرى.'
          : 'Failed to update the content status. Please try again.';
        this.toastr.error(message);
      }
    });
  }

  isContentStatusActive(item: ContentItem | null | undefined): boolean {
    if (!item) {
      return false;
    }

    return !!item.status;
  }

  isContentStatusWaiting(item: ContentItem | null | undefined): boolean {
    if (!item) {
      return false;
    }

    return this.pendingContentStatus.has(item.id);
  }

  private setContentStatusPending(id: string | null | undefined, pending: boolean): void {
    if (!id) {
      return;
    }

    const key = String(id);
    if (pending) {
      this.pendingContentStatus.add(key);
    } else {
      this.pendingContentStatus.delete(key);
    }
  }

  private pendingContentStatus: Set<string> = new Set<string>();

  // ============= Video Modal Methods =============
  
  private createDefaultVideoForm(): VideoFormState {
    return {
      source: null,
      title: '',
      description: '',
      file: null,
      fileName: undefined,
      fileSize: undefined,
      dataUrl: undefined,
      youtubeUrl: '',
      youtubeData: null,
      metadata: undefined
    };
  }

  openVideoModal(): void {
    this.resetVideoForm();
    this.showVideoModal = true;
    this.viewingVideoContent = false;
    this.videoContentItem = null;
    this.selectedContentType = 'video';
    this.cdr.detectChanges();
  }

  closeVideoModal(): void {
    if (this.videoUploadInProgress && !confirm(this.currentLang === 'ar' ? 'هل أنت متأكد؟ سيتم إلغاء الرفع الجاري.' : 'Are you sure? The upload in progress will be cancelled.')) {
      return;
    }
    this.showVideoModal = false;
    this.selectedContentType = null;
    this.resetVideoForm();
    this.cdr.detectChanges();
  }

  private resetVideoForm(): void {
    this.videoForm = this.createDefaultVideoForm();
    this.videoUploadError = null;
    this.videoUploadInProgress = false;
    this.videoUploadProgress = 0;
    this.youtubeError = null;
    this.fetchingYouTubeData = false;
    this.savingVideo = false;
    this.deletingVideo = false;
    // Reset AI Search
    this.youtubeSearchQuery = '';
    this.searchingYoutube = false;
    this.youtubeSearchResults = [];
    this.youtubeSearchError = null;
  }

  searchYoutubeAI(): void {
    if (!this.youtubeSearchQuery || !this.youtubeSearchQuery.trim()) return;
    
    this.searchingYoutube = true;
    this.youtubeSearchError = null;
    this.youtubeSearchResults = [];
    
    this.http.post<{ videos: any[] }>(`${this.baseUrl}/ai/youtube/search`, { 
      query: this.youtubeSearchQuery,
      locale: this.currentLang 
    }).subscribe({
      next: (response) => {
        this.searchingYoutube = false;
        this.youtubeSearchResults = response.videos || [];
        if (this.youtubeSearchResults.length === 0) {
          this.youtubeSearchError = this.currentLang === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('YouTube search error', err);
        this.searchingYoutube = false;
        this.youtubeSearchError = this.currentLang === 'ar' ? 'حدث خطأ أثناء البحث' : 'Error searching YouTube';
        this.cdr.detectChanges();
      }
    });
  }

  selectYoutubeResult(result: any): void {
    this.videoForm.youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
    this.youtubeSearchResults = [];
    this.youtubeSearchQuery = '';
    this.fetchYouTubeMetadata();
  }

  selectVideoSource(source: VideoSource): void {
    this.videoForm.source = source;
    this.videoUploadError = null;
    this.youtubeError = null;
    
    if (source === 'youtube') {
      // Pre-fill with title from YouTube if available
      if (this.videoForm.youtubeData) {
        this.videoForm.title = this.videoForm.youtubeData.title;
        this.videoForm.description = this.videoForm.youtubeData.description.substring(0, 500);
      }
    }
    this.cdr.detectChanges();
  }

  resetVideoSource(): void {
    this.videoForm.source = null;
    this.videoForm.file = null;
    this.videoForm.fileName = undefined;
    this.videoForm.fileSize = undefined;
    this.videoForm.dataUrl = undefined;
    this.videoForm.youtubeUrl = '';
    this.videoForm.youtubeData = null;
    this.videoForm.metadata = undefined;
    this.videoUploadError = null;
    this.youtubeError = null;
    this.cdr.detectChanges();
  }

  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    
    // Validate file type
    const isValidType = this.VIDEO_ACCEPTED_FORMATS.some(format => {
      if (format.startsWith('.')) {
        return file.name.toLowerCase().endsWith(format);
      }
      return file.type === format;
    });
    
    if (!isValidType) {
      this.videoUploadError = this.currentLang === 'ar' 
        ? 'نوع الملف غير مدعوم. الصيغ المسموح بها: MP4, AVI.'
        : 'Unsupported file type. Allowed formats are MP4, AVI.';
      return;
    }
    
    // Validate file size
    if (file.size > this.VIDEO_MAX_SIZE) {
      this.videoUploadError = this.currentLang === 'ar'
        ? 'الملف كبير جدًا. الحد الأقصى 100 ميجابايت.'
        : 'File is too large. Maximum allowed size is 100 MB.';
      return;
    }
    
    this.videoUploadError = null;
    this.videoForm.file = file;
    this.videoForm.fileName = file.name;
    this.videoForm.fileSize = file.size;
    
    // Extract video metadata
    this.extractVideoMetadata(file);
    
    // Reset input
    input.value = '';
    this.cdr.detectChanges();
  }

  private extractVideoMetadata(file: File): void {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const duration = Math.floor(video.duration);
      this.videoForm.metadata = {
        duration: duration,
        durationFormatted: this.formatDuration(duration),
        width: video.videoWidth,
        height: video.videoHeight
      };
      
      // Create thumbnail from video
      video.currentTime = Math.min(1, duration / 10); // Get frame at 10% or 1 second
      this.cdr.detectChanges();
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (this.videoForm.metadata) {
          this.videoForm.metadata.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        }
      }
      URL.revokeObjectURL(video.src);
      this.cdr.detectChanges();
    };
    
    video.src = URL.createObjectURL(file);
  }

  removeVideoFile(): void {
    this.videoForm.file = null;
    this.videoForm.fileName = undefined;
    this.videoForm.fileSize = undefined;
    this.videoForm.dataUrl = undefined;
    this.videoForm.metadata = undefined;
    this.videoUploadError = null;
    this.cdr.detectChanges();
  }

  validateYouTubeUrl(): void {
    const url = this.videoForm.youtubeUrl.trim();
    if (!url) {
      this.youtubeError = null;
      return;
    }
    
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(url)) {
      this.youtubeError = this.currentLang === 'ar'
        ? 'رابط يوتيوب غير صالح. يرجى إدخال رابط صحيح.'
        : 'Invalid YouTube URL. Please enter a valid YouTube link.';
    } else {
      this.youtubeError = null;
    }
  }

  fetchYouTubeMetadata(): void {
    const url = this.videoForm.youtubeUrl.trim();
    if (!url || this.youtubeError) {
      return;
    }
    
    // Extract video ID from URL
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) {
      this.youtubeError = this.currentLang === 'ar'
        ? 'لا يمكن استخراج معرف الفيديو من الرابط.'
        : 'Could not extract video ID from URL.';
      return;
    }
    
    this.fetchingYouTubeData = true;
    this.youtubeError = null;
    
    // Call backend API to fetch YouTube metadata
    const apiUrl = `${this.baseUrl}/courses/youtube/metadata?videoId=${videoId}`;
    
    this.http.get<any>(apiUrl).subscribe({
      next: (response) => {
        // Parse ISO 8601 duration (e.g., PT1H2M10S) to seconds
        const duration = this.parseYouTubeDuration(response.duration);
        
        this.videoForm.youtubeData = {
          videoId: response.videoId,
          title: response.title,
          description: response.description,
          duration: duration,
          thumbnail: response.thumbnail,
          embedUrl: response.embedUrl
        };
        
        // Auto-fill title and description
        this.videoForm.title = this.videoForm.youtubeData.title;
        this.videoForm.description = this.videoForm.youtubeData.description.substring(0, 500);
        
        this.fetchingYouTubeData = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('YouTube API error:', error);
        this.youtubeError = error.error?.error || (this.currentLang === 'ar'
          ? 'حدث خطأ أثناء جلب بيانات الفيديو. يرجى المحاولة مرة أخرى.'
          : 'Error fetching video data. Please try again.');
        this.fetchingYouTubeData = false;
        this.cdr.detectChanges();
      }
    });
  }

  private extractYouTubeVideoId(url: string): string | null {
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

  private parseYouTubeDuration(duration: string): number {
    // Parse ISO 8601 duration format (e.g., PT1H2M10S, PT15M33S, PT43S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) {
      return 0;
    }
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getYouTubeSafeUrl(embedUrl: string | unknown): SafeResourceUrl {
    const url = typeof embedUrl === 'string' ? embedUrl : '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  canSaveVideo(): boolean {
    if (!this.videoForm.source) {
      return false;
    }
    
    if (!this.videoForm.title.trim()) {
      return false;
    }
    
    if (this.videoForm.source === 'local') {
      return !!this.videoForm.file;
    }
    
    if (this.videoForm.source === 'youtube') {
      return !!this.videoForm.youtubeData && !this.youtubeError;
    }
    
    return false;
  }

  async saveVideoContent(): Promise<void> {
    if (!this.canSaveVideo() || this.savingVideo || !this.activeSectionId) {
      return;
    }
    
    this.savingVideo = true;
    
    try {
      // Prepare initial metadata for the database
      const meta: Record<string, unknown> = {
        source: this.videoForm.source,
        title: this.videoForm.title.trim()
      };
      
      // Add description only if provided
      if (this.videoForm.description.trim()) {
        meta['description'] = this.videoForm.description.trim();
      }
      
      if (this.videoForm.source === 'youtube' && this.videoForm.youtubeData) {
        // Add YouTube metadata
        meta['provider'] = 'youtube';
        meta['url'] = this.videoForm.youtubeUrl;
        meta['youtubeVideoId'] = this.videoForm.youtubeData.videoId;
        meta['youtubeEmbedUrl'] = this.videoForm.youtubeData.embedUrl;
        meta['duration'] = this.videoForm.youtubeData.duration;
        meta['durationFormatted'] = this.formatDuration(this.videoForm.youtubeData.duration);
        meta['thumbnail'] = this.videoForm.youtubeData.thumbnail;
      } else if (this.videoForm.source === 'local' && this.videoForm.file) {
        // Add basic local video metadata (before upload)
        meta['provider'] = 'local';
        meta['fileName'] = this.videoForm.fileName;
        meta['fileSize'] = this.videoForm.fileSize;
        
        if (this.videoForm.metadata) {
          meta['duration'] = this.videoForm.metadata.duration;
          meta['durationFormatted'] = this.videoForm.metadata.durationFormatted;
        }
      }
      
      // Create content record first to get content ID
      const payload: CreateSectionContentPayload = {
        type: 'video',
        title: this.videoForm.title.trim(),
        body_html: undefined,
        meta: meta,
        status: true
      };
      
      const response = await this.ai.createSectionContent(this.activeSectionId, payload).toPromise();
      
      if (!response || !response.content) {
        throw new Error('Failed to create video content record');
      }
      
      const contentId = response.content.id;
      
      // Now upload video file with content ID for proper folder structure
      if (this.videoForm.source === 'local' && this.videoForm.file) {
        this.videoUploadInProgress = true;
        this.videoUploadProgress = 0;
        this.cdr.detectChanges();
        
        // Subscribe to upload progress
        const progressSub = this.videoUploadService.getUploadProgress().subscribe(progress => {
          this.videoUploadProgress = Math.min(99, Math.max(10, progress));
          this.cdr.detectChanges();
        });
        
        // Set initial progress to ensure overlay is visible
        this.videoUploadProgress = 5;
        
        const metadata = this.videoForm.metadata;
        const uploadResponse = await new Promise<any>((resolve, reject) => {
          this.videoUploadService.uploadVideo(
            this.videoForm.file!,
            contentId, // Use content ID for folder structure
            metadata ? {
              duration: metadata.duration,
              width: metadata.width,
              height: metadata.height
            } : undefined
          ).subscribe({
            next: (response) => {
              progressSub.unsubscribe();
              this.videoUploadProgress = 100;
              this.cdr.detectChanges();
              resolve(response);
            },
            error: (error) => {
              progressSub.unsubscribe();
              this.videoUploadInProgress = false;
              this.videoUploadProgress = 0;
              this.cdr.detectChanges();
              
              // Handle specific error cases
              if (error.status === 413) {
                this.videoUploadError = this.currentLang === 'ar' 
                  ? 'حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت'
                  : 'File size too large. Maximum 100 MB allowed';
              } else {
                this.videoUploadError = this.currentLang === 'ar'
                  ? 'حدث خطأ أثناء رفع الفيديو'
                  : 'Error uploading video';
              }
              
              reject(error);
            }
          });
        });
        
        // Update content record with S3 URL
        const updatedMeta = { ...meta };
        updatedMeta['dataUrl'] = uploadResponse.asset.url;
        
        const updatePayload: CreateSectionContentPayload = {
          type: 'video',
          title: this.videoForm.title.trim(),
          body_html: undefined,
          meta: updatedMeta,
          status: true
        };
        
        await this.ai.updateSectionContent(this.activeSectionId, contentId, updatePayload).toPromise();
        
        this.videoUploadInProgress = false;
        this.videoUploadProgress = 100;
      }
      
      // Get the final content record (with updated metadata if video was uploaded)
      let finalContentRecord = response.content;
      if (this.videoForm.source === 'local' && this.videoForm.file) {
        // Fetch updated record after S3 URL was added
        const updatedResponse = await this.ai.getSectionContent(this.activeSectionId).toPromise();
        if (updatedResponse && updatedResponse.content) {
          finalContentRecord = updatedResponse.content.find(c => c.id === contentId) || finalContentRecord;
        }
      }
      
      if (finalContentRecord) {
        // Convert SectionContentRecord to ContentItem
        const contentItem: ContentItem = {
          id: String(finalContentRecord.id),
          type: finalContentRecord.type as 'video' | 'resources' | 'text' | 'audio' | 'quiz',
          title: finalContentRecord.title,
          section_id: String(finalContentRecord.section_id),
          status: Boolean(finalContentRecord.status),
          meta: finalContentRecord.meta || {},
          createdAt: finalContentRecord.created_at,
          updatedAt: finalContentRecord.updated_at
        };
        
        // Add to local content items
        this.contentItems.push(contentItem);
        
        // Update sections
        const section = this.sections.find(s => s.id === this.activeSectionId);
        if (section) {
          if (!section.content_items) {
            section.content_items = [];
          }
          section.content_items.push(contentItem);
        }
      }
      
      // Close modal
      this.showVideoModal = false;
      this.resetVideoForm();
      
      this.toastr.success(
        this.currentLang === 'ar' ? 'تم حفظ الفيديو بنجاح' : 'Video saved successfully'
      );
    } catch (error) {
      console.error('Error saving video:', error);
      this.toastr.error(
        this.currentLang === 'ar' ? 'حدث خطأ أثناء حفظ الفيديو' : 'Error saving video'
      );
    } finally {
      this.savingVideo = false;
      this.videoUploadInProgress = false;
      this.cdr.detectChanges();
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  deleteVideoContent(): void {
    if (!this.videoContentItem || this.deletingVideo) {
      return;
    }
    
    // Use the same warning modal system as other content
    this.itemToDelete = this.videoContentItem.id;
    this.warningModalType = 'deleteContent';
    this.showWarningModal = true;
  }

  // ============= Audio Modal Methods =============
  
  private createDefaultAudioForm(): AudioFormState {
    return {
      source: null,
      title: '',
      description: '',
      file: null,
      fileName: '',
      fileSize: 0,
      metadata: null,
      textSource: 'lesson', // Default to selecting a lesson
      selectedTextLessonId: null,
      selectedTextLesson: null,
      textContent: '',
      voice: 'alloy',
      speed: 1.0
    };
  }

  private resetAudioForm(): void {
    this.audioForm = this.createDefaultAudioForm();
    this.audioUploadError = null;
    this.audioUploadInProgress = false;
    this.audioUploadProgress = 0;
    this.generatingAudio = false;
    this.audioGenerationProgress = 0;
  }

  openAudioModal(contentType: 'audio'): void {
    this.selectedContentType = contentType;
    this.resetAudioForm();
    this.viewingAudioContent = false;
    this.audioContentItem = null;
    this.showAudioModal = true;
  }

  openAudioContentModal(item: ContentItem): void {
    console.log('Opening audio modal for item:', item);
    console.log('Audio meta data:', item.meta);
    this.audioContentItem = item;
    this.viewingAudioContent = true;
    this.showAudioModal = true;
  }

  editAudioContent(): void {
    if (!this.audioContentItem) return;
    
    // Switch to edit mode
    this.viewingAudioContent = false;
    
    // Populate the form with existing data
    this.audioForm.title = this.audioContentItem.title;
    this.audioForm.source = 'upload'; // Default to upload for editing
    
    if (this.audioContentItem.meta) {
      const meta = this.audioContentItem.meta as any;
      this.audioForm.metadata = {
        duration: typeof meta.duration === 'number' ? meta.duration : 0,
        durationFormatted: typeof meta.durationFormatted === 'string' ? meta.durationFormatted : undefined,
        fileSize: typeof meta.fileSize === 'number' ? meta.fileSize : undefined,
        fileName: typeof meta.fileName === 'string' ? meta.fileName : undefined
      };
      
      // Set the existing audio URL for preview
      this.audioForm.existingUrl = typeof meta.dataUrl === 'string' ? meta.dataUrl : undefined;
    }
  }

  openContentItem(item: ContentItem): void {
    if (item.type === 'quiz') {
      this.currentQuizId = item.id;
      this.openQuizEditor();
    } else if (item.type === 'video') {
      this.videoContentItem = item;
      this.viewingVideoContent = true;
      this.showVideoModal = true;
    } else if (item.type === 'audio') {
      this.openAudioContentModal(item);
    } else if (item.type === 'resources') {
      // Handle resource modal opening if needed
      // For now, resources might not have a preview modal
    } else {
      this.viewContentItem(item);
    }
  }

  closeAudioModal(): void {
    this.showAudioModal = false;
    this.viewingAudioContent = false;
    this.audioContentItem = null;
    this.resetAudioForm();
  }

  selectAudioSource(source: AudioSource): void {
    this.audioForm.source = source;
    this.audioUploadError = null;

    if (source === 'convert') {
      this.getTextLessons();
    }
  }

  resetAudioSource(): void {
    this.audioForm.source = null;
    this.audioUploadError = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('dragover');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('dragover');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('dragover');
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const customEvent = { target: { files: files } } as unknown as Event;
      this.onAudioFileSelected(customEvent);
    }
  }

  onAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    const isValidType = this.AUDIO_ACCEPTED_FORMATS.some(format => 
      format.startsWith('.') ? file.name.toLowerCase().endsWith(format) : file.type === format
    );

    if (!isValidType) {
      this.audioUploadError = this.currentLang === 'ar'
        ? 'نوع الملف غير مدعوم. يرجى اختيار ملف صوتي صالح (MP3, WAV, M4A, OGG)'
        : 'Unsupported file type. Please select a valid audio file (MP3, WAV, M4A, OGG)';
      return;
    }

    // Validate file size
    if (file.size > this.AUDIO_MAX_SIZE) {
      this.audioUploadError = this.currentLang === 'ar'
        ? `حجم الملف كبير جداً. الحد الأقصى ${Math.round(this.AUDIO_MAX_SIZE / (1024 * 1024))} ميجابايت`
        : `File size too large. Maximum ${Math.round(this.AUDIO_MAX_SIZE / (1024 * 1024))} MB allowed`;
      return;
    }

    this.audioForm.file = file;
    this.audioForm.fileName = file.name;
    this.audioForm.fileSize = file.size;
    this.audioUploadError = null;

    // Extract audio metadata
    this.audioUploadService.extractAudioMetadata(file)
      .then(metadata => {
        this.audioForm.metadata = {
          duration: metadata.duration,
          durationFormatted: this.formatDuration(metadata.duration),
          fileSize: file.size,
          fileName: file.name,
          bitrate: metadata.bitrate,
          sampleRate: metadata.sampleRate
        };
        this.cdr.detectChanges();
      })
      .catch(error => {
        console.error('Failed to extract audio metadata:', error);
        this.audioForm.metadata = {
          duration: 0,
          durationFormatted: '0:00',
          fileSize: file.size,
          fileName: file.name
        };
        this.cdr.detectChanges();
      });
  }

  canSaveAudio(): boolean {
    if (!this.audioForm.source) {
      return false;
    }
    
    if (!this.audioForm.title.trim()) {
      return false;
    }
    
    if (this.audioForm.source === 'upload') {
      return !!this.audioForm.file;
    }
    
    if (this.audioForm.source === 'convert') {
      return !!this.audioForm.selectedTextLessonId || !!this.audioForm.textContent.trim();
    }
    
    return false;
  }

  textLessons: ContentItem[] = [];
  textLessonsLoading = false;

  getTextLessons(): void {
    if (!this.activeSectionId) return;

    this.textLessonsLoading = true;
    this.cdr.detectChanges();
    this.audioUploadService.getTextLessons(this.activeSectionId).subscribe({
      next: (response) => {
        this.textLessons = response.lessons;
        this.textLessonsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to fetch text lessons:', error);
        this.toastr.error(this.currentLang === 'ar' ? 'فشل في جلب الدروس النصية' : 'Failed to fetch text lessons');
        this.textLessonsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectTextLesson(lesson: ContentItem): void {
    this.audioForm.selectedTextLessonId = lesson.id;
    this.audioForm.selectedTextLesson = lesson;
  }

  deleteAudioContent(): void {
    if (!this.audioContentItem || this.deletingAudio) {
      return;
    }
    
    // Use the same warning modal system as other content
    this.itemToDelete = this.audioContentItem.id;
    this.warningModalType = 'deleteContent';
    this.showWarningModal = true;
  }

  async saveAudioContent(): Promise<void> {
    if (!this.canSaveAudio() || this.savingAudio || !this.activeSectionId) {
      return;
    }
    
    this.savingAudio = true;
    
    try {
      // Prepare initial metadata for the database
      const meta: Record<string, unknown> = {
        source: this.audioForm.source,
        title: this.audioForm.title.trim()
      };
      
      // Add description only if provided
      if (this.audioForm.description.trim()) {
        meta['description'] = this.audioForm.description.trim();
      }

      // Create content record first to get content ID
      const payload: CreateSectionContentPayload = {
        type: 'audio',
        title: this.audioForm.title.trim(),
        body_html: undefined,
        meta: meta,
        status: true
      };
      
      const response = await this.ai.createSectionContent(this.activeSectionId, payload).toPromise();
      
      if (!response || !response.content) {
        throw new Error('Failed to create audio content record');
      }
      
      const contentId = response.content.id;
      let audioUrl: string | undefined;

      // Handle different audio sources
      if (this.audioForm.source === 'upload' && this.audioForm.file) {
        audioUrl = await this.handleAudioUpload(contentId);
      } else if (this.audioForm.source === 'convert') {
        audioUrl = await this.handleTextToAudioConversion(contentId);
      }

      console.log('Audio URL generated:', audioUrl);

      // Update content record with audio URL and metadata
      if (audioUrl) {
        const updatedMeta = { ...meta };
        updatedMeta['provider'] = this.audioForm.source;
        updatedMeta['dataUrl'] = audioUrl;
        
        if (this.audioForm.metadata) {
          updatedMeta['duration'] = this.audioForm.metadata.duration;
          updatedMeta['durationFormatted'] = this.audioForm.metadata.durationFormatted;
          updatedMeta['fileSize'] = this.audioForm.metadata.fileSize;
          updatedMeta['fileName'] = this.audioForm.metadata.fileName;
        }

        const updatePayload: CreateSectionContentPayload = {
          type: 'audio',
          title: this.audioForm.title.trim(),
          body_html: undefined,
          meta: updatedMeta,
          status: true
        };
        
        console.log('Updating audio content with meta:', updatedMeta);
        const updateResult = await this.ai.updateSectionContent(this.activeSectionId, contentId, updatePayload).toPromise();
        console.log('Update result:', updateResult);
      } else {
        console.warn('No audio URL generated, skipping meta update');
      }

      // Get the final content record and update UI
      const updatedResponse = await this.ai.getSectionContent(this.activeSectionId).toPromise();
      if (updatedResponse && updatedResponse.content) {
        const finalContentRecord = updatedResponse.content.find(c => c.id === contentId);
        if (finalContentRecord) {
          const contentItem: ContentItem = {
            id: String(finalContentRecord.id),
            type: finalContentRecord.type as 'audio',
            title: finalContentRecord.title,
            section_id: String(finalContentRecord.section_id),
            status: Boolean(finalContentRecord.status),
            meta: finalContentRecord.meta || {},
            createdAt: finalContentRecord.created_at,
            updatedAt: finalContentRecord.updated_at
          };
          
          this.contentItems.push(contentItem);
          
          const section = this.sections.find(s => s.id === this.activeSectionId);
          if (section) {
            if (!section.content_items) {
              section.content_items = [];
            }
            section.content_items.push(contentItem);
          }
        }
      }

      this.closeAudioModal();
      this.toastr.success(
        this.currentLang === 'ar' ? 'تم حفظ الملف الصوتي بنجاح' : 'Audio saved successfully'
      );

    } catch (error) {
      console.error('Error saving audio content:', error);
      this.toastr.error(
        this.currentLang === 'ar' ? 'حدث خطأ أثناء حفظ الملف الصوتي' : 'Error saving audio content'
      );
    } finally {
      this.savingAudio = false;
      this.audioUploadInProgress = false;
      this.audioUploadProgress = 0;
      this.generatingAudio = false;
      this.audioGenerationProgress = 0;
    }
  }

  private async handleAudioUpload(contentId: number): Promise<string> {
    this.audioUploadInProgress = true;
    this.audioUploadProgress = 0;
    this.cdr.detectChanges();
    
    const progressSub = this.audioUploadService.getUploadProgress().subscribe(progress => {
      this.audioUploadProgress = Math.min(99, Math.max(10, progress));
      this.cdr.detectChanges();
    });
    
    this.audioUploadProgress = 5;
    
    const metadata = this.audioForm.metadata;
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      this.audioUploadService.uploadAudio(
        this.audioForm.file!,
        contentId,
        metadata ? {
          duration: metadata.duration,
          bitrate: metadata.bitrate,
          sampleRate: metadata.sampleRate
        } : undefined
      ).subscribe({
        next: (response) => {
          progressSub.unsubscribe();
          this.audioUploadProgress = 100;
          this.cdr.detectChanges();
          resolve(response);
        },
        error: (error) => {
          progressSub.unsubscribe();
          this.audioUploadInProgress = false;
          this.audioUploadProgress = 0;
          this.cdr.detectChanges();
          
          if (error.status === 413) {
            this.audioUploadError = this.currentLang === 'ar' 
              ? 'حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت'
              : 'File size too large. Maximum 50 MB allowed';
          } else {
            this.audioUploadError = this.currentLang === 'ar'
              ? 'حدث خطأ أثناء رفع الملف الصوتي'
              : 'Error uploading audio file';
          }
          
          reject(error);
        }
      });
    });
    
    this.audioUploadInProgress = false;
    this.audioUploadProgress = 100;
    return uploadResponse.asset.url;
  }

  private async handleTextToAudioConversion(contentId: number): Promise<string> {
    this.generatingAudio = true;
    this.audioGenerationProgress = 0;
    this.cdr.detectChanges();

    const response = await this.audioUploadService.convertTextLessonToAudio(
      Number(this.audioForm.selectedTextLessonId!),
      this.audioForm.voice,
      this.audioForm.speed,
      contentId // Pass content ID for folder structure
    ).toPromise();

    if (!response) {
      throw new Error('Failed to convert text to audio');
    }

    // Update metadata with generated audio info
    this.audioForm.metadata = {
      duration: response.duration,
      durationFormatted: this.formatDuration(response.duration),
      fileSize: response.fileSize,
      fileName: response.fileName
    };

    this.generatingAudio = false;
    this.audioGenerationProgress = 100;
    return response.audioUrl;
  }

  private async handleAudioGeneration(contentId: number): Promise<string> {
    this.generatingAudio = true;
    this.audioGenerationProgress = 0;
    this.cdr.detectChanges();

    const request: AudioGenerationRequest = {
      text: this.audioForm.textContent.trim(),
      voice: this.audioForm.voice,
      speed: this.audioForm.speed
    };

    const response = await this.audioUploadService.generateAudioFromText(request, contentId).toPromise();

    if (!response) {
      throw new Error('Failed to generate audio from text');
    }

    // Update metadata with generated audio info
    this.audioForm.metadata = {
      duration: response.duration,
      durationFormatted: this.formatDuration(response.duration),
      fileSize: response.fileSize,
      fileName: response.fileName
    };

    this.generatingAudio = false;
    this.audioGenerationProgress = 100;
    return response.audioUrl;
  }

  previewCourse(): void {
    if (!this.draftCourseId || !this.router) {
      this.toastr?.warning?.(
        this.currentLang === 'ar' ? 'لم يتم العثور على معرف الدورة' : 'Course ID not found'
      );
      return;
    }

    // Navigate to course preview page
    this.router.navigate(['/student/course-preview', this.draftCourseId]);
  }

  // ============ LESSON BUILDER METHODS ============
  
  openLessonBuilder(item: ContentItem): void {
    try {
      console.log('Opening lesson builder for item:', item);
      this.currentLessonContentId = item.id;
      this.editingLessonTitle = item.title || '';
      this.lessonHint = (item.meta as any)?.hint || '';
      this.selectedBlockId = null;
      this.selectedBlock = null;
      this.showBlockTypeChooser = false;
      this.videoTab = 'youtube-ai';
      
      // Clear YouTube suggestions temporarily - they will be loaded from localStorage
      this.youtubeSuggestions = [];
      this.youtubeSearchQuery = '';
      
      // Update URL with contentId for persistence
      if (item.id) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { contentId: item.id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        
        // Load existing blocks and YouTube suggestions for this content
        this.loadLessonBlocks(item.id);
      }
      
      this.showLessonBuilder = true;
      this.cdr.detectChanges();
      console.log('Lesson builder opened, showLessonBuilder:', this.showLessonBuilder);
    } catch (error) {
      console.error('Error opening lesson builder:', error);
      this.toastr?.error?.(this.currentLang === 'ar' ? 'حدث خطأ في فتح محرر الدرس' : 'Error opening lesson editor');
    }
  }

  closeLessonBuilder(): void {
    // Save blocks before closing
    if (this.currentLessonContentId) {
      this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
    }
    
    // Clear any pending save timeout
    if (this.saveBlocksTimeout) {
      clearTimeout(this.saveBlocksTimeout);
      this.saveBlocksTimeout = null;
    }
    
    this.showLessonBuilder = false;
    this.currentLessonContentId = null;
    this.editingLessonTitle = '';
    this.lessonBlocks = [];
    this.selectedBlockId = null;
    this.selectedBlock = null;
    this.lessonHint = '';
    
    // Remove contentId from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { contentId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    
    this.cdr.detectChanges();
  }

  loadLessonBlocks(contentId: string | number): void {
    try {
      // Find the section that contains this content
      let sectionId: number | string | null = null;
      for (const section of this.sections) {
        if (section.content_items && section.content_items.some(item => String(item.id) === String(contentId))) {
          sectionId = section.id;
          break;
        }
      }

      if (!sectionId) {
        console.warn('Section not found for content:', contentId);
        // Fallback to localStorage only
        this.loadLessonBlocksFromLocalStorage(contentId);
        return;
      }

      // Load blocks from API first
      this.ai.getContentBlocks(sectionId, contentId).subscribe({
        next: (response) => {
          if (response && response.content && Array.isArray(response.content)) {
            // Convert API response to ContentBlock format
            this.lessonBlocks = response.content.map(block => ({
              id: block.id,
              block_type: block.block_type as 'text' | 'video' | 'audio' | 'file',
              title: block.title || '',
              body_html: block.body_html || '',
              asset_id: block.asset_id,
              meta: block.meta || {},
              position: block.position
            }));

            // Save to localStorage for offline access
            this.saveLessonBlocksToLocalStorage(contentId);

            console.log('✅ Loaded lesson blocks from API:', {
              contentId,
              blocksCount: this.lessonBlocks.length,
              blocks: this.lessonBlocks.map(b => ({ id: b.id, type: b.block_type, title: b.title }))
            });
          } else {
            // No blocks in database, try localStorage
            this.loadLessonBlocksFromLocalStorage(contentId);
          }

          // Ensure positions are correct
          this.lessonBlocks.forEach((block, index) => {
            block.position = index + 1;
          });

          // Load YouTube suggestions from localStorage
          this.loadYouTubeSuggestionsFromLocalStorage(contentId);

          // If a video block has a selected YouTube video, ensure it's visible
          const videoBlock = this.lessonBlocks.find(b => b.block_type === 'video' && b.meta && b.meta['youtubeVideoId']);
          if (videoBlock && this.videoTab === 'youtube-ai') {
            console.log('Found video block with selected YouTube video:', videoBlock.meta?.['youtubeVideoId']);
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading blocks from API, falling back to localStorage:', error);
          // Fallback to localStorage
          this.loadLessonBlocksFromLocalStorage(contentId);
        }
      });
    } catch (error) {
      console.error('Error loading lesson blocks:', error);
      this.loadLessonBlocksFromLocalStorage(contentId);
    }
  }

  private loadLessonBlocksFromLocalStorage(contentId: string | number): void {
    const storageKey = `lesson-blocks-${contentId}`;
    const storedBlocks = localStorage.getItem(storageKey);
    
    if (storedBlocks) {
      try {
        this.lessonBlocks = JSON.parse(storedBlocks);
        console.log('✅ Loaded lesson blocks from localStorage:', {
          contentId,
          blocksCount: this.lessonBlocks.length
        });
      } catch (parseError) {
        console.warn('Failed to parse stored blocks:', parseError);
        this.lessonBlocks = [];
      }
    } else {
      this.lessonBlocks = [];
      console.log('No stored blocks found in localStorage for content:', contentId);
    }

    // Ensure positions are correct
    this.lessonBlocks.forEach((block, index) => {
      block.position = index + 1;
    });

    // Load YouTube suggestions from localStorage
    this.loadYouTubeSuggestionsFromLocalStorage(contentId);
    this.cdr.detectChanges();
  }

  loadYouTubeSuggestionsFromLocalStorage(contentId: string | number): void {
    try {
      const storageKey = `youtube-suggestions-${contentId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          this.youtubeSuggestions = parsed.videos || [];
          this.youtubeSearchQuery = parsed.searchQuery || '';
          console.log('✅ Loaded YouTube suggestions from localStorage:', {
            contentId,
            key: storageKey,
            videosCount: this.youtubeSuggestions.length,
            searchQuery: this.youtubeSearchQuery,
            videos: this.youtubeSuggestions.map(v => v.videoId)
          });
        } catch (parseError) {
          console.warn('❌ Failed to parse stored YouTube suggestions:', parseError);
          this.youtubeSuggestions = [];
          this.youtubeSearchQuery = '';
        }
      } else {
        console.log('ℹ️ No YouTube suggestions found in localStorage for content:', contentId, 'key:', storageKey);
        this.youtubeSuggestions = [];
        this.youtubeSearchQuery = '';
      }
    } catch (error) {
      console.error('❌ Error loading YouTube suggestions from localStorage:', error);
      this.youtubeSuggestions = [];
      this.youtubeSearchQuery = '';
    }
  }

  saveYouTubeSuggestionsToLocalStorage(contentId: string | number | null): void {
    if (!contentId) {
      console.warn('Cannot save YouTube suggestions: contentId is null');
      return;
    }
    
    try {
      const storageKey = `youtube-suggestions-${contentId}`;
      const dataToStore = {
        videos: this.youtubeSuggestions || [],
        searchQuery: this.youtubeSearchQuery || ''
      };
      const jsonString = JSON.stringify(dataToStore);
      localStorage.setItem(storageKey, jsonString);
      console.log('✅ Saved YouTube suggestions to localStorage:', {
        contentId,
        key: storageKey,
        videosCount: this.youtubeSuggestions.length,
        searchQuery: this.youtubeSearchQuery,
        dataSize: jsonString.length
      });
    } catch (error) {
      console.error('❌ Error saving YouTube suggestions to localStorage:', error);
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Clearing old data...');
        // Optionally clear old data or notify user
      }
    }
  }

  saveLessonBlocksToLocalStorage(contentId: string | number | null): void {
    if (!contentId) {
      return;
    }
    
    try {
      const storageKey = `lesson-blocks-${contentId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.lessonBlocks));
      console.log('Saved lesson blocks to localStorage for content:', contentId, 'blocks:', this.lessonBlocks.length);
    } catch (error) {
      console.error('Error saving lesson blocks to localStorage:', error);
    }
  }

  selectBlock(blockId: number | string): void {
    this.selectedBlockId = blockId;
    this.selectedBlock = this.lessonBlocks.find(b => b.id === blockId) || null;
    
    // Ensure meta is initialized
    if (this.selectedBlock && !this.selectedBlock.meta) {
      this.selectedBlock.meta = {};
    }
    
    // Auto-switch to appropriate video tab based on block content
    if (this.selectedBlock && this.selectedBlock.block_type === 'video') {
      if (this.selectedBlock.meta && this.selectedBlock.meta['videoUrl']) {
        // Has uploaded video - switch to upload tab and load video info
        this.videoTab = 'upload';
        this.loadUploadedVideoInfo(this.selectedBlock);
      } else if (this.selectedBlock.meta && this.selectedBlock.meta['youtubeVideoId']) {
        // Has YouTube video - check if it's from manual or AI
        if (this.selectedBlock.meta['youtubeUrl']) {
          // Manual YouTube video (has youtubeUrl in meta)
          this.videoTab = 'youtube-manual';
          this.loadManualYouTubeVideoInfo(this.selectedBlock);
        } else {
          // AI suggested YouTube video
          this.videoTab = 'youtube-ai';
        }
      } else {
        // No video yet - default to AI tab
        this.videoTab = 'youtube-ai';
      }
    }
    
    
    this.cdr.detectChanges();
  }

  loadUploadedVideoInfo(block: ContentBlock): void {
    if (!block.meta || !block.meta['videoUrl']) {
      return;
    }

    // Set uploaded video info from block metadata
    this.uploadedVideoMetadata = {
      thumbnail: block.meta['videoThumbnail'] || null,
      durationFormatted: block.meta['videoDuration'] || null,
      width: block.meta['videoWidth'] || null,
      height: block.meta['videoHeight'] || null,
      fileSize: block.meta['videoFileSize'] || null,
      fileName: block.meta['videoFileName'] || null
    };

    // Set the title from block
    this.uploadedVideoTitle = block.title || '';

    // Create a dummy file object for display (we won't actually use it for upload)
    // The uploadedVideoFile will remain null, but we'll show the metadata
  }

  loadManualYouTubeVideoInfo(block: ContentBlock): void {
    if (!block.meta || !block.meta['youtubeVideoId']) {
      return;
    }

    // Set manual YouTube video info from block metadata
    this.manualYouTubeVideo = {
      videoId: block.meta['youtubeVideoId'] as string,
      title: block.meta['youtubeTitle'] as string || '',
      description: block.meta['youtubeDescription'] as string || '',
      duration: block.meta['youtubeDuration'] as string || '',
      thumbnail: block.meta['youtubeThumbnail'] as string || ''
    };

    // Set the YouTube URL
    if (block.meta['youtubeUrl']) {
      this.setYouTubeUrl(block.meta['youtubeUrl'] as string);
    }
  }

  getBlockTypeLabel(blockType: string): string {
    const labels: Record<string, { en: string; ar: string }> = {
      'text': { en: 'Text', ar: 'نص' },
      'video': { en: 'Video', ar: 'فيديو' },
      'audio': { en: 'Audio', ar: 'صوت' },
      'file': { en: 'File', ar: 'ملف' }
    };
    return labels[blockType]?.[this.currentLang === 'ar' ? 'ar' : 'en'] || blockType;
  }

  addBlock(blockType: 'text' | 'video' | 'audio' | 'file'): void {
    this.showBlockTypeChooser = false;
    
    const newBlock: ContentBlock = {
      id: `draft-${Date.now()}`,
      block_type: blockType,
      title: null,
      body_html: blockType === 'text' ? '<p></p>' : null,
      asset_id: null,
      meta: {} as Record<string, unknown>,
      position: this.lessonBlocks.length + 1
    };
    
    this.lessonBlocks.push(newBlock);
    this.selectBlock(newBlock.id!);
    this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
    this.cdr.detectChanges();
  }

  onBlockDrop(event: CdkDragDrop<ContentBlock[]>): void {
    moveItemInArray(this.lessonBlocks, event.previousIndex, event.currentIndex);
    // Update positions
    this.lessonBlocks.forEach((block, index) => {
      block.position = index + 1;
    });
    this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
    this.cdr.detectChanges();
  }

  deleteBlock(blockId: string | number, event: Event): void {
    event.stopPropagation(); // Prevent selecting the block when clicking delete
    
    const blockIndex = this.lessonBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) {
      return;
    }

    // If the deleted block was selected, clear selection
    if (this.selectedBlockId === blockId) {
      this.selectedBlockId = null;
      this.selectedBlock = null;
    }

    // Clean up editor instance
    this.blockEditors.delete(blockId);

    // Remove the block
    this.lessonBlocks.splice(blockIndex, 1);

    // Update positions for remaining blocks
    this.lessonBlocks.forEach((block, index) => {
      block.position = index + 1;
    });

    this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
    this.cdr.detectChanges();
  }

  saveLessonBuilder(closeAfterSave: boolean = false): void {
    if (!this.currentLessonContentId) {
      this.toastr?.error?.(this.currentLang === 'ar' ? 'معرف المحتوى غير موجود' : 'Content ID not found');
      return;
    }

    this.savingLessonBuilder = true;
    this.cdr.detectChanges();

    // TODO: Implement API call to save blocks
    // For now, just simulate save
    setTimeout(() => {
      this.savingLessonBuilder = false;
      this.toastr?.success?.(this.currentLang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      
      if (closeAfterSave) {
        this.closeLessonBuilder();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  // AI Action Methods
  generateTextParagraph(): void {
    // TODO: Implement AI paragraph generation
    console.log('Generate text paragraph');
  }

  improveText(): void {
    // TODO: Implement AI text improvement
    console.log('Improve text');
  }

  addTransition(): void {
    // TODO: Implement AI transition generation
    console.log('Add transition');
  }

  suggestVideoTitle(): void {
    if (!this.selectedBlock || !this.currentLessonContentId) {
      return;
    }

    this.loadingYouTubeSuggestions = true;
    this.youtubeSuggestions = [];

    // Get course information
    const courseId = this.draftCourseId ? Number(this.draftCourseId) : undefined;

    // Get content title and hint
    const contentTitle = this.editingLessonTitle || '';
    const hint = this.lessonHint || '';
    
    // Find the section that contains this content
    let sectionTitle = '';
    if (this.currentLessonContentId) {
      for (const section of this.sections) {
        if (section.content_items && section.content_items.some(item => String(item.id) === String(this.currentLessonContentId))) {
          sectionTitle = section.name || '';
          break;
        }
      }
    }

    this.ai.suggestYouTubeVideos({
      contentTitle: contentTitle,
      hint: hint,
      courseId: courseId,
      sectionTitle: sectionTitle
    }).subscribe({
      next: (response) => {
        this.loadingYouTubeSuggestions = false;
        this.youtubeSuggestions = response.videos || [];
        this.youtubeSearchQuery = response.searchQuery || '';
        
        // Save to localStorage immediately
        if (this.currentLessonContentId) {
          this.saveYouTubeSuggestionsToLocalStorage(this.currentLessonContentId);
          console.log('✅ Saved YouTube suggestions to localStorage after fetch:', {
            contentId: this.currentLessonContentId,
            videosCount: this.youtubeSuggestions.length,
            searchQuery: this.youtubeSearchQuery
          });
        } else {
          console.error('❌ Cannot save YouTube suggestions: currentLessonContentId is null');
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error suggesting YouTube videos:', error);
        this.loadingYouTubeSuggestions = false;
        this.toastr?.error?.(
          this.currentLang === 'ar' 
            ? 'فشل في اقتراح فيديوهات YouTube' 
            : 'Failed to suggest YouTube videos'
        );
        this.cdr.detectChanges();
      }
    });
  }

  previewYouTubeVideo(video: any, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent triggering selectYouTubeVideo
    }
    this.previewingYouTubeVideo = video;
    this.showYouTubePreviewModal = true;
    this.cdr.detectChanges();
  }

  closeYouTubePreviewModal(): void {
    this.showYouTubePreviewModal = false;
    this.previewingYouTubeVideo = null;
    this.cdr.detectChanges();
  }

  selectYouTubeVideo(video: { videoId: string; title: string; description: string; duration: string; thumbnail: string; channelTitle: string }): void {
    if (!this.selectedBlock) {
      return;
    }

    // Ensure meta object exists
    if (!this.selectedBlock.meta) {
      this.selectedBlock.meta = {};
    }

    // Delete old uploaded video from S3 if exists (when switching from upload to YouTube)
    const oldVideoUrl = this.selectedBlock.meta['videoUrl'] as string | undefined;
    if (oldVideoUrl) {
      this.ai.deleteDraftContentVideos([oldVideoUrl]).subscribe({
        next: () => {
          console.log('Old uploaded video deleted from S3:', oldVideoUrl);
        },
        error: (error) => {
          console.warn('Failed to delete old uploaded video from S3:', error);
        }
      });
    }

    // Update block with video information
    this.selectedBlock.title = video.title;
    this.selectedBlock.meta = {
      ...this.selectedBlock.meta,
      youtubeVideoId: video.videoId,
      youtubeTitle: video.title,
      youtubeDescription: video.description,
      youtubeThumbnail: video.thumbnail,
      youtubeChannel: video.channelTitle,
      youtubeDuration: video.duration,
      // Remove uploaded video fields
      videoUrl: undefined,
      videoFileName: undefined,
      videoFileSize: undefined,
      videoDuration: undefined,
      videoThumbnail: undefined,
      videoWidth: undefined,
      videoHeight: undefined,
      assetId: undefined
    };
    this.selectedBlock.asset_id = null;

    // Switch to AI YouTube tab
    this.videoTab = 'youtube-ai';

    // Save blocks immediately to localStorage
    if (this.currentLessonContentId) {
      this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
      console.log('✅ Saved selected YouTube video to localStorage:', video.videoId, 'for content:', this.currentLessonContentId);
    }
    this.cdr.detectChanges();
  }

  useYouTubeVideo(video: any): void {
    this.selectYouTubeVideo(video);
    this.closeYouTubePreviewModal();
  }

  isYouTubeVideoSelected(video: any): boolean {
    if (!this.selectedBlock || !this.selectedBlock.meta || !video) {
      return false;
    }
    const selectedVideoId = this.selectedBlock.meta['youtubeVideoId'];
    return selectedVideoId === video.videoId;
  }

  openYouTubeVideo(videoId: string): void {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    const url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  previewUploadedVideo(): void {
    if (!this.selectedBlock || !this.selectedBlock.meta || !this.selectedBlock.meta['videoUrl']) {
      return;
    }

    const videoUrl = this.selectedBlock.meta['videoUrl'] as string;
    const title = this.selectedBlock.title || this.uploadedVideoTitle || 'Video';
    const thumbnail = this.selectedBlock.meta['videoThumbnail'] as string | undefined;
    const duration = this.selectedBlock.meta['videoDuration'] as string | undefined;

    this.previewingUploadedVideo = {
      url: videoUrl,
      title: title,
      thumbnail: thumbnail,
      duration: duration
    };
    this.showUploadedVideoModal = true;
    this.cdr.detectChanges();
  }

  closeUploadedVideoModal(): void {
    this.showUploadedVideoModal = false;
    this.previewingUploadedVideo = null;
    this.cdr.detectChanges();
  }

  getUploadedVideoUrl(): SafeResourceUrl | null {
    if (!this.previewingUploadedVideo) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewingUploadedVideo.url);
  }

  addVideoIntro(): void {
    // TODO: Implement AI video intro generation
    console.log('Add video intro');
  }

  shortenAudioScript(): void {
    // TODO: Implement AI script shortening
    console.log('Shorten audio script');
  }

  addAudioClosing(): void {
    // TODO: Implement AI audio closing generation
    console.log('Add audio closing');
  }

  suggestFileLabel(): void {
    // TODO: Implement AI file label suggestion
    console.log('Suggest file label');
  }

  onEditorReady(editor: DecoupledEditor, blockId: number | string, toolbarContainer?: HTMLElement): void {
    // Store editor instance for this block
    this.blockEditors.set(blockId, editor);
    
    // Insert toolbar into DOM (required for DecoupledEditor)
    const element = editor.ui.getEditableElement()!;
    const parent = element.parentElement!;
    const toolbar = editor.ui.view.toolbar.element;
    
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
      if (toolbar) {
        // Check if toolbar is already in DOM
        if (!toolbar.parentElement) {
          // Try to find toolbar container in the DOM if not passed directly
          let container: HTMLElement | null = null;
          if (toolbarContainer && toolbarContainer instanceof HTMLElement) {
            container = toolbarContainer;
          } else {
            // Try to find it by class
            const wrapper = parent.closest('.ckeditor-wrapper');
            if (wrapper) {
              container = wrapper.querySelector('.ck-toolbar-container') as HTMLElement;
            }
          }
          
          if (container) {
            // Clear container first
            container.innerHTML = '';
            // Insert toolbar into the provided container
            container.appendChild(toolbar);
          } else {
            // Fallback: insert before editable element
            parent.insertBefore(toolbar, element);
          }
        }
        
        // Ensure toolbar is visible
        toolbar.style.display = 'flex';
        toolbar.style.visibility = 'visible';
        toolbar.style.opacity = '1';
        
        // Set direction on toolbar
        const direction = this.isRTL ? 'rtl' : 'ltr';
        toolbar.setAttribute('dir', direction);
        toolbar.style.setProperty('direction', direction, 'important');
      }
    }, 100);
    
    // Setup image upload adapter (same as onReady for text editor modal)
    const currentContentId = this.currentLessonContentId ? String(this.currentLessonContentId) : undefined;
    const uploadUrl = this.contentImageUploadUrl;
    
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
      return new CKEditor5CustomUploadAdapter(loader, {
        uploadUrl,
        token: this.universalAuth.getAccessToken(),
        contentId: currentContentId,
        onUploadStart: (file: File) => {
          const tempUrl = URL.createObjectURL(file);
          this.uploadingImageUrls.add(tempUrl);
          this.markImageAsUploading(editor, tempUrl);
          
          const model = editor.model;
          const imageInsertListener = () => {
            model.document.off('change:data', imageInsertListener);
            setTimeout(() => {
              this.markImageAsUploading(editor, tempUrl);
            }, 50);
          };
          model.document.on('change:data', imageInsertListener);
        },
        onUploaded: (asset) => {
          this.registerPendingImageAsset(asset);
          this.uploadingImageUrls.forEach((url) => {
            this.removeImageUploadingState(editor, url);
          });
          if (asset.url) {
            this.removeImageUploadingState(editor, asset.url);
          }
          this.uploadingImageUrls.forEach((url) => {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
          this.uploadingImageUrls.clear();
        },
        onError: (error) => {
          console.error('CKEditor image upload failed:', error);
          const message = this.currentLang === 'ar'
            ? 'فشل رفع الصورة. حاول مرة أخرى.'
            : 'Failed to upload the image. Please try again.';
          this.toastr?.error?.(message);
          this.uploadingImageUrls.clear();
          this.removeAllImageUploadingStates(editor);
        },
        onAbort: (asset) => {
          if (asset?.key) {
            this.pendingImageUploads.delete(asset.key);
            this.ai.deleteDraftContentImages([asset.key]).subscribe({
              error: (error: unknown) => {
                console.error('Failed to delete aborted editor image:', error);
              }
            });
          }
          if (asset?.url) {
            this.removeImageUploadingState(editor, asset.url);
          }
        }
      });
    };
    
    // Remove dropdown from image button - make it always upload from computer
    // Also remove file manager option from dropdown menu
    setTimeout(() => {
      const toolbarElement = editor.ui.view.toolbar.element;
      if (toolbarElement) {
        // Find the image button (could be splitbutton or dropdown)
        const imageButton = toolbarElement.querySelector('[aria-label*="image" i], [aria-label*="Image" i], .ck-splitbutton, .ck-dropdown__button') as HTMLElement;
        if (imageButton) {
          // Hide all arrow elements
          const arrows = imageButton.querySelectorAll('.ck-button__arrow, .ck-dropdown__arrow, .ck-splitbutton__arrow');
          arrows.forEach((arrow: Element) => {
            (arrow as HTMLElement).style.display = 'none';
          });
          
          // Also hide arrow on parent splitbutton if it exists
          const splitButton = imageButton.closest('.ck-splitbutton');
          if (splitButton) {
            const splitButtonArrow = splitButton.querySelector('.ck-splitbutton__arrow, .ck-button__arrow');
            if (splitButtonArrow) {
              (splitButtonArrow as HTMLElement).style.display = 'none';
            }
          }
          
          // Remove file manager option from dropdown menu if it exists
          const removeFileManagerOption = () => {
            const dropdownPanel = document.querySelector('.ck-dropdown__panel, .ck-list');
            if (dropdownPanel) {
              const fileManagerItems = dropdownPanel.querySelectorAll('[data-cke-command-id*="fileManager"], [data-cke-command-id*="filemanager"], [aria-label*="file manager" i], [aria-label*="File Manager" i]');
              fileManagerItems.forEach((item: Element) => {
                (item as HTMLElement).style.display = 'none';
                item.remove();
              });
            }
          };
          
          // Override click to directly open file picker and prevent dropdown
          imageButton.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            // Ignore clicks on arrow elements
            if (target.classList.contains('ck-button__arrow') || 
                target.classList.contains('ck-dropdown__arrow') ||
                target.classList.contains('ck-splitbutton__arrow') ||
                target.closest('.ck-button__arrow') ||
                target.closest('.ck-dropdown__arrow') ||
                target.closest('.ck-splitbutton__arrow')) {
              return;
            }
            
            // Prevent default dropdown behavior
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Remove file manager option if dropdown was opened
            setTimeout(removeFileManagerOption, 10);
            
            // Create a file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (fileEvent: Event) => {
              const fileTarget = fileEvent.target as HTMLInputElement;
              const file = fileTarget.files?.[0];
              if (file) {
                const fileRepository = editor.plugins.get('FileRepository');
                const loader = fileRepository.createLoader(file);
                if (loader) {
                  loader.upload().then((response: any) => {
                    editor.model.change((writer: any) => {
                      const imageElement = writer.createElement('imageBlock', {
                        src: response.default || response.url
                      });
                      editor.model.insertContent(imageElement, editor.model.document.selection);
                    });
                  }).catch((error: any) => {
                    console.error('Image upload failed:', error);
                  });
                }
              }
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
            };
            document.body.appendChild(input);
            input.click();
          }, true); // Use capture phase to intercept before CKEditor's handler
          
          // Also watch for dropdown opening and remove file manager option
          const observer = new MutationObserver(() => {
            removeFileManagerOption();
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Clean up observer when editor is destroyed
          editor.on('destroy', () => {
            observer.disconnect();
          });
        }
      }
    }, 200);
    
    // Set direction on editable element (reuse element from above)
    const editableElement = editor.ui.getEditableElement()!;
    const direction = this.isRTL ? 'rtl' : 'ltr';
    editableElement.setAttribute('dir', direction);
    editableElement.style.setProperty('direction', direction, 'important');
    
    if (this.isRTL) {
      editableElement.setAttribute('lang', 'ar');
    } else {
      editableElement.setAttribute('lang', 'en');
    }
    
    // Auto-save when editor content changes
    editor.model.document.on('change:data', () => {
      const block = this.lessonBlocks.find(b => b.id === blockId);
      if (block) {
        block.body_html = editor.getData();
        // Debounce the save to avoid too many localStorage writes
        this.debouncedSaveBlocks();
      }
    });
  }
  
  generateTextBlockWithAI(): void {
    if (this.generatingTextBlock || !this.selectedBlock) {
      return;
    }
    
    // Warn user if content already exists
    if (this.selectedBlock.body_html && this.selectedBlock.body_html.trim().length > 0) {
      const confirmReplace = confirm(
        this.currentLang === 'ar'
          ? 'المحتوى الحالي سيتم استبداله بالمحتوى الذي سيولده الذكاء الاصطناعي. هل تريد المتابعة؟'
          : 'The current content will be replaced with new AI-generated content. Do you want to continue?'
      );
      if (!confirmReplace) {
        return;
      }
    }
    
    this.generatingTextBlock = true;
    this.startTextEditorDhikrRotation();
    
    const grade = this.stageName || '';
    const country = this.countryName || '';
    const course_name = this.courseName || '';
    const category = this.selectedCategory 
      ? (this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en)
      : '';
    
    // Find section name from current lesson
    let sectionName = '';
    if (this.currentLessonContentId) {
      for (const section of this.sections) {
        if (section.content_items && section.content_items.some(item => String(item.id) === String(this.currentLessonContentId))) {
          sectionName = section.name;
          break;
        }
      }
    }
    const section = sectionName || '';
    // Get content title from the content item, not the block
    let contentTitle = '';
    if (this.currentLessonContentId) {
      for (const section of this.sections) {
        const contentItem = section.content_items?.find(item => String(item.id) === String(this.currentLessonContentId));
        if (contentItem) {
          contentTitle = contentItem.title || '';
          break;
        }
      }
    }
    const title = contentTitle;
    const hintText = this.lessonHint?.trim() || '';
    
    const restrictions: string[] = [];
    if (course_name) {
      restrictions.push(
        this.currentLang === 'ar' 
          ? `يجب أن يكون المحتوى متعلقًا فقط بدورة "${course_name}" ولا يتضمن مواضيع خارجية`
          : `Content must be strictly related to the course "${course_name}" and must not include unrelated topics`
      );
    }
    if (section) {
      restrictions.push(
        this.currentLang === 'ar'
          ? `يجب أن يكون المحتوى متعلقًا بقسم "${section}" فقط`
          : `Content must be strictly related to the section "${section}" only`
      );
    }
    if (title) {
      restrictions.push(
        this.currentLang === 'ar'
          ? `يجب أن يركز المحتوى على العنوان "${title}" فقط ولا يتجاوزه`
          : `Content must focus strictly on the title "${title}" and must not deviate from it`
      );
    }
    
    const payload: any = {
      grade,
      country,
      course_name,
      category,
      section,
      title,
      locale: this.currentLang
    };
    
    // Limit to 10 lines maximum
    const richContentInstruction = this.currentLang === 'ar'
      ? 'ينبغي أن يكون المحتوى بتنسيق HTML صالح ومتوافق مع CKEditor 5، مع تضمين عناوين منسقة بمستويات مناسبة، قوائم نقطية أو مرقمة عند الحاجة، نصوص مميزة باستخدام الوسوم <strong> و <em>، واستخدام رموز تعبيرية (Unicode emoji) مناسبة لزيادة التوضيح متى ما أمكن دون مبالغة. يجب أن يكون المحتوى قصيراً ومختصراً - لا يزيد عن 10 أسطر. يُمنع استخدام سكربتات أو وسوم غير مدعومة. يجب إرجاع النتيجة النهائية في JSON بالهيكل { "content": "..." }.'
      : 'Return the final result as JSON with the shape { "content": "..." }. The HTML string must be valid for CKEditor 5 and feel rich: include semantic headings, bullet/numbered lists where useful, highlighted text via <strong> / <em>, and sprinkle relevant Unicode emojis to enhance clarity (without overusing them). Content must be SHORT and CONCISE - no more than 10 lines. Absolutely no scripts or unsupported embeds.';

    if (restrictions.length > 0) {
      restrictions.push(richContentInstruction);
      payload.restrictions = restrictions.join('. ');
      payload.instructions = this.currentLang === 'ar'
        ? `مهم جداً: يجب أن يقتصر المحتوى على موضوع الدورة "${course_name}" وقسم "${section}" والعنوان "${title}" فقط. لا تتضمن أي معلومات أو أمثلة غير متعلقة بهذه الموضوعات. المحتوى يجب أن يكون قصيراً - لا يزيد عن 10 أسطر.`
        : `CRITICAL: Content must be strictly limited to the course "${course_name}", section "${section}", and title "${title}" only. Do not include any information or examples unrelated to these topics. Content must be SHORT - no more than 10 lines.`;
    } else {
      payload.instructions = richContentInstruction;
    }
    
    if (payload.instructions && payload.instructions !== richContentInstruction) {
      payload.instructions = `${payload.instructions} ${richContentInstruction}`;
    }
    
    if (hintText) {
      payload.hint = hintText;
    }
    
    console.log('Generating text block content with AI...', payload);
    
    this.http.post<{ content: string }>(`${this.baseUrl}/ai/content/text`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.currentLang === 'ar' ? 'ar' : 'en'
      }
    }).subscribe({
      next: (response) => {
        const generatedContent = response.content || '<p>No content generated.</p>';
        
        if (this.selectedBlock && this.selectedBlock.id) {
          this.selectedBlock.body_html = generatedContent;
          
          // Update CKEditor if it exists for this block
          const editor = this.blockEditors.get(this.selectedBlock.id);
          if (editor) {
            editor.setData(generatedContent);
          }
          
          // Save to database
          this.saveBlockToDatabase(this.selectedBlock).then(() => {
            // Save to localStorage
            this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
            
            this.generatingTextBlock = false;
            this.stopTextEditorDhikrRotation();
            this.toastr?.success?.(
              this.currentLang === 'ar' 
                ? 'تم إنشاء المحتوى بنجاح' 
                : 'Content generated successfully'
            );
            this.cdr.detectChanges();
          }).catch((error) => {
            console.error('Error saving generated block:', error);
            this.generatingTextBlock = false;
            this.stopTextEditorDhikrRotation();
            this.cdr.detectChanges();
          });
        }
      },
      error: (error) => {
        console.error('AI text block generation error:', error);
        this.generatingTextBlock = false;
        this.stopTextEditorDhikrRotation();
        this.toastr?.error?.(
          this.currentLang === 'ar' 
            ? 'فشل في إنشاء المحتوى. يرجى المحاولة مرة أخرى.' 
            : 'Failed to generate content. Please try again.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  private debouncedSaveBlocks(): void {
    if (this.saveBlocksTimeout) {
      clearTimeout(this.saveBlocksTimeout);
    }
    this.saveBlocksTimeout = setTimeout(() => {
      this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
    }, 500); // Save after 500ms of inactivity
  }

  loadAndOpenLessonBuilder(contentId: string | number): boolean {
    // Find the content item in the current sections
    let foundItem: ContentItem | null = null;
    
    for (const section of this.sections) {
      if (section.content_items && Array.isArray(section.content_items) && section.content_items.length > 0) {
        foundItem = section.content_items.find(item => String(item.id) === String(contentId)) || null;
        if (foundItem) {
          break;
        }
      }
    }
    
    if (foundItem) {
      console.log('Found content item for lesson builder:', foundItem);
      this.openLessonBuilder(foundItem);
      return true;
    }
    
    // If not found, check if we need to load content items for any section
    let needsLoading = false;
    for (const section of this.sections) {
      // Check if this section might contain the content (we need to load its content items)
      if (!this.loadedSectionContentIds.has(section.id)) {
        // Load content items for this section
        this.ensureSectionContentLoaded(section.id);
        needsLoading = true;
      }
    }
    
    if (needsLoading) {
      // Content items are being loaded, will retry
      return false;
    }
    
    // If still not found after loading all sections, show warning
    console.warn('Content item not found in current sections:', contentId);
    this.toastr?.warning?.(this.currentLang === 'ar' ? 'لم يتم العثور على المحتوى' : 'Content not found');
    return false;
  }

  loadAndOpenLessonBuilderWithRetry(contentId: string | number, retries: number = 0): void {
    const maxRetries = 10; // Try for up to 5 seconds (10 * 500ms)
    
    if (retries >= maxRetries) {
      console.warn('Max retries reached for loading content item:', contentId);
      this.toastr?.warning?.(this.currentLang === 'ar' ? 'فشل في تحميل المحتوى' : 'Failed to load content');
      return;
    }
    
    // Wait a bit for sections to be initialized
    setTimeout(() => {
      // First, try to find the content item
      let foundItem: ContentItem | null = null;
      let sectionNeedsLoading: Section | null = null;
      
      for (const section of this.sections) {
        if (section.content_items && Array.isArray(section.content_items) && section.content_items.length > 0) {
          foundItem = section.content_items.find(item => String(item.id) === String(contentId)) || null;
          if (foundItem) {
            break;
          }
        } else if (!this.loadedSectionContentIds.has(section.id)) {
          // This section hasn't loaded its content items yet
          sectionNeedsLoading = section;
        }
      }
      
      if (foundItem) {
        console.log('Found content item for lesson builder:', foundItem);
        this.openLessonBuilder(foundItem);
        return;
      }
      
      // If we found a section that needs loading, load it and retry
      if (sectionNeedsLoading) {
        console.log('Loading content items for section:', sectionNeedsLoading.id);
        this.ensureSectionContentLoaded(sectionNeedsLoading.id);
        // Retry after content is loaded
        setTimeout(() => {
          this.loadAndOpenLessonBuilderWithRetry(contentId, retries + 1);
        }, 1000);
        return;
      }
      
      // If all sections are loaded but content not found, retry a few more times
      if (retries < maxRetries) {
        setTimeout(() => {
          this.loadAndOpenLessonBuilderWithRetry(contentId, retries + 1);
        }, 500);
      } else {
        console.warn('Content item not found after all retries:', contentId);
        this.toastr?.warning?.(this.currentLang === 'ar' ? 'لم يتم العثور على المحتوى' : 'Content not found');
      }
    }, retries === 0 ? 1000 : 500); // Initial delay longer, then shorter
  }

  getYouTubeUrl(): string {
    if (!this.selectedBlock || !this.selectedBlock.meta) {
      return '';
    }
    return (this.selectedBlock.meta['youtubeUrl'] as string) || '';
  }

  setYouTubeUrl(url: string): void {
    if (!this.selectedBlock) {
      return;
    }
    if (!this.selectedBlock.meta) {
      this.selectedBlock.meta = {};
    }
    this.selectedBlock.meta['youtubeUrl'] = url;
    this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
  }

  extractYouTubeVideoIdForBlock(url: string): string | null {
    if (!url) return null;
    
    // Various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  fetchingYouTubeMetadata: boolean = false;
  manualYouTubeVideo: any = null;

  fetchYouTubeMetadataForBlock(): void {
    const url = this.getYouTubeUrl();
    if (!url) {
      this.toastr?.warning?.(
        this.currentLang === 'ar' 
          ? 'يرجى إدخال رابط YouTube' 
          : 'Please enter a YouTube URL'
      );
      return;
    }

    const videoId = this.extractYouTubeVideoIdForBlock(url);
    if (!videoId) {
      this.toastr?.error?.(
        this.currentLang === 'ar' 
          ? 'رابط YouTube غير صحيح' 
          : 'Invalid YouTube URL'
      );
      return;
    }

    this.fetchingYouTubeMetadata = true;
    this.manualYouTubeVideo = null;

    this.ai.getYouTubeMetadata(videoId).subscribe({
      next: (metadata) => {
        this.fetchingYouTubeMetadata = false;
        
        // Parse duration from ISO 8601 format (PT15M33S) to readable format
        const parseDuration = (isoDuration: string): string => {
          const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return '0:00';
          const hours = parseInt(match[1] || '0', 10);
          const minutes = parseInt(match[2] || '0', 10);
          const seconds = parseInt(match[3] || '0', 10);
          
          if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        const formattedMetadata = {
          videoId: metadata.videoId,
          title: metadata.title,
          description: metadata.description,
          duration: parseDuration(metadata.duration),
          thumbnail: metadata.thumbnail,
          embedUrl: metadata.embedUrl
        };

        this.manualYouTubeVideo = formattedMetadata;

        // Delete old uploaded video from S3 if exists (when switching from upload to manual YouTube)
        if (this.selectedBlock?.meta?.['videoUrl']) {
          const oldVideoUrl = this.selectedBlock.meta['videoUrl'] as string;
          this.ai.deleteDraftContentVideos([oldVideoUrl]).subscribe({
            next: () => {
              console.log('Old uploaded video deleted from S3:', oldVideoUrl);
            },
            error: (error) => {
              console.warn('Failed to delete old uploaded video from S3:', error);
            }
          });
        }

        // Update the block with video information
        if (this.selectedBlock) {
          if (!this.selectedBlock.meta) {
            this.selectedBlock.meta = {};
          }
          
          this.selectedBlock.title = formattedMetadata.title;
          this.selectedBlock.meta = {
            ...this.selectedBlock.meta,
            youtubeVideoId: formattedMetadata.videoId,
            youtubeUrl: url,
            youtubeTitle: formattedMetadata.title,
            youtubeDescription: formattedMetadata.description,
            youtubeThumbnail: formattedMetadata.thumbnail,
            youtubeDuration: formattedMetadata.duration,
            // Remove uploaded video fields
            videoUrl: undefined,
            videoFileName: undefined,
            videoFileSize: undefined,
            videoDuration: undefined,
            videoThumbnail: undefined,
            videoWidth: undefined,
            videoHeight: undefined,
            assetId: undefined
          };
          this.selectedBlock.asset_id = null;

          // Switch to manual YouTube tab
          this.videoTab = 'youtube-manual';

          // Save to localStorage
          if (this.currentLessonContentId) {
            this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
          }
        }

        this.toastr?.success?.(
          this.currentLang === 'ar' 
            ? 'تم جلب معلومات الفيديو بنجاح' 
            : 'Video information fetched successfully'
        );
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.fetchingYouTubeMetadata = false;
        console.error('Error fetching YouTube metadata:', error);
        this.toastr?.error?.(
          this.currentLang === 'ar' 
            ? 'فشل في جلب معلومات الفيديو' 
            : 'Failed to fetch video information'
        );
        this.cdr.detectChanges();
      }
    });
  }

  useManualYouTubeVideo(): void {
    if (this.manualYouTubeVideo && this.selectedBlock) {
      // Delete old uploaded video from S3 if exists (when switching from upload to manual YouTube)
      const oldVideoUrl = this.selectedBlock.meta?.['videoUrl'] as string | undefined;
      if (oldVideoUrl) {
        this.ai.deleteDraftContentVideos([oldVideoUrl]).subscribe({
          next: () => {
            console.log('Old uploaded video deleted from S3:', oldVideoUrl);
          },
          error: (error) => {
            console.warn('Failed to delete old uploaded video from S3:', error);
          }
        });
      }

      // Video is already saved in fetchYouTubeMetadata, just confirm and clear preview
      // Switch to manual YouTube tab
      this.videoTab = 'youtube-manual';
      
      this.toastr?.success?.(
        this.currentLang === 'ar' 
          ? 'تم حفظ الفيديو بنجاح' 
          : 'Video saved successfully'
      );
      this.manualYouTubeVideo = null;
      this.cdr.detectChanges();
    }
  }

  // Video upload for lesson builder
  uploadedVideoFile: File | null = null;
  uploadingVideo: boolean = false;
  blockVideoUploadProgress: number = 0;
  blockVideoUploadError: string | null = null;
  uploadedVideoMetadata: any = null;
  uploadedVideoTitle: string = ''; // Title for uploaded video
  editingUploadedVideoTitle: boolean = false; // Track if editing uploaded video title
  deletingBlockVideo: boolean = false; // Track if deleting uploaded video from block
  savingVideoTitle: boolean = false; // Track if saving video title

  onVideoFileSelectedForBlock(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    
    // Validate file type
    const isValidType = this.VIDEO_ACCEPTED_FORMATS.some(format => {
      if (format.startsWith('.')) {
        return file.name.toLowerCase().endsWith(format);
      }
      return file.type === format;
    });
    
    if (!isValidType) {
      this.blockVideoUploadError = this.currentLang === 'ar' 
        ? 'نوع الملف غير مدعوم. الصيغ المسموح بها: MP4, AVI.'
        : 'Unsupported file type. Allowed formats are MP4, AVI.';
      return;
    }
    
    // Validate file size (100MB)
    if (file.size > this.VIDEO_MAX_SIZE) {
      this.blockVideoUploadError = this.currentLang === 'ar'
        ? 'الملف كبير جدًا. الحد الأقصى 100 ميجابايت.'
        : 'File is too large. Maximum allowed size is 100 MB.';
      return;
    }
    
    this.blockVideoUploadError = null;
    this.uploadedVideoFile = file;
    
    // Extract video metadata
    this.extractVideoMetadataForBlock(file);
    
    // Reset input
    input.value = '';
    this.cdr.detectChanges();
  }

  private extractVideoMetadataForBlock(file: File): void {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const duration = Math.floor(video.duration);
      this.uploadedVideoMetadata = {
        duration: duration,
        durationFormatted: this.formatDuration(duration),
        width: video.videoWidth,
        height: video.videoHeight,
        fileSize: file.size,
        fileName: file.name
      };
      
      // Create thumbnail from video
      video.currentTime = Math.min(1, duration / 10); // Get frame at 10% or 1 second
      this.cdr.detectChanges();
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (this.uploadedVideoMetadata) {
          this.uploadedVideoMetadata.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        }
      }
      URL.revokeObjectURL(video.src);
      this.cdr.detectChanges();
    };
    
    video.src = URL.createObjectURL(file);
  }

  validateVideoTitle(): boolean {
    if (!this.uploadedVideoFile) {
      return true; // No file selected, validation not needed
    }
    
    const isValid = !!(this.uploadedVideoTitle && this.uploadedVideoTitle.trim());
    if (!isValid) {
      this.blockVideoUploadError = this.currentLang === 'ar' 
        ? 'عنوان الفيديو مطلوب' 
        : 'Video title is required';
    } else {
      // Clear error if title is valid
      if (this.blockVideoUploadError && this.blockVideoUploadError.includes('title')) {
        this.blockVideoUploadError = null;
      }
    }
    this.cdr.detectChanges();
    return isValid;
  }

  uploadVideoForBlock(): void {
    if (!this.uploadedVideoFile || !this.currentLessonContentId) {
      return;
    }

    // Validate title is provided
    if (!this.validateVideoTitle()) {
      this.toastr?.warning?.(
        this.currentLang === 'ar' 
          ? 'يرجى إدخال عنوان للفيديو قبل الرفع' 
          : 'Please enter a video title before uploading'
      );
      return;
    }

    // If no block is selected, create a new video block first
    if (!this.selectedBlock) {
      const newBlock: ContentBlock = {
        id: `draft-${Date.now()}`,
        block_type: 'video',
        title: null,
        body_html: null,
        asset_id: null,
        meta: {} as Record<string, unknown>,
        position: this.lessonBlocks.length + 1
      };
      this.lessonBlocks.push(newBlock);
      this.selectBlock(newBlock.id!);
    }

    // Delete old video from S3 if exists
    const oldVideoUrl = this.selectedBlock?.meta?.['videoUrl'] as string | undefined;
    if (oldVideoUrl) {
      this.ai.deleteDraftContentVideos([oldVideoUrl]).subscribe({
        next: () => {
          console.log('Old video deleted from S3:', oldVideoUrl);
        },
        error: (error) => {
          console.warn('Failed to delete old video from S3:', error);
          // Continue with upload even if deletion fails
        }
      });
    }

    // Switch to upload tab
    this.videoTab = 'upload';

    this.uploadingVideo = true;
    this.blockVideoUploadProgress = 0;
    this.blockVideoUploadError = null;

    const metadata = {
      duration: this.uploadedVideoMetadata?.duration,
      width: this.uploadedVideoMetadata?.width,
      height: this.uploadedVideoMetadata?.height
    };

    this.ai.uploadDraftContentVideo(this.uploadedVideoFile, this.currentLessonContentId, metadata).subscribe({
      next: (event) => {
        if (event.type === 1) { // HttpEventType.UploadProgress
          if (event.total) {
            // Keep progress at max 95% during upload (reserve 5% for database save)
            const uploadProgress = Math.round((95 * event.loaded) / event.total);
            this.blockVideoUploadProgress = uploadProgress;
            this.cdr.detectChanges();
          }
        } else if (event.type === 4) { // HttpEventType.Response
          const response = event.body;
          if (response && response.asset && this.selectedBlock && this.uploadedVideoFile) {
            // Upload complete, now saving to database (show 95-99%)
            this.blockVideoUploadProgress = 95;
            this.cdr.detectChanges();

            // Update block with video information
            if (!this.selectedBlock.meta) {
              this.selectedBlock.meta = {};
            }
            
            // Use the user-provided title or fallback to filename
            const videoTitle = this.uploadedVideoTitle.trim() || this.uploadedVideoFile.name.replace(/\.[^/.]+$/, '');
            const blockMeta = {
              ...this.selectedBlock.meta,
              videoUrl: response.asset.url,
              videoFileName: response.asset.filename,
              videoFileSize: response.asset.size,
              videoDuration: this.uploadedVideoMetadata?.durationFormatted,
              videoThumbnail: this.uploadedVideoMetadata?.thumbnail,
              videoWidth: response.asset.width,
              videoHeight: response.asset.height,
              assetId: response.asset.id
            };

            this.selectedBlock.title = videoTitle;
            this.selectedBlock.meta = blockMeta;
            this.selectedBlock.asset_id = response.asset.id;

            // Save block to database (show 99% during this)
            this.blockVideoUploadProgress = 99;
            this.cdr.detectChanges();

            // Save block to database
            this.saveBlockToDatabase(this.selectedBlock).then(() => {
              // Save to localStorage
              this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);

              // Complete! Show 100% briefly
              this.blockVideoUploadProgress = 100;
              this.cdr.detectChanges();

              // Switch to upload tab to show the uploaded video
              this.videoTab = 'upload';
              
              // Load the uploaded video info for display
              if (this.selectedBlock) {
                this.loadUploadedVideoInfo(this.selectedBlock);
              }

              this.toastr?.success?.(
                this.currentLang === 'ar' 
                  ? 'تم رفع الفيديو بنجاح' 
                  : 'Video uploaded successfully'
              );

              // Clear upload file state but keep metadata for display
              this.uploadedVideoFile = null;
              this.uploadingVideo = false;
              this.blockVideoUploadProgress = 0;
              this.cdr.detectChanges();
            }).catch((error) => {
              console.error('Error saving block to database:', error);
              // Still save to localStorage even if database save fails
              this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
              this.uploadedVideoFile = null;
              this.uploadedVideoMetadata = null;
              this.uploadingVideo = false;
              this.blockVideoUploadProgress = 0;
              this.cdr.detectChanges();
            });
          }
        }
      },
      error: (error) => {
        console.error('Video upload error:', error);
        this.uploadingVideo = false;
        this.blockVideoUploadProgress = 0;
        this.blockVideoUploadError = error.error?.message || (this.currentLang === 'ar' 
          ? 'فشل في رفع الفيديو' 
          : 'Failed to upload video');
        if (this.blockVideoUploadError) {
          this.toastr?.error?.(this.blockVideoUploadError);
        }
        this.cdr.detectChanges();
      }
    });
  }

  removeUploadedVideoFile(): void {
    this.uploadedVideoFile = null;
    this.uploadedVideoMetadata = null;
    this.uploadedVideoTitle = '';
    this.blockVideoUploadError = null;
    this.blockVideoUploadProgress = 0;
    this.cdr.detectChanges();
  }

  editUploadedVideoTitle(): void {
    if (!this.selectedBlock || !this.selectedBlock.meta?.['videoUrl']) {
      return;
    }
    this.editingUploadedVideoTitle = true;
    this.uploadedVideoTitle = this.selectedBlock.title || '';
    this.cdr.detectChanges();
  }

  saveUploadedVideoTitle(): void {
    if (!this.selectedBlock || !this.uploadedVideoTitle?.trim()) {
      this.toastr?.warning?.(
        this.currentLang === 'ar' 
          ? 'يرجى إدخال عنوان للفيديو' 
          : 'Please enter a video title'
      );
      return;
    }

    if (!this.selectedBlock.meta?.['videoUrl']) {
      return;
    }

    this.savingVideoTitle = true;

    // Update block title
    this.selectedBlock.title = this.uploadedVideoTitle.trim();
    
    // Save to database
    this.saveBlockToDatabase(this.selectedBlock).then(() => {
      // Save to localStorage
      this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
      
      this.editingUploadedVideoTitle = false;
      this.savingVideoTitle = false;
      this.toastr?.success?.(
        this.currentLang === 'ar' 
          ? 'تم تحديث عنوان الفيديو بنجاح' 
          : 'Video title updated successfully'
      );
      this.cdr.detectChanges();
    }).catch((error) => {
      console.error('Error updating video title:', error);
      this.savingVideoTitle = false;
      this.toastr?.error?.(
        this.currentLang === 'ar' 
          ? 'فشل في تحديث عنوان الفيديو' 
          : 'Failed to update video title'
      );
      this.cdr.detectChanges();
    });
  }

  cancelEditUploadedVideoTitle(): void {
    this.editingUploadedVideoTitle = false;
    // Restore original title
    if (this.selectedBlock) {
      this.uploadedVideoTitle = this.selectedBlock.title || '';
    }
    this.cdr.detectChanges();
  }

  deleteUploadedVideo(): void {
    if (!this.selectedBlock || !this.selectedBlock.meta?.['videoUrl']) {
      return;
    }

    // Show delete confirmation modal
    this.showDeleteVideoModal = true;
    this.cdr.detectChanges();
  }

  confirmDeleteVideo(): void {
    if (!this.selectedBlock || !this.selectedBlock.meta?.['videoUrl']) {
      return;
    }

    this.deletingBlockVideo = true;

    const videoUrl = this.selectedBlock.meta['videoUrl'] as string;
    const assetId = this.selectedBlock.asset_id;

    // Delete from S3
    this.ai.deleteDraftContentVideos([videoUrl]).subscribe({
      next: () => {
        console.log('Video deleted from S3:', videoUrl);
        
        // Remove video metadata from block
        if (this.selectedBlock) {
          this.selectedBlock.title = null;
          this.selectedBlock.asset_id = null;
          this.selectedBlock.meta = {
            ...this.selectedBlock.meta,
            videoUrl: undefined,
            videoFileName: undefined,
            videoFileSize: undefined,
            videoDuration: undefined,
            videoThumbnail: undefined,
            videoWidth: undefined,
            videoHeight: undefined,
            assetId: undefined
          };

          // Save to database
          this.saveBlockToDatabase(this.selectedBlock).then(() => {
            // Save to localStorage
            this.saveLessonBlocksToLocalStorage(this.currentLessonContentId);
            
            // Clear local state
            this.uploadedVideoFile = null;
            this.uploadedVideoMetadata = null;
            this.uploadedVideoTitle = '';
            
            this.deletingBlockVideo = false;
            this.toastr?.success?.(
              this.currentLang === 'ar' 
                ? 'تم حذف الفيديو بنجاح' 
                : 'Video deleted successfully'
            );
            
            // Close delete modal
            this.showDeleteVideoModal = false;
            this.cdr.detectChanges();
          }).catch((error) => {
            console.error('Error updating block after video deletion:', error);
            this.deletingBlockVideo = false;
            this.toastr?.error?.(
              this.currentLang === 'ar' 
                ? 'فشل في تحديث الكتلة بعد حذف الفيديو' 
                : 'Failed to update block after video deletion'
            );
            this.showDeleteVideoModal = false;
            this.cdr.detectChanges();
          });
        }
      },
      error: (error) => {
        console.error('Error deleting video from S3:', error);
        this.deletingBlockVideo = false;
        this.toastr?.error?.(
          this.currentLang === 'ar' 
            ? 'فشل في حذف الفيديو' 
            : 'Failed to delete video'
        );
        this.showDeleteVideoModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelDeleteVideo(): void {
    this.showDeleteVideoModal = false;
    this.cdr.detectChanges();
  }

  // Save block to database
  private saveBlockToDatabase(block: ContentBlock): Promise<void> {
    if (!this.currentLessonContentId) {
      return Promise.resolve();
    }

    // Find the section that contains this content
    let sectionId: number | string | null = null;
    for (const section of this.sections) {
      if (section.content_items && section.content_items.some(item => String(item.id) === String(this.currentLessonContentId))) {
        sectionId = section.id;
        break;
      }
    }

    if (!sectionId) {
      console.warn('Section not found for content:', this.currentLessonContentId);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Check if block has a database ID (numeric) or is a draft (string starting with 'draft-')
      const isDraft = typeof block.id === 'string' && block.id.startsWith('draft-');

      if (isDraft) {
        // Create new block
        this.ai.createContentBlock(sectionId!, this.currentLessonContentId!, {
          block_type: block.block_type,
          title: block.title,
          body_html: block.body_html,
          asset_id: block.asset_id,
          meta: block.meta || {},
          position: block.position
        }).subscribe({
          next: (response) => {
            // Update block with database ID
            block.id = response.content.id;
            resolve();
          },
          error: (error) => {
            console.error('Error creating block in database:', error);
            reject(error);
          }
        });
      } else {
        // Update existing block
        if (!block.id) {
          console.warn('Cannot update block: block.id is undefined');
          reject(new Error('Block ID is required for update'));
          return;
        }
        
        this.ai.updateContentBlock(sectionId!, this.currentLessonContentId!, block.id, {
          title: block.title,
          body_html: block.body_html,
          asset_id: block.asset_id,
          meta: block.meta || {},
          position: block.position
        }).subscribe({
          next: () => {
            resolve();
          },
          error: (error) => {
            console.error('Error updating block in database:', error);
            reject(error);
          }
        });
      }
    });
  }
}
