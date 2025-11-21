import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { SectionComposerService } from '../../../../core/services/section-composer.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ContentBlock {
  id?: string;
  type: 'text' | 'audio' | 'video' | 'file' | 'image';
  title: string;
  hint?: string;
  content?: any; // HTML for text, URL for video/audio
  meta?: any;
}

interface Section {
  id?: string;
  name: string;
  description?: string;
  blocks: ContentBlock[];
}

@Component({
  selector: 'app-section-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule, CKEditorModule],
  templateUrl: './section-composer.component.html',
  styleUrls: ['./section-composer.component.scss']
})
export class SectionComposerComponent implements OnInit {
  @Input() courseId!: number;
  @Input() courseData: any; // { name, grade, subject, country, ... }
  @Output() save = new EventEmitter<any>();

  sections: Section[] = [];
  activeSection: Section | null = null;
  
  // UI States
  isAddingSection = false;
  newSectionName = '';
  isSuggestingName = false;
  
  // Content Suggestions
  suggestedContent: any[] = [];
  isLoadingSuggestions = false;

  // Editor State
  activeContentBlock: ContentBlock | null = null;
  editorType: 'text' | 'audio' | 'video' | null = null;
  
  // CKEditor
  public Editor = DecoupledEditor;
  public editorConfig = {
    toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'insertTable', '|', 'undo', 'redo' ]
  };

  // Audio/Video State
  audioText = '';
  selectedVoice = 'Zeina';
  audioSpeed = 1.0;
  isGeneratingAudio = false;
  
  videoSearchQuery = '';
  suggestedVideos: any[] = [];
  isLoadingVideos = false;

  constructor(
    private composerService: SectionComposerService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Check if courseId is passed via route
    const routeId = this.route.snapshot.paramMap.get('courseId');
    if (routeId) {
      this.courseId = +routeId;
      this.fetchCourseDetails();
    }
  }

  fetchCourseDetails() {
    this.http.get(`${environment.apiUrl}/courses/${this.courseId}/preview`).subscribe((res: any) => {
      if (res.success) {
        this.courseData = res.data.course;
        // Map existing sections if any
        this.sections = res.data.sections.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          blocks: s.content.map((c: any) => ({
            id: c.id,
            type: c.type,
            title: c.title,
            content: c.body_html || c.meta?.url || '',
            meta: c.meta
          }))
        }));
        if (this.sections.length > 0) {
          this.selectSection(this.sections[0]);
        }
      }
    });
  }

  public onReady(editor: any) {
    editor.ui.getEditableElement().parentElement.insertBefore(
      editor.ui.view.toolbar.element,
      editor.ui.getEditableElement()
    );
  }

  // --- Section Management ---

  startAddSection() {
    this.isAddingSection = true;
    this.newSectionName = '';
    this.suggestSectionName();
  }

  suggestSectionName() {
    if (!this.courseData) return;
    this.isSuggestingName = true;
    this.composerService.suggestSectionName(this.courseData).subscribe({
      next: (res) => {
        this.newSectionName = res.name;
        this.isSuggestingName = false;
      },
      error: () => this.isSuggestingName = false
    });
  }

  saveSection() {
    if (!this.newSectionName) return;
    const newSection: Section = {
      name: this.newSectionName,
      blocks: []
    };
    this.sections.push(newSection);
    this.activeSection = newSection;
    this.isAddingSection = false;
    this.loadContentSuggestions(newSection);
  }

  selectSection(section: Section) {
    this.activeSection = section;
    // If empty, maybe load suggestions?
    if (section.blocks.length === 0) {
      this.loadContentSuggestions(section);
    }
  }

  // --- Content Suggestions ---

  loadContentSuggestions(section: Section) {
    this.isLoadingSuggestions = true;
    this.composerService.suggestContentTitles({
      section_name: section.name,
      course_name: this.courseData?.name,
      grade: this.courseData?.grade,
      country: this.courseData?.country
    }).subscribe({
      next: (res) => {
        this.suggestedContent = res.blocks;
        this.isLoadingSuggestions = false;
      },
      error: () => this.isLoadingSuggestions = false
    });
  }

  useSuggestion(suggestion: any) {
    // Open modal to choose type
    this.activeContentBlock = {
      type: 'text', // Default
      title: suggestion.title,
      hint: suggestion.hint,
      content: ''
    };
    // Trigger modal open (handled in template via *ngIf or similar)
    this.editorType = null; // User needs to choose
  }

  // --- Content Editing ---

  chooseType(type: 'text' | 'audio' | 'video') {
    this.editorType = type;
    if (this.activeContentBlock) {
      this.activeContentBlock.type = type;
    }
  }

  // Text AI Generation
  generateTextWithAI() {
    if (!this.activeContentBlock) return;
    // Call AI to generate text based on hint
    this.composerService.generateTextContent({
      title: this.activeContentBlock.title,
      hint: this.activeContentBlock.hint,
      course_name: this.courseData?.name,
      section: this.activeSection?.name
    }).subscribe(res => {
      if (this.activeContentBlock) {
        this.activeContentBlock.content = res.content;
      }
    });
  }

  // Audio Generation
  generateAudio() {
    if (!this.audioText) return;
    this.isGeneratingAudio = true;
    this.composerService.generateAudio({
      text: this.audioText,
      voice: this.selectedVoice,
      speed: this.audioSpeed
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (this.activeContentBlock) {
          this.activeContentBlock.content = url; // Store URL for preview
          this.activeContentBlock.meta = { text: this.audioText, voice: this.selectedVoice };
        }
        this.isGeneratingAudio = false;
      },
      error: () => this.isGeneratingAudio = false
    });
  }

  // Video Suggestions
  suggestVideos() {
    if (!this.activeContentBlock) return;
    this.isLoadingVideos = true;
    this.composerService.suggestYouTubeVideos({
      title: this.activeContentBlock.title,
      hint: this.activeContentBlock.hint,
      course_name: this.courseData?.name,
      section_name: this.activeSection?.name
    }).subscribe({
      next: (res) => {
        this.suggestedVideos = res.videos;
        this.isLoadingVideos = false;
      },
      error: () => this.isLoadingVideos = false
    });
  }

  selectVideo(video: any) {
    if (this.activeContentBlock) {
      this.activeContentBlock.content = video.url;
      this.activeContentBlock.meta = video;
    }
  }

  saveContentBlock() {
    if (this.activeSection && this.activeContentBlock) {
      this.activeSection.blocks.push({ ...this.activeContentBlock });
      this.activeContentBlock = null;
      this.editorType = null;
      // Remove from suggestions if it was one?
    }
  }

  cancelEdit() {
    this.activeContentBlock = null;
    this.editorType = null;
  }

  // --- Reordering ---

  drop(event: CdkDragDrop<string[]>) {
    if (this.activeSection) {
      moveItemInArray(this.activeSection.blocks, event.previousIndex, event.currentIndex);
    }
  }
}
