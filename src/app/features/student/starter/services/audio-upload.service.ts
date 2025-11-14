import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AudioUploadResponse, AudioGenerationRequest, AudioGenerationResponse } from '../types/audio.types';

@Injectable({
  providedIn: 'root'
})
export class AudioUploadService {
  private readonly baseUrl = environment.apiUrl;
  private uploadProgress$ = new BehaviorSubject<number>(0);
  private uploadError$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }

  getUploadError(): Observable<string | null> {
    return this.uploadError$.asObservable();
  }

  resetProgress(): void {
    this.uploadProgress$.next(0);
    this.uploadError$.next(null);
  }

  uploadAudio(file: File, contentId?: number, metadata?: { duration: number; bitrate?: number; sampleRate?: number }): Observable<any> {
    const formData = new FormData();
    formData.append('audio', file);
    
    if (contentId) {
      formData.append('content_id', contentId.toString());
    }
    
    if (metadata?.duration) {
      formData.append('duration', metadata.duration.toString());
    }
    
    if (metadata?.bitrate) {
      formData.append('bitrate', metadata.bitrate.toString());
    }
    
    if (metadata?.sampleRate) {
      formData.append('sampleRate', metadata.sampleRate.toString());
    }

    return new Observable(observer => {
      this.http.post(`${this.baseUrl}/courses/draft/content/audios`, formData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            this.uploadProgress$.next(progress);
          } else if (event.type === HttpEventType.Response) {
            observer.next(event.body);
            observer.complete();
          }
        },
        error: (error) => {
          this.uploadError$.next(error.message);
          observer.error(error);
        }
      });
    });
  }

  deleteAudios(urls: string[]): Observable<any> {
    return this.http.delete(`${this.baseUrl}/courses/draft/content/audios`, {
      body: { urls }
    });
  }

  generateAudioFromText(request: AudioGenerationRequest, contentId?: number): Observable<AudioGenerationResponse> {
    return this.http.post<AudioGenerationResponse>(`${this.baseUrl}/courses/draft/content/audios/generate`, {
      text: request.text,
      voice: request.voice || 'alloy',
      speed: request.speed || 1.0,
      model: request.model || 'gpt-4o-mini-tts',
      contentId: contentId // Pass content ID for folder structure
    });
  }

  convertTextLessonToAudio(textContentId: number, voice?: string, speed?: number, contentId?: number): Observable<AudioGenerationResponse> {
    return this.http.post<AudioGenerationResponse>(`${this.baseUrl}/courses/draft/content/audios/convert`, {
      textContentId: textContentId,
      voice: voice || 'alloy',
      speed: speed || 1.0,
      model: 'gpt-4o-mini-tts',
      contentId: contentId // Pass content ID for folder structure
    });
  }

  extractAudioMetadata(file: File): Promise<{ duration: number; bitrate?: number; sampleRate?: number }> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve({
          duration: Math.round(audio.duration)
        });
      };
      
      audio.onerror = () => {
        window.URL.revokeObjectURL(audio.src);
        reject(new Error('Failed to load audio metadata'));
      };
      
      audio.src = window.URL.createObjectURL(file);
    });
  }
}
