import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AiBuilderService, CourseDraft, DraftCourseResponse, CreateDraftCoursePayload } from '../../../../core/services/ai-builder.service';

@Injectable({
  providedIn: 'root'
})
export class CourseDraftService {
  private readonly http = inject(HttpClient);
  private readonly ai = inject(AiBuilderService);
  private readonly baseUrl = environment.apiUrl;

  private draftCourseId: number | null = null;
  private draftSyncCompleted: boolean = false;

  getDraftCourseId(): number | null {
    return this.draftCourseId;
  }

  setDraftCourseId(id: number | null): void {
    this.draftCourseId = id;
  }

  isDraftSyncCompleted(): boolean {
    return this.draftSyncCompleted;
  }

  setDraftSyncCompleted(completed: boolean): void {
    this.draftSyncCompleted = completed;
  }

  createDraftCourse(payload: CreateDraftCoursePayload): Observable<DraftCourseResponse> {
    return this.ai.createDraftCourse(payload);
  }

  updateDraftCourse(updates: any): Observable<any> {
    return this.ai.updateDraftCourse(updates);
  }

  deleteDraftCourse(): Observable<any> {
    return this.ai.deleteDraftCourse();
  }

  saveDraftToLocalStorage(draft: Partial<CourseDraft>): void {
    localStorage.setItem('courseDraft', JSON.stringify(draft));
  }

  loadDraftFromLocalStorage(): Partial<CourseDraft> | null {
    const draftStr = localStorage.getItem('courseDraft');
    if (draftStr) {
      try {
        return JSON.parse(draftStr);
      } catch (e) {
        console.error('Failed to parse course draft from localStorage', e);
        return null;
      }
    }
    return null;
  }

  clearDraftFromLocalStorage(): void {
    localStorage.removeItem('courseDraft');
  }
}
