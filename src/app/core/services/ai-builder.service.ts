import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ResourceDetails {
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string;
  dataUrl?: string; // Stored as base64 for inline preview/download
  previewMode?: 'inline' | 'download';
  previewDataUrl?: string; // Derived preview data when different from dataUrl (e.g., generated thumbnails)
  kind?: string; // e.g., pdf, word, excel
  pageCount?: number;
  downloadUrl?: string;
  storageKey?: string;
  assetId?: number | null;
  storage?: string;
}

export interface ContentItem {
  id: string;
  type: 'text' | 'video' | 'resources' | 'audio' | 'quiz';
  title: string;
  content?: string; // For text content
  createdAt: string;
  updatedAt?: string;
  section_id?: string; // Link content to section
  position?: number;
  status?: boolean;
  meta?: Record<string, unknown> | null;
  resourceDetails?: ResourceDetails;
  assets?: ContentAsset[];
}

export interface SectionContentRecord {
  id: number;
  course_id: number;
  section_id: number;
  type: string;
  title: string;
  body_html?: string | null;
  position: number;
  meta?: Record<string, unknown> | null;
  status: string | boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  assets?: ContentAsset[];
}

export interface ContentAsset {
  id?: number;
  url: string;
  filename?: string | null;
  position?: number | null;
  kind?: string | null;
  mime?: string | null;
  filesize_bytes?: number | null;
  pages?: number | null;
  width?: number | null;
  height?: number | null;
  extra?: Record<string, unknown> | null;
}

export interface SectionContentResponse {
  message?: string;
  content: SectionContentRecord;
}

export interface SectionContentListResponse {
  content: SectionContentRecord[];
}

