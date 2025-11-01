import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { I18nService } from '../../../core/services/i18n.service';
import { UniversalAuthService } from '../../../core/services/universal-auth.service';
import { AiBuilderService, CourseDraft } from '../../../core/services/ai-builder.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';

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
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule],
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

  // Step 1: Category Selection
  loading = false;
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
    
    // Load existing draft to restore state (using user ID)
    const userId = this.student?.id || this.student?.user_id;
    const draft = this.ai.getDraft(userId);
    if (draft.category_id) {
      // Keep on Step 1 but restore locked state if Step 1 was completed
      this.selectedCategoryId = draft.category_id;
      this.selectedCategory = this.allCategories.find(c => c.id === draft.category_id) || null;
      
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
            // Fallback to localStorage data if API fails
            this.profileLoaded = true;
            this.loadSmartSix();
          }
        }
      });
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
              
              // If draft has both category and course name, restore locked state
              if (draft.name && draft.name.trim().length >= 3) {
                this.step2Locked = true;
                this.currentStep = 1; // Stay on Step 1 but show read-only summary
              }
              
              // Force change detection to update view
              this.cdr.detectChanges();
            }
          }
        },
        error: (err) => {
          console.error('Failed to load all categories:', err);
          this.allCategories = [];
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
    this.currentStep = 1;
    this.clearStep2Data();
  }

  cancelGoBack(): void {
    // User cancelled - just close modal
    this.showWarningModal = false;
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
    // If already editing this topic, clicking again saves it and exits edit mode
    if (this.editingTopic === topic) {
      this.saveTopicEdit();
      this.cdr.detectChanges();
      return;
    }
    
    // If switching to a different topic while editing, cancel current edit and start editing the new topic
    if (this.editingTopic && this.editingTopic !== topic) {
      // Cancel current edit (don't save) - just reset editing state
      this.editingTopic = null;
      this.editingTopicValue = '';
      
      // Start editing the new topic
      this.editingTopic = topic;
      this.editingTopicValue = topic;
      this.selectedTopic = topic;
      this.subjectSlug = topic;
      this.cdr.detectChanges();
      
      // Focus the input after view update
      setTimeout(() => {
        const input = document.querySelector('.topic-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 0);
      return;
    }
    
    // First click on a topic (no current editing): Enable editing mode immediately
    this.editingTopic = topic;
    this.editingTopicValue = topic;
    this.selectedTopic = topic; // Pre-select it
    this.subjectSlug = topic;
    this.cdr.detectChanges();
    
    // Focus the input after view update
    setTimeout(() => {
      const input = document.querySelector('.topic-input') as HTMLInputElement;
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

