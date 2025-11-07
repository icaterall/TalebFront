import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
}

export interface ContentItem {
  id: string;
  type: 'text' | 'video' | 'resources' | 'audio' | 'quiz';
  title: string;
  content?: string; // For text content
  createdAt: string;
  updatedAt?: string;
  section_id?: string; // Link content to section
  resourceDetails?: ResourceDetails;
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
  cover_image_url?: string;
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
}

