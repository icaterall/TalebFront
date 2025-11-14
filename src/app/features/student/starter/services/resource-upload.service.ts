import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ResourceFormState, ResourceDisplayType } from '../types/resource.types';
import { RESOURCE_MAX_SIZE, RESOURCE_INLINE_PREVIEW_LIMIT } from '../constants/resource.constants';

@Injectable({
  providedIn: 'root'
})
export class ResourceUploadService {
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

  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > RESOURCE_MAX_SIZE) {
      return { 
        valid: false, 
        error: `File size exceeds ${RESOURCE_MAX_SIZE / (1024 * 1024)}MB limit` 
      };
    }
    return { valid: true };
  }

  getResourceDisplayType(fileName: string): ResourceDisplayType {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf'].includes(extension)) return 'pdf';
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['ppt', 'pptx'].includes(extension)) return 'ppt';
    if (['zip', 'rar'].includes(extension)) return 'compressed';
    
    return 'pdf'; // default
  }

  shouldUseInlinePreview(file: File): boolean {
    return file.size <= RESOURCE_INLINE_PREVIEW_LIMIT && 
           this.getResourceDisplayType(file.name) === 'pdf';
  }

  createDefaultResourceForm(): ResourceFormState {
    return {
      title: '',
      description: '',
      displayType: 'pdf',
      fileName: '',
      fileType: '',
      fileSize: 0,
      dataUrl: null,
      previewMode: 'download',
      pageCount: null
    };
  }

  async readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  uploadResource(file: File, draftCourseId: number): Observable<any> {
    const formData = new FormData();
    formData.append('resource', file);
    formData.append('draftCourseId', draftCourseId.toString());

    return new Observable(observer => {
      this.http.post(`${this.baseUrl}/courses/draft/resources`, formData, {
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
}
