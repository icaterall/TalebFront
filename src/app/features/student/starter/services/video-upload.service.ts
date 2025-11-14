import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { VideoFormState } from '../types/video.types';

const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB

@Injectable({
  providedIn: 'root'
})
export class VideoUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
  private uploadProgress$ = new Subject<number>();
  private uploadError$ = new Subject<string | null>();

  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }

  getUploadError(): Observable<string | null> {
    return this.uploadError$.asObservable();
  }

  validateVideoFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['video/mp4', 'video/x-msvideo'];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Only MP4 and AVI formats are supported' 
      };
    }
    
    if (file.size > VIDEO_MAX_SIZE) {
      return { 
        valid: false, 
        error: `Video size exceeds ${VIDEO_MAX_SIZE / (1024 * 1024)}MB limit` 
      };
    }
    
    return { valid: true };
  }

  createDefaultVideoForm(): VideoFormState {
    return {
      source: 'local',
      title: '',
      description: '',
      file: null,
      fileName: '',
      fileSize: 0,
      youtubeUrl: '',
      youtubeData: null
    };
  }

  uploadVideo(file: File, contentId?: number, metadata?: { duration: number; width?: number; height?: number }): Observable<any> {
    const formData = new FormData();
    formData.append('video', file);
    
    if (contentId) {
      formData.append('content_id', contentId.toString());
    }
    
    if (metadata?.duration) {
      formData.append('duration', metadata.duration.toString());
    }
    
    if (metadata?.width) {
      formData.append('width', metadata.width.toString());
    }
    
    if (metadata?.height) {
      formData.append('height', metadata.height.toString());
    }

    return new Observable(observer => {
      this.http.post(`${this.baseUrl}/courses/draft/content/videos`, formData, {
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

  deleteVideos(urls: string[]): Observable<any> {
    return this.http.delete(`${this.baseUrl}/courses/draft/content/videos`, {
      body: { urls }
    });
  }

  extractVideoMetadata(file: File): Promise<{ duration: number; width?: number; height?: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve({
          duration: Math.round(video.duration),
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
