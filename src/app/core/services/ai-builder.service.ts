import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CourseDraft {
  version: number;
  stage_id?: number;
  country_id?: number;
  locale?: string;
  category_id?: number;
  category_name?: string;
  name?: string;
  subject_slug?: string;
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

  getTitles(payload: { stage_id: number; country_id: number; locale: string; topic_hint?: string }): Observable<{ titles: string[]; cached?: boolean }>{
    return this.http.post<{ titles: string[]; cached?: boolean }>(`/api/v1/ai/titles`, { student: payload });
  }
}

