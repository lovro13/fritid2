import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { map, switchMap, of, filter, take } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(UserService);
  const router = inject(Router);

  // Wait for auth service to initialize before checking authentication
  return authService.isInitialized$.pipe(
    filter(isInitialized => isInitialized), // Wait until initialized
    take(1), // Take only the first emission
    switchMap(() => {
      const token = authService.getToken();
      
      // Check if token exists
      if (!token) {
        router.navigate(['/auth']);
        return of(false);
      }

      // Check user role
      return authService.user$.pipe(
        take(1), // Take current user state
        map(user => {
          if (user && user.role === 'admin') {
            return true;
          } else {
            router.navigate(['/auth']);
            return false;
          }
        })
      );
    })
  );
};
