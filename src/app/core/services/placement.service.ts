// services/placement.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlacementAnswer {
  question_id: string;
  answer_index: number;
}

export interface PlacementScoreResponse {
  success: boolean;
  level: 'L1' | 'L2' | 'L3';
}

@Injectable({ providedIn: 'root' })
export class PlacementService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  score(answers: PlacementAnswer[]): Observable<PlacementScoreResponse> {
    return this.http.post<PlacementScoreResponse>(`${this.baseUrl}/placement/score`, { answers });
  }
}


