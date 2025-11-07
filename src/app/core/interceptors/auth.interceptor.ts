// src/app/core/interceptors/auth.interceptor.ts
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Only run this interceptor in the browser
  if (isPlatformBrowser(platformId)) {
    const authService = inject(AuthService);

    // Endpoints that should skip authentication
    const skipAuthEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/google',
      '/auth/apple-login',
      '/auth/google-oauth-callback',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email',
      '/auth/resend-verification',
      '/auth/check-email-exist',
      '/auth/check-email',
      '/auth/refresh' // Refresh endpoint should not have the old token
    ];

    const shouldSkipAuth = skipAuthEndpoints.some(endpoint => req.url.includes(endpoint));

    if (shouldSkipAuth) {
      return next(req);
    }

    const token = authService.getAccessToken();

    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 && authService.getRefreshToken()) {
            return authService.refreshToken().pipe(
              switchMap((response) => {
                const newAccessToken = response.accessToken;
                if (newAccessToken) {
                  authService.storeAuthData(response.user, newAccessToken, response.refreshToken);
                  const retryReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newAccessToken}`
                    }
                  });
                  return next(retryReq);
                }
                // If refresh fails to provide a new token, logout
                authService.forceLogout('Session refresh failed.');
                return throwError(() => new Error('Failed to get new access token on refresh.'));
              }),
              catchError((refreshError) => {
                authService.forceLogout('Session expired. Please login again.');
                return throwError(() => refreshError);
              })
            );
          } else if (error.status === 401) {
            // If 401 and no refresh token, just logout
            authService.forceLogout('Authentication failed.');
          }
          return throwError(() => error);
        })
      );
    }
  }

  // If not in browser or no token, proceed without modification
  return next(req);
};
