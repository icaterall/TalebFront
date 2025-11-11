import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UniversalAuthService } from './universal-auth.service';

@Injectable({
  providedIn: 'root'
})
export class S3Service {
  private readonly http = inject(HttpClient);
  private readonly universalAuth = inject(UniversalAuthService);
  private readonly baseUrl = environment.apiUrl;

  deleteFromS3(key: string): Observable<any> {
    const url = `${this.baseUrl}/s3/delete`;
    const user = this.universalAuth.getCurrentUser();
    const body = {
      key,
      userId: user?.id
    };
    return this.http.post(url, body);
  }
}
