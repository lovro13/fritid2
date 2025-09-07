import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { map, switchMap, filter, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(UserService);
  const router = inject(Router);

  // Wait for auth service to initialize before checking authentication
  return authService.isInitialized$.pipe(
    filter(isInitialized => isInitialized), // Wait until initialized
    take(1), // Take only the first emission
    switchMap(() => {
      return authService.user$.pipe(
        take(1), // Take current user state
        map(user => {
          if (user && authService.isLoggedIn()) {
            return true;
          } else {
            router.navigate(['/auth'], { 
              queryParams: { returnUrl: state.url } 
            });
            return false;
          }
        })
      );
    })
  );
};
