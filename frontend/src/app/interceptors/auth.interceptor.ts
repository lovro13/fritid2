import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenService } from '../service/token.service';

export function authInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const router = inject(Router);
  const tokenService = inject(TokenService);
  
  // Get the token from the token service
  const token = tokenService.getToken();
  
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
      // If we get a 401 Unauthorized error, clear tokens and redirect
      if (error.status === 401) {
        tokenService.clearAll();
        router.navigate(['/auth']);
      }
      return throwError(() => error);
    })
  );
}
