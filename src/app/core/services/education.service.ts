import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EducationStage {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  type: 'student' | 'teacher';
  min_age: number;
  max_age: number;
  sort_order: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EducationService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get education stages filtered by age
   */
  getStagesByAge(age: number, type: 'student' | 'teacher' = 'student'): Observable<{ stages: EducationStage[] }> {
    return this.http.get<{ stages: EducationStage[] }>(
      `${this.baseUrl}/education-stages/by-age`,
      {
        params: {
          age: age.toString(),
          type
        }
      }
    );
  }

  /**
   * Get all education stages
   */
  getAllStages(type?: 'student' | 'teacher'): Observable<{ stages: EducationStage[] }> {
    const params: Record<string, string> = {};
    if (type) {
      params['type'] = type;
    }
    return this.http.get<{ stages: EducationStage[] }>(
      `${this.baseUrl}/education-stages`,
      { params }
    );
  }

  /**
   * Calculate age using school-year cut-off (September 1st)
   * Returns the age the student will be/was on September 1st of the current school year
   */
  calculateSchoolAge(birthDate: Date): number {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = January)
    
    // Determine which school year we're in
    // If we're before September (month < 8), use last year's Sept 1 as cut-off
    // If we're Sept or later (month >= 8), use this year's Sept 1 as cut-off
    const schoolYearCutoffYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    const cutoffDate = new Date(schoolYearCutoffYear, 8, 1); // September 1st (month 8)
    
    // Calculate age as of the cut-off date
    let age = cutoffDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = cutoffDate.getMonth() - birthDate.getMonth();
    const dayDiff = cutoffDate.getDate() - birthDate.getDate();
    
    // Adjust if birthday hasn't occurred by Sept 1 of that school year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    
    return age;
  }

  /**
   * Get the current school year string (e.g., "2024-2025")
   */
  getCurrentSchoolYear(): string {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    if (currentMonth >= 8) { // September or later
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }
}

