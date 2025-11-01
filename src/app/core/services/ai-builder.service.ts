import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CourseDraft {
  version: number;
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
  private readonly key = 'anataleb.courseDraft';
  private readonly baseUrl = environment.apiUrl;

  readDraft(): CourseDraft {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) as CourseDraft : { version: 1 };
    } catch {
      return { version: 1 };
    }
  }

  getDraft(): CourseDraft {
    return this.readDraft();
  }

  saveDraft(patch: Partial<CourseDraft>): void {
    const current = this.readDraft();
    const merged: CourseDraft = { ...current, ...patch, last_saved_at: new Date().toISOString() } as CourseDraft;
    localStorage.setItem(this.key, JSON.stringify(merged));
  }

  clearDraft(): void {
    localStorage.removeItem(this.key);
  }

  getTitles(payload: { category_id: number; stage_id?: number; country_id?: number; locale: string; term?: number; mode?: 'curriculum' | 'general'; category_name?: string; date?: string }): Observable<{ titles: { title: string; rationale: string }[]; cached?: boolean; provider?: string }>{
    // Use OpenAI GPT-4o mini
    return this.http.post<{ titles: { title: string; rationale: string }[]; cached?: boolean; provider?: string }>(`${this.baseUrl}/ai/titles`, payload);
  }

  getUnits(payload: { category_id: number; course_name?: string; stage_id?: number; country_id?: number; locale?: string }): Observable<{ units: { name: string; order: number }[] }> {
    return this.http.post<{ units: { name: string; order: number }[] }>(`${this.baseUrl}/ai/units`, payload);
  }
}

