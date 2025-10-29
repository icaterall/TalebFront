// services/recommendations.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Recommendation {
  lesson_id: number;
  title: string;
  est_minutes: number;
  description?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
}

export interface RecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Get personalized lesson recommendations for a student
   * @param filters - Student profile filters
   * @returns Observable of recommendations
   */
  getRecommendations(filters: {
    country_id: number;
    state_id?: number;
    stage_id: number;
    locale: string;
    limit?: number;
  }): Observable<RecommendationsResponse> {
    const params: any = {
      country_id: filters.country_id,
      stage_id: filters.stage_id,
      locale: filters.locale,
      limit: filters.limit || 3
    };

    if (filters.state_id) {
      params.state_id = filters.state_id;
    }

    return this.http.get<RecommendationsResponse>(
      `${this.baseUrl}/recommendations`,
      { params }
    );
  }
}


