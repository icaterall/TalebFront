// services/ai-intro.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StudentInfo {
  stage_id: number;
  age?: number;
  country_id: number;
  state_id?: number;
  locale: string;
}

export interface AIQuestion {
  question: string;
  type: string;
  options: string[];
  correct_answer: number;
}

export interface AIIntroPack {
  lesson_id: number;
  title: string;
  description: string;
  est_minutes: number;
  objectives: string[];
  questions: AIQuestion[];
  is_generated: boolean;
}

export interface AIIntroResponse {
  success: boolean;
  lesson: AIIntroPack;
  warning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIIntroService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Generate a personalized AI intro lesson for a student
   * @param student - Student profile information
   * @returns Observable of AI-generated intro pack
   */
  generateIntroPack(student: StudentInfo): Observable<AIIntroResponse> {
    return this.http.post<AIIntroResponse>(
      `${this.baseUrl}/ai/orchestrate/intro-pack`,
      { student }
    );
  }
}