export interface CreateSectionContentPayload {
  type: string;
  title: string;
  body_html?: string;
  position?: number;
  status?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface Section {
  id: string;
  number: number; // Section number (1, 2, 3, etc.)
  sort_order?: number;
  name: string;
  content_items: ContentItem[];
  isCollapsed?: boolean; // Fold/unfold state
  createdAt: string;
  updatedAt?: string;
}

export interface DraftCourseSectionResponse {
  id: number;
  course_id: number;
  position: number;
  name: string;
  description?: string | null;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DraftCourseResponse {
  course: {
    id: number;
    name: string;
    subject_slug: string;
    country_id: number | null;
    description?: string | null;
    category_id?: number | null;
    user_id: number;
    visibility: string;
    availability: any;
    status: string;
    moderation_state: string;
    moderation_reason?: string | null;
    cover_image_url?: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  sections: DraftCourseSectionResponse[];
}

export interface CreateDraftCoursePayload {
  course: {
    name: string;
    subject_slug?: string;
    category_id?: number;
    country_id?: number;
    description?: string;
    availability?: any;
    cover_image_url?: string | null;
    default_section_name?: string;
  };
  sections?: Array<{
    name: string;
    position?: number;
    description?: string | null;
    available?: boolean;
  }>;
}

export interface UpdateDraftCoursePayload {
  name?: string;
  subject_slug?: string;
  description?: string | null;
  country_id?: number | null;
  availability?: any;
}

export interface CourseDraft {
  version: number;
  user_id?: number; // Current user ID - assigned when saving
  stage_id?: number;
  country_id?: number;
  locale?: string;
  category_id?: number;
  category_name?: string;
  name?: string;
  subject_slug?: string;
  cover_image_url?: string | null;
  mode?: 'curriculum' | 'general'; // curriculum or general skills
  context?: {
    stage_id?: number;
    country_id?: number;
    term?: number; // 1 or 2
  };
  units?: { id: string; name: string; order?: number }[];
  objectives?: string[];
  sections?: Section[]; // Store all sections for the course
  quiz?: any[];
  content_items?: ContentItem[]; // Legacy: store all content items for the course (deprecated, use sections[].content_items)
  last_saved_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AiBuilderService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private auth = inject(AuthService);
  
  // Generate key based on user ID to keep drafts per user
  private getKey(userId?: number): string {
    if (userId) {
      return `anataleb.courseDraft.${userId}`;
    }
    return 'anataleb.courseDraft';
  }

  readDraft(userId?: number): CourseDraft {
    try {
      const key = this.getKey(userId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as CourseDraft : { version: 1 };
    } catch {
      return { version: 1 };
    }
  }

  getDraft(userId?: number): CourseDraft {
    return this.readDraft(userId);
  }

  saveDraft(patch: Partial<CourseDraft>, userId?: number): void {
    const key = this.getKey(userId || patch.user_id);
    const current = this.readDraft(userId || patch.user_id);
    const merged: CourseDraft = { 
      ...current, 
      ...patch, 
      user_id: userId || patch.user_id || current.user_id,
      last_saved_at: new Date().toISOString() 
    } as CourseDraft;
    localStorage.setItem(key, JSON.stringify(merged));
  }

  clearDraft(userId?: number): void {
    const key = this.getKey(userId);
    localStorage.removeItem(key);
    // Also clear default key for backward compatibility
    localStorage.removeItem('anataleb.courseDraft');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getDraftCourse() {
    return this.http.get<DraftCourseResponse>(`${this.baseUrl}/courses/draft`, { headers: this.getAuthHeaders() });
  }

  createDraftCourse(payload: CreateDraftCoursePayload) {
    return this.http.post<DraftCourseResponse>(`${this.baseUrl}/courses/draft`, payload, { headers: this.getAuthHeaders() });
  }

  updateDraftCourse(payload: UpdateDraftCoursePayload): Observable<DraftCourseResponse> {
    return this.http.put<DraftCourseResponse>(`${this.baseUrl}/courses/draft`, payload, { headers: this.getAuthHeaders() });
  }

  uploadDraftCover(file: File): Observable<HttpEvent<DraftCourseResponse>> {
    const formData = new FormData();
    formData.append('cover', file);

    return this.http.post<DraftCourseResponse>(`${this.baseUrl}/courses/draft/cover`, formData, {
      headers: this.getAuthHeaders(),
      reportProgress: true,
      observe: 'events'
    });
  }

  deleteDraftCover(): Observable<DraftCourseResponse> {
    return this.http.delete<DraftCourseResponse>(`${this.baseUrl}/courses/draft/cover`, { headers: this.getAuthHeaders() });
  }

  deleteDraftCourse() {
    return this.http.delete<void>(`${this.baseUrl}/courses/draft`, { headers: this.getAuthHeaders() });
  }

  getTitles(payload: { category_id: number; stage_id?: number; country_id?: number; locale: string; term?: number; mode?: 'curriculum' | 'general'; category_name?: string; date?: string }): Observable<{ titles: { title: string; rationale?: string; topics?: string[] }[]; cached?: boolean; provider?: string }>{
    // Use OpenAI GPT-4o mini
    return this.http.post<{ titles: { title: string; rationale?: string; topics?: string[] }[]; cached?: boolean; provider?: string }>(`${this.baseUrl}/ai/titles`, payload);
  }

  getUnits(payload: { category_id: number; course_name?: string; stage_id?: number; country_id?: number; locale?: string }): Observable<{ units: { name: string; order: number }[] }> {
    return this.http.post<{ units: { name: string; order: number }[] }>(`${this.baseUrl}/ai/units`, payload);
  }

  getSectionContent(sectionId: number | string): Observable<SectionContentListResponse> {
    return this.http.get<SectionContentListResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Sections (Draft) CRUD
  createDraftSection(payload: { name: string; description?: string; available?: boolean }): Observable<DraftCourseResponse> {
    return this.http.post<DraftCourseResponse>(
      `${this.baseUrl}/courses/draft/sections`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateDraftSection(sectionId: number | string, payload: Partial<{ name: string; description?: string; available?: boolean; position?: number }>): Observable<DraftCourseResponse> {
    return this.http.put<DraftCourseResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDraftSection(sectionId: number | string): Observable<DraftCourseResponse> {
    return this.http.delete<DraftCourseResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  reorderDraftSections(sections: Array<{ id: number; position: number }>): Observable<DraftCourseResponse> {
    return this.http.put<DraftCourseResponse>(
      `${this.baseUrl}/courses/draft/sections/reorder`,
      { sections },
      { headers: this.getAuthHeaders() }
    );
  }

  createSectionContent(sectionId: number | string, payload: CreateSectionContentPayload): Observable<SectionContentResponse> {
    return this.http.post<SectionContentResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateSectionContent(sectionId: number | string, contentId: number | string, payload: Partial<CreateSectionContentPayload>): Observable<SectionContentResponse> {
    return this.http.put<SectionContentResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteSectionContent(sectionId: number | string, contentId: number | string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDraftContentImages(keys: string[]): Observable<void> {
    return this.http.request<void>(
      'DELETE',
      `${this.baseUrl}/courses/draft/content/images`,
      {
        headers: this.getAuthHeaders(),
        body: { keys }
      }
    );
  }

  uploadDraftContentResource(file: File, contentId?: number | string): Observable<HttpEvent<UploadResourceResponse>> {
    const formData = new FormData();
    formData.append('resource', file);
    if (contentId !== undefined && contentId !== null) {
      formData.append('content_id', String(contentId));
    }

    return this.http.post<UploadResourceResponse>(
      `${this.baseUrl}/courses/draft/content/resources`,
      formData,
      {
        headers: this.getAuthHeaders(),
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  deleteDraftContentResources(keys: string[]): Observable<void> {
    return this.http.request<void>(
      'DELETE',
      `${this.baseUrl}/courses/draft/content/resources`,
      {
        headers: this.getAuthHeaders(),
        body: { keys }
      }
    );
  }

  // Quiz Question Methods
  getQuizQuestions(sectionId: number | string, contentId: number | string): Observable<QuizQuestionsResponse> {
    return this.http.get<QuizQuestionsResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions`,
      { headers: this.getAuthHeaders() }
    );
  }

  createQuizQuestion(sectionId: number | string, contentId: number | string, payload: CreateQuizQuestionPayload): Observable<QuizQuestionResponse> {
    return this.http.post<QuizQuestionResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateQuizQuestion(sectionId: number | string, contentId: number | string, questionId: number | string, payload: Partial<CreateQuizQuestionPayload>): Observable<QuizQuestionResponse> {
    return this.http.put<QuizQuestionResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions/${questionId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteQuizQuestion(sectionId: number | string, contentId: number | string, questionId: number | string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions/${questionId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  reorderQuizQuestions(sectionId: number | string, contentId: number | string, questions: Array<{ id: number; position: number }>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions/reorder`,
      { questions },
      { headers: this.getAuthHeaders() }
    );
  }

  generateAIQuizQuestions(sectionId: number | string, contentId: number | string, payload: GenerateQuizPayload): Observable<QuizQuestionsResponse> {
    return this.http.post<QuizQuestionsResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/questions/generate`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  submitQuiz(sectionId: number | string, contentId: number | string, answers: Record<number, any>, shuffleMaps?: Record<number, number[]>): Observable<QuizSubmitResponse> {
    return this.http.post<QuizSubmitResponse>(
      `${this.baseUrl}/courses/draft/sections/${sectionId}/content/${contentId}/submit`,
      { answers, shuffleMaps: shuffleMaps || {} },
      { headers: this.getAuthHeaders() }
    );
  }
}

// Quiz Interfaces
export interface QuizQuestion {
  id: number;
  content_id: number;
  question_type: 'mcq' | 'true_false' | 'matching' | 'ordering';
  prompt: string;
  payload: QuizQuestionPayload;
  position: number;
  points: number;
  explanation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionPayload {
  // For MCQ
  choices?: string[];
  correct_index?: number;
  // For True/False
  correct_answer?: boolean;
  // For Matching
  pairs?: Array<{ left: string; right: string }>; // Used in editor (question creation)
  // For Matching (sent as separate arrays in quiz test to hide correct matches)
  leftItems?: string[]; // Shuffled left items (questions) - only in quiz test response
  rightItems?: string[]; // Shuffled right items (options) - only in quiz test response
  // For MCQ shuffle mapping (sent to frontend, used for answer validation)
  choice_shuffle_map?: number[]; // Maps shuffled index to original index
  // For Ordering
  items?: string[];
  correct_order?: number[];
}

export interface CreateQuizQuestionPayload {
  question_type: 'mcq' | 'true_false' | 'matching' | 'ordering';
  prompt: string;
  payload: QuizQuestionPayload;
  explanation?: string | null;
  position?: number;
}

export interface GenerateQuizPayload {
  question_count?: number;
  allowed_types?: string[];
}

export interface QuizQuestionsResponse {
  message?: string;
  questions: QuizQuestion[];
  errors?: string[];
}

export interface QuizQuestionResponse {
  message: string;
  question: QuizQuestion;
}

export interface QuizSubmitResponse {
  score: number;
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  questionResults: Array<{
    questionId: number;
    isCorrect: boolean;
    points: number;
  }>;
}

export interface UploadResourceResponse {
  message: string;
  asset: {
    id: number | null;
    url: string;
    key: string;
    mime: string;
    filename: string;
    size: number;
    position: number | null;
    kind?: string | null;
  };
}

