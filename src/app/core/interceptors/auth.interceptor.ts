// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip adding auth header for login/register endpoints
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
    '/auth/refresh' // Don't add auth header to refresh endpoint
  ];
  
  // Check if this request should skip authentication
  const shouldSkipAuth = skipAuthEndpoints.some(endpoint => 
    req.url.includes(endpoint)
  );
  
  if (shouldSkipAuth) {
    return next(req);
  }
  
  // Get the token from AuthService
  const token = authService.getToken();
  
  if (token) {
    // Clone the request and add the Authorization header
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // If token expired (401) and we have a refresh token, try to refresh
        if (error.status === 401 && authService.getRefreshToken()) {
          return authService.refreshToken().pipe(
            switchMap((response) => {
              // Store the new tokens
              if (response.token && response.refreshToken) {
                authService.storeAuthData(response.user, response.token, response.refreshToken);
              }
              
              // Retry the original request with the new token
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.token || response.accessToken}`
                }
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              // If refresh fails, force logout
              authService.forceLogout('Token refresh failed');
              return throwError(() => refreshError);
            })
          );
        }
        
        // If no refresh token or other 401 error, force logout
        if (error.status === 401) {
          authService.forceLogout('Authentication failed');
        }
        
        // For other errors, pass through the original error
        return throwError(() => error);
      })
    );
  }
  
  // If no token, proceed with original request
  return next(req);
};
