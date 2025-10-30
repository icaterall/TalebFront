// services/assistant.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SuggestChipsResponse {
  success: boolean;
  chips: string[];
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  suggest(context: Record<string, unknown>): Observable<SuggestChipsResponse> {
    return this.http.post<SuggestChipsResponse>(`${this.baseUrl}/assistant/suggest`, context);
  }
}


