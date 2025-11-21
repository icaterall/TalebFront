import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SectionComposerService {
  private apiUrl = environment.apiUrl + '/ai';

  constructor(private http: HttpClient) {}

  suggestSectionName(courseData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/section/suggest-name`, courseData);
  }

  suggestContentTitles(sectionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/section/suggest-content`, sectionData);
  }

  suggestYouTubeVideos(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/content/suggest-video`, data);
  }

  generateAudio(data: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/content/generate-audio`, data, { responseType: 'blob' });
  }

  generateTextContent(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/content/text`, data);
  }
}
