import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  // Replace with your actual API endpoint
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  sendMessage(contactMessage: ContactMessage): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/setup/send-message`, contactMessage)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('ContactService error:', error);
    return throwError(() => new Error('Error sending message; please try again later.'));
  }
}
