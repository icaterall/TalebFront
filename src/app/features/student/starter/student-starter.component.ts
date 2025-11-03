import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { AiBuilderService, CourseDraft, ContentItem, Section } from '../../../core/services/ai-builder.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { CKEditor5CustomUploadAdapter } from './custom-uploader';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order?: number;
}

@Component({
  selector: 'app-student-starter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule,CKEditorModule],
  templateUrl: './student-starter.component.html',
  styleUrls: ['./student-starter.component.scss']
})
export class StudentStarterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly ai = inject(AiBuilderService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly baseUrl = environment.apiUrl;
  
  private languageChangeSubscription?: Subscription;

  // Step Management
  currentStep: number = 1; // 1 = Category, 2 = Course Basics
  step2Locked: boolean = false; // Track if Step 2 inputs are locked after continue
  showWarningModal: boolean = false; // Track warning modal visibility
  warningModalType: 'goBack' | 'deleteContent' | null = null; // Track warning modal type
  itemToDelete: string | null = null; // Track which content item is being deleted
  showContentTypeModal: boolean = false; // Track content type modal visibility
  selectedContentType: 'video' | 'resources' | 'text' | 'audio' | 'quiz' | null = null; // Track selected content type
  showTextEditor: boolean = false; // Track text editor visibility
  textContent: string = ''; // Store text editor content
  subsectionTitle: string = ''; // Store subsection title
  generatingWithAI: boolean = false; // Track AI generation status
  showAIHintModal: boolean = false; // Track AI hint modal visibility
  aiHint: string = ''; // Store optional AI hint
  
  // Section Management
  sections: Section[] = []; // Store all sections
  activeSectionId: string | null = null; // Currently active/selected section
  
  // Content Management (legacy - will migrate to sections)
  contentItems: ContentItem[] = []; // Store all content items for backward compatibility
  viewingContentItem: ContentItem | null = null; // Track which content item is being viewed
  
  // Editing States
  editingCourseName: boolean = false; // Track if editing course name
  editingSection: boolean = false; // Track if editing section
  editingCourseNameValue: string = ''; // Temp value for editing course name
  editingSectionValue: string = ''; // Temp value for editing section
  editingSectionId: string | null = null; // Track which section is being edited
  
  // Section Menu
  showSectionMenu: boolean = false; // Track section menu visibility
  menuSectionId: string | null = null; // Track which section's menu is open
  
  // Delete Section
  showDeleteSectionModal: boolean = false; // Track delete section modal visibility
  sectionToDelete: Section | null = null; // Track which section is being deleted
  
  // Undo Toast
  showUndoToast: boolean = false; // Track undo toast visibility
  deletedSection: Section | null = null; // Store deleted section for undo
  undoToastTimeout: any = null; // Timeout for auto-hiding undo toast

  // Step 1: Category Selection
  loading = false;
  loadingSummaryData: boolean = false; // Track if summary data is being loaded from localStorage
  smartSix: Category[] = [];
  allCategories: Category[] = [];
  selectedCategory: Category | null = null;
  selectedCategoryId: number | null = null;

  // Step 2: Course Basics
  courseName: string = '';
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
        '|',
        'alignment',
        '|',
        'outdent',
        'indent',
        '|',
        'link',
        'imageUpload',
        'insertTable',
        '|',
        'blockQuote',
        'codeBlock',
        '|',
        'undo',
        'redo'
      ]
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify']
    },
    language: 'en'
  };

  get currentLang(): 'ar' | 'en' { return this.i18n.current; }
  get isRTL(): boolean { return this.currentLang === 'ar'; }
  get canContinue(): boolean {
    if (this.currentStep === 1) {
      // In Step 1, require category AND course name (min 3 chars) AND topic selected
      const hasTopic = this.selectedTopic.trim().length > 0 || (this.availableTopics.length === 0 && this.subjectSlug.trim().length > 0);
      return this.selectedCategory !== null && 
             this.courseName.trim().length >= 3 &&
             hasTopic;
    }
    if (this.currentStep === 2) {
      return this.courseName.trim().length >= 3 && 
             this.subjectSlug.trim().length > 0;
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
    this.student = this.universalAuth.getCurrentUser();
    
    // Detect current term from date (Term 1: Sept-Feb, Term 2: Mar-Aug)
    this.currentTerm = this.detectTerm();
    
    // Set loading state for summary data
    this.loadingSummaryData = true;
    
    // Load existing draft to restore state (using user ID)
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    if (draft.category_id) {
      // Keep on Step 1 but restore locked state if Step 1 was completed
      this.selectedCategoryId = draft.category_id;
      // Don't try to find category yet - allCategories might not be loaded
      // This will be done in loadAllCategories after categories are fetched
      
      // Restore step 1 and step 2 data
      if (draft.name) {
        this.courseName = draft.name;
      }
      if (draft.subject_slug) {
        this.subjectSlug = draft.subject_slug;
        this.selectedTopic = draft.subject_slug;
      }
      if (draft.mode) this.courseMode = draft.mode;
      if (draft.context?.term) this.currentTerm = draft.context.term;
      
      // If draft has both category and course name, it means Step 1 was completed (Continue clicked)
      // Restore the locked state to show read-only summary
      if (draft.category_id && draft.name && draft.name.trim().length >= 3) {
        this.step2Locked = true;
        this.currentStep = 1; // Stay on Step 1 but show read-only summary
      } else {
        this.currentStep = 2; // If category selected but no name yet, go to step 2
      }
      
      // After loading title suggestions, restore topics if available
      // This will be done in loadTitleSuggestions callback
    }
    
    // Load profile first, then fetch categories based on profile data
    this.loadProfileFromBackend();
    this.loadAllCategories();
    
    // Initialize sections from draft (after data is loaded)
    setTimeout(() => {
      this.initializeSections();
    }, 500);
    
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
  }

  ngOnDestroy(): void {
    if (this.languageChangeSubscription) {
      this.languageChangeSubscription.unsubscribe();
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
    editor.plugins.get( 'FileRepository' ).createUploadAdapter = ( loader: any ) => {
      return new CKEditor5CustomUploadAdapter( loader);
   };
   
    const element = editor.ui.getEditableElement()!;
    const parent = element.parentElement!;
    
    // Function to enforce direction
    const enforceDirection = () => {
      const direction = this.isRTL ? 'rtl' : 'ltr';
      
      // Force set direction on editable element (but NOT text-align, let alignment plugin handle it)
      if (element) {
        element.setAttribute('dir', direction);
        element.style.direction = direction;
        // Don't set textAlign here - let CKEditor alignment plugin handle it
        // Override lang if it conflicts
        if (this.isRTL && element.getAttribute('lang') === 'en') {
          element.setAttribute('lang', 'ar');
        } else if (!this.isRTL && element.getAttribute('lang') === 'ar') {
          element.setAttribute('lang', 'en');
        }
        
        // Force direction on all child elements (but NOT text-align)
        const childElements = element.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, ul, ol, blockquote, span');
        childElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.direction = direction;
          // Don't force textAlign - let alignment plugin handle it
        });
      }
      
      // Set direction on toolbar
      const toolbar = editor.ui.view.toolbar.element;
      if (toolbar) {
        toolbar.setAttribute('dir', direction);
        toolbar.style.direction = direction;
      }
    };
    
    // Enforce direction immediately
    enforceDirection();
    
    // Enforce direction after a short delay (in case CKEditor resets it)
    setTimeout(enforceDirection, 100);
    setTimeout(enforceDirection, 500);
    
    // Listen to editor changes and re-enforce direction
    editor.model.document.on('change', () => {
      setTimeout(enforceDirection, 0);
    });
    
    // Also use interval to continuously enforce (in case CKEditor keeps resetting)
    const directionInterval = setInterval(() => {
      if (element && element.getAttribute('dir') !== (this.isRTL ? 'rtl' : 'ltr')) {
        enforceDirection();
      }
    }, 1000);
    
    // Clear interval when editor is destroyed
    editor.on('destroy', () => {
      clearInterval(directionInterval);
    });

    parent.insertBefore(
      editor.ui.view.toolbar.element!,
      element
    );
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
      // Check if course name matches a title card with topics
      const titleCard = this.courseTitleSuggestions.find(t => t.title === this.courseName);
      if (titleCard && titleCard.topics && titleCard.topics.length > 0) {
        // If matches a title card, use its topics
        this.availableTopics = titleCard.topics.slice(0, 4);
        if (!this.selectedTopic && this.availableTopics.length > 0) {
          this.selectedTopic = this.availableTopics[0];
          this.subjectSlug = this.selectedTopic;
        }
      } else if (!titleCard) {
        // If manually typed and doesn't match a title card, clear topics
        this.availableTopics = [];
        this.selectedTopic = '';
        this.subjectSlug = '';
      }
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
    if (this.selectedCategory) {
      this.loadTitleSuggestions();
    }
    this.saveDraftStep2();
  }

  // Toggle term (Term 1 <-> Term 2)
  toggleTerm(): void {
    this.currentTerm = this.currentTerm === 1 ? 2 : 1;
    if (this.selectedCategory) {
      this.loadTitleSuggestions();
    }
    this.saveDraftStep2();
  }

  continue(): void {
    if (this.currentStep === 1) {
      if (!this.canContinue || !this.selectedCategory || this.courseName.trim().length < 3) return;

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
      
      // Lock Step 2 inputs immediately - hide them and show read-only values
      // Stay on Step 1 and show read-only summary (don't move to Step 2 yet)
      this.step2Locked = true;
      
      // Force immediate change detection to hide inputs and show summary
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      
      // Force another change detection in next tick to ensure view updates
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 10);
    } else if (this.currentStep === 2) {
      if (!this.canContinue) return;

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
  }

  // Content Type Modal Methods
  openContentTypeModal(contentType: 'video' | 'resources' | 'text' | 'audio' | 'quiz'): void {
    // For text content, open editor directly instead of modal
    if (contentType === 'text') {
      this.showTextEditor = true;
      this.selectedContentType = 'text';
      this.cdr.detectChanges();
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
      quiz: this.currentLang === 'ar' ? 'إضافة اختبار وواجبات' : 'Add Quiz & Assignments'
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
        ? 'اختر طريقة إنشاء المحتوى للاختبار والواجبات' 
        : 'Choose how to create quiz and assignment content'
    };
    
    return descriptions[this.selectedContentType];
  }

  selectCreationMode(mode: 'ai' | 'manual'): void {
    // TODO: Implement creation mode logic
    // This will navigate to the appropriate content creation page
    console.log(`Selected ${mode} mode for ${this.selectedContentType}`);
    
    // Close modal
    this.closeContentTypeModal();
    
    // Here you would typically navigate to the content creation page
    // For now, we'll just log the action
    // Example: this.router.navigate(['/student/content/create'], { queryParams: { type: this.selectedContentType, mode } });
  }

  // Text Editor Methods
  closeTextEditor(): void {
    this.showTextEditor = false;
    this.selectedContentType = null;
    this.subsectionTitle = '';
    this.textContent = '';
    this.cdr.detectChanges();
  }

  generateTextWithAI(): void {
    if (this.generatingWithAI) return;
    
    // Validate that subsection title is provided
    if (!this.subsectionTitle || this.subsectionTitle.trim().length < 4) {
      return;
    }
    
    // Show hint modal first
    this.aiHint = '';
    this.showAIHintModal = true;
  }
  
  proceedWithAIGeneration(withHint: boolean = false): void {
    // Close hint modal
    this.showAIHintModal = false;
    
    // If user skipped hint, clear it
    if (!withHint) {
      this.aiHint = '';
    }
    
    this.generatingWithAI = true;
    
    // Prepare context data
    const grade = this.stageName || '';
    const country = this.countryName || '';
    const course_name = this.courseName || '';
    const category = this.selectedCategory 
      ? (this.currentLang === 'ar' ? this.selectedCategory.name_ar : this.selectedCategory.name_en)
      : '';
    const section = this.selectedTopic || this.subjectSlug || '';
    const title = this.subsectionTitle.trim();
    const hint = this.aiHint.trim() || undefined; // Only include if provided
    
    const payload: any = {
      grade,
      country,
      course_name,
      category,
      section,
      title,
      locale: this.currentLang
    };
    
    // Add hint only if provided
    if (hint) {
      payload.hint = hint;
    }
    
    console.log('Generating text content with AI...', payload);
    
    // Call backend API
    this.http.post<{ content: string }>(`${this.baseUrl}/ai/content/text`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.currentLang === 'ar' ? 'ar' : 'en'
      }
    }).subscribe({
      next: (response) => {
        this.textContent = response.content || '<p>No content generated.</p>';
        this.generatingWithAI = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('AI text generation error:', error);
        this.textContent = `<p>${this.currentLang === 'ar' ? 'فشل في إنشاء المحتوى. يرجى المحاولة مرة أخرى.' : 'Failed to generate content. Please try again.'}</p>`;
        this.generatingWithAI = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  cancelAIHint(): void {
    this.showAIHintModal = false;
    this.aiHint = '';
  }

  saveTextContent(): void {
    // Validate that subsection title is provided
    if (!this.subsectionTitle || !this.subsectionTitle.trim()) {
      return;
    }
    
    const userId = this.student?.id || this.student?.user_id;
    
    // Determine active section (use activeSectionId or first section)
    const activeSection = this.getActiveSection() || this.sections[0];
    
    // If viewing an existing content item, update it
    if (this.viewingContentItem && this.viewingContentItem.id) {
      if (activeSection) {
        // Update in active section
        const itemIndex = activeSection.content_items.findIndex(item => item.id === this.viewingContentItem!.id);
        if (itemIndex >= 0) {
          activeSection.content_items[itemIndex] = {
            ...activeSection.content_items[itemIndex],
            title: this.subsectionTitle.trim(),
            content: this.textContent,
            updatedAt: new Date().toISOString()
          };
          activeSection.updatedAt = new Date().toISOString();
        }
      }
      
      // Also update in legacy contentItems for backward compatibility
      this.updateContentItem(
        this.viewingContentItem.id,
        this.subsectionTitle.trim(),
        this.textContent
      );
    } else {
      // Create new content item
      const contentItem: ContentItem = {
        id: `content-${Date.now()}`,
        type: 'text',
        title: this.subsectionTitle.trim(),
        content: this.textContent,
        section_id: activeSection?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to active section if exists
      if (activeSection) {
        activeSection.content_items.push(contentItem);
        activeSection.updatedAt = new Date().toISOString();
        this.saveSections();
      }
      
      // Also add to legacy contentItems for backward compatibility
      this.contentItems.push(contentItem);
      
      // Save to localStorage
      const draft = this.ai.getDraft(userId);
      this.ai.saveDraft({
        ...draft,
        content_items: this.contentItems
      }, userId);
    }
    
    // Reset viewing item and close editor
    this.viewingContentItem = null;
    this.closeTextEditor();
    this.cdr.detectChanges();
  }
  
  // Edit Course Name
  startEditingCourseName(): void {
    this.editingCourseName = true;
    this.editingCourseNameValue = this.courseName;
  }
  
  saveCourseNameEdit(): void {
    if (this.editingCourseNameValue.trim()) {
      this.courseName = this.editingCourseNameValue.trim();
      this.saveDraftStep2();
      this.editingCourseName = false;
      this.editingCourseNameValue = '';
      this.cdr.detectChanges();
    }
  }
  
  cancelCourseNameEdit(): void {
    this.editingCourseName = false;
    this.editingCourseNameValue = '';
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
    this.viewingContentItem = item;
    if (item.type === 'text') {
      // Open text editor with this content
      this.subsectionTitle = item.title;
      this.textContent = item.content || '<p></p>';
      this.showTextEditor = true;
      this.cdr.detectChanges();
    }
    // TODO: Handle other content types (video, resources, audio, quiz)
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
    this.itemToDelete = itemId;
    this.warningModalType = 'deleteContent';
    this.showWarningModal = true;
  }
  
  // Confirm deletion after warning
  confirmDeleteContent(): void {
    if (!this.itemToDelete) return;
    
    this.contentItems = this.contentItems.filter(item => item.id !== this.itemToDelete);
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    this.ai.saveDraft({
      ...draft,
      content_items: this.contentItems
    }, userId);
    
    this.showWarningModal = false;
    this.warningModalType = null;
    this.itemToDelete = null;
    this.cdr.detectChanges();
  }
  
  // Move Content Item Up
  moveContentItemUp(index: number, sectionId?: string): void {
    // If sectionId provided, move within section
    if (sectionId) {
      const section = this.sections.find(s => s.id === sectionId);
      if (section && index > 0 && index < section.content_items.length) {
        const items = [...section.content_items];
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
        section.content_items = items;
        section.updatedAt = new Date().toISOString();
        this.saveSections();
        this.cdr.detectChanges();
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
        const items = [...section.content_items];
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        section.content_items = items;
        section.updatedAt = new Date().toISOString();
        this.saveSections();
        this.cdr.detectChanges();
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
      this.sections = draft.sections.map(s => ({
        ...s,
        isCollapsed: this.getSectionCollapseState(s.id) ?? s.isCollapsed ?? false
      }));
      return;
    }
    
    // Migrate from legacy contentItems or create first section
    if (this.selectedTopic || this.subjectSlug) {
      const sectionName = this.selectedTopic || this.subjectSlug || '';
      const firstSection: Section = {
        id: `section-${Date.now()}`,
        number: 1,
        name: sectionName,
        content_items: draft.content_items || this.contentItems || [],
        isCollapsed: this.getSectionCollapseState(`section-1`) ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.sections = [firstSection];
      this.activeSectionId = firstSection.id;
      this.saveSections();
    }
  }
  
  // Add New Section
  addNewSection(): void {
    const newSectionNumber = this.sections.length + 1;
    const newSection: Section = {
      id: `section-${Date.now()}`,
      number: newSectionNumber,
      name: `${this.currentLang === 'ar' ? 'القسم' : 'Section'} ${newSectionNumber}`,
      content_items: [],
      isCollapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sections.push(newSection);
    this.activeSectionId = newSection.id;
    this.saveSections();
    this.cdr.detectChanges();
  }
  
  // Toggle Section Fold/Unfold
  toggleSectionFold(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.isCollapsed = !section.isCollapsed;
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
    const duplicatedSection: Section = {
      id: `section-${Date.now()}`,
      number: newSectionNumber,
      name: `${section.name} (${this.currentLang === 'ar' ? 'نسخة' : 'Copy'})`,
      content_items: section.content_items.map(item => ({
        ...item,
        id: `content-${Date.now()}-${Math.random()}`,
        section_id: `section-${Date.now()}`
      })),
      isCollapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sections.push(duplicatedSection);
    this.closeSectionMenu();
    this.saveSections();
    this.cdr.detectChanges();
  }
  
  // Delete Section
  deleteSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    this.sectionToDelete = section;
    this.showDeleteSectionModal = true;
    this.closeSectionMenu();
    this.cdr.detectChanges();
  }
  
  // Confirm Delete Section
  confirmDeleteSection(): void {
    if (!this.sectionToDelete) return;
    
    // Store deleted section for undo
    this.deletedSection = { ...this.sectionToDelete };
    const deletedIndex = this.sections.findIndex(s => s.id === this.sectionToDelete!.id);
    
    // Remove section
    this.sections = this.sections.filter(s => s.id !== this.sectionToDelete!.id);
    
    // Renumber remaining sections
    this.sections.forEach((section, index) => {
      section.number = index + 1;
    });
    
    // If deleted section was active, select first section or null
    if (this.activeSectionId === this.sectionToDelete.id) {
      this.activeSectionId = this.sections.length > 0 ? this.sections[0].id : null;
    }
    
    this.saveSections();
    this.showDeleteSectionModal = false;
    this.sectionToDelete = null;
    
    // Show undo toast
    this.showUndoToast = true;
    this.undoToastTimeout = setTimeout(() => {
      this.hideUndoToast();
    }, 5000); // Auto-hide after 5 seconds
    
    this.cdr.detectChanges();
  }
  
  // Undo Delete Section
  undoDeleteSection(): void {
    if (!this.deletedSection) return;
    
    // Restore section
    this.sections.push(this.deletedSection);
    this.sections.sort((a, b) => a.number - b.number);
    
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
  
  // Save Sections to localStorage
  private saveSections(): void {
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    this.ai.saveDraft({
      ...draft,
      sections: this.sections
    }, userId);
  }
  
  // Update Section Name (from edit)
  updateSectionName(): void {
    if (!this.editingSectionId || !this.editingSectionValue.trim()) return;
    
    const section = this.sections.find(s => s.id === this.editingSectionId);
    if (section) {
      section.name = this.editingSectionValue.trim();
      section.updatedAt = new Date().toISOString();
      
      // Also update selectedTopic/subjectSlug if this is the first section
      if (section.number === 1) {
        this.selectedTopic = section.name;
        this.subjectSlug = section.name;
      }
      
      this.saveSections();
      this.saveDraftStep2();
      this.editingSection = false;
      this.editingSectionId = null;
      this.editingSectionValue = '';
      this.cdr.detectChanges();
    }
  }
  
  // Get Section by ID
  getSection(sectionId: string): Section | undefined {
    return this.sections.find(s => s.id === sectionId);
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
        this.addNewSection();
      }
    }
    
    // Backspace on selected header → open delete dialog
    if (event.key === 'Backspace' && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLElement;
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


  loadTitleSuggestions(): void {
    if (!this.selectedCategory || !this.student) return;
    
    this.loadingTitles = true;
    const payload = {
      category_id: this.selectedCategory.id,
      stage_id: this.courseMode === 'curriculum' ? (this.student?.education_stage_id ?? this.student?.stage_id) : undefined,
      country_id: this.courseMode === 'curriculum' ? this.student?.country_id : undefined,
      locale: this.currentLang,
      term: this.courseMode === 'curriculum' ? this.currentTerm : undefined,
      mode: this.courseMode,
      category_name: this.getCategoryName(this.selectedCategory),
      date: new Date().toISOString() // Pass current date for term detection
    };

    console.log('Loading title suggestions with payload:', payload);

    this.ai.getTitles(payload).subscribe({
      next: (res) => {
        this.courseTitleSuggestions = (res.titles || []).map(t => ({
          title: t.title,
          rationale: t.rationale,
          topics: t.topics || []
        }));
        this.loadingTitles = false;
        
        // Restore topics if course name matches a title card
        if (this.courseName) {
          const titleCard = this.courseTitleSuggestions.find(t => t.title === this.courseName);
          if (titleCard && titleCard.topics && titleCard.topics.length > 0) {
            this.availableTopics = titleCard.topics.slice(0, 4);
            if (!this.selectedTopic || !this.availableTopics.includes(this.selectedTopic)) {
              // If subjectSlug exists, try to match it
              if (this.subjectSlug) {
                const matchingTopic = this.availableTopics.find(t => t === this.subjectSlug);
                this.selectedTopic = matchingTopic || this.availableTopics[0];
                this.subjectSlug = this.selectedTopic;
              } else {
                this.selectedTopic = this.availableTopics[0];
                this.subjectSlug = this.selectedTopic;
              }
            }
          }
        }
        
        this.cdr.detectChanges();
        console.log(`Title suggestions loaded (provider: ${res.provider || 'openai'}):`, this.courseTitleSuggestions.length);
        console.log('Title suggestions with topics:', this.courseTitleSuggestions.map(t => ({ title: t.title, topicsCount: t.topics?.length || 0 })));
      },
      error: (err) => {
        console.error('Failed to load title suggestions:', err);
        this.loadingTitles = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectTitleSuggestion(titleCard: { title: string; rationale?: string; topics?: string[] }): void {
    this.courseName = titleCard.title;
    
    console.log('Selected title card:', titleCard);
    console.log('Title card topics:', titleCard.topics);
    
    // Set available topics from title card (exactly 4 topics)
    if (titleCard.topics && Array.isArray(titleCard.topics) && titleCard.topics.length > 0) {
      this.availableTopics = titleCard.topics.slice(0, 4);
      console.log('Available topics set:', this.availableTopics);
      // Don't auto-select - let user choose from the 4 topics
      // Clear any previously selected topic when a new title is selected
      this.selectedTopic = '';
      this.subjectSlug = '';
    } else {
      console.warn('No topics found in title card');
      this.availableTopics = [];
      this.selectedTopic = '';
      this.subjectSlug = '';
    }
    
    this.saveDraftStep2();
    this.cdr.detectChanges(); // Force view update to show topics
    
    // Log state after change detection
    setTimeout(() => {
      console.log('After selectTitleSuggestion - availableTopics:', this.availableTopics);
      console.log('After selectTitleSuggestion - selectedTopic:', this.selectedTopic);
    }, 100);
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

  getCategoryName(cat: Category): string {
    return this.currentLang === 'ar' ? cat.name_ar : cat.name_en;
  }
}

