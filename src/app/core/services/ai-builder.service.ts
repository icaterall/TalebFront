import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  mode?: 'curriculum' | 'general'; // curriculum or general skills
  context?: {
    stage_id?: number;
    country_id?: number;
    term?: number; // 1 or 2
  };
  units?: { id: string; name: string; order?: number }[];
  objectives?: string[];
  sections?: any[];
  quiz?: any[];
  cover_image_url?: string;
  last_saved_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AiBuilderService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
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

  getTitles(payload: { category_id: number; stage_id?: number; country_id?: number; locale: string; term?: number; mode?: 'curriculum' | 'general'; category_name?: string; date?: string }): Observable<{ titles: { title: string; rationale?: string; topics?: string[] }[]; cached?: boolean; provider?: string }>{
    // Use OpenAI GPT-4o mini
    return this.http.post<{ titles: { title: string; rationale?: string; topics?: string[] }[]; cached?: boolean; provider?: string }>(`${this.baseUrl}/ai/titles`, payload);
  }

  getUnits(payload: { category_id: number; course_name?: string; stage_id?: number; country_id?: number; locale?: string }): Observable<{ units: { name: string; order: number }[] }> {
    return this.http.post<{ units: { name: string; order: number }[] }>(`${this.baseUrl}/ai/units`, payload);
  }
}

