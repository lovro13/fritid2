import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../service/auth.service';
import { Router } from '@angular/router';

export function authInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Get the token from the auth service
  const token = authService.getToken();
  
  // Clone the request and add authorization header if token exists
  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle the request and catch any authentication errors
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 Unauthorized error, logout the user
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/auth']);
      }
      return throwError(() => error);
    })
  );
}
