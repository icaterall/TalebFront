// src/app/contact/contact.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken: string;
  recaptchaAction: string; // e.g., 'contact_form'
}
export interface ContactResponse {
  ok: boolean;
  messageId?: number;
  message?: string;
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

sendMessage(body: ContactMessage) {
  return this.http.post<ContactResponse>(
    `${this.baseUrl}/setup/send-message`,
    body,
    { headers: { 'Content-Type': 'application/json' } }
  ).pipe(
    catchError(this.handleError)
  );
}

// ⬇️ keep the server's shape; provide sensible fallbacks
private handleError(err: HttpErrorResponse) {
  const code = err?.error?.code || String(err.status || 'unknown_error');
  const message =
    err?.error?.message ||
    (err.status === 0 ? 'Network error. Please check your connection.' : err.statusText || 'Error');
  return throwError(() => ({ ok: false, code, message } as ContactResponse));
}
}
