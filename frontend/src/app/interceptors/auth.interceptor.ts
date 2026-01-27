import { inject, Injector } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from '../service/user.service';

/**
 * HTTP Interceptor that automatically handles authentication for all HTTP requests.
 * 
 * This interceptor is used in the app.config.:
 * - Automatically attaches CSRF tokens to outgoing requests
 * - Handles 401 Unauthorized responses by clearing tokens and redirecting to login
 * - Ensures consistent authentication behavior across the application
 * 
 * @param request - The outgoing HTTP request
 * @param next - The next handler in the interceptor chain
 * @returns Observable<HttpEvent<unknown>> - The HTTP response observable
 * 
 * @example
 * ```typescript
 * // Configured in app.config.ts
 * provideHttpClient(withInterceptors([authInterceptor]))
 * ```
 */
export function authInterceptor(request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const router = inject(Router);
  const injector = inject(Injector);

  // Get CSRF token from cookie
  const getCsrfToken = (): string | null => {
    const name = 'csrfToken=';
    // gets cookie value
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  };

  // Build headers with CSRF token for state-changing requests
  const headers: { [key: string]: string } = {};
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  // Clone the request to enable credentials (cookies) and add CSRF token
  const modifiedRequest = request.clone({
    withCredentials: true,
    setHeaders: headers
  });

  // Handle the request and catch any authentication errors
  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 Unauthorized error, clear tokens and redirect
      if (error.status === 401) {
        const authService = injector.get(UserService);
        authService.clearAll();
        router.navigate(['/auth']);
        return throwError(() => error);
      }

      return throwError(() => error);
    })
  );
}
