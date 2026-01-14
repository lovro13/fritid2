import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { OrderService } from '../service/order.service';
import { map, take } from 'rxjs';

export const checkoutGuard: CanActivateFn = (route, state) => {
    const orderService = inject(OrderService);
    const router = inject(Router);

    // Use the existing personInfoSubject via personInfo$
    return orderService.personInfo$.pipe(
        take(1),
        map(info => {
            if (info) {
                return true;
            } else {
                // If no person info, redirect back to checkout
                router.navigate(['/checkout']);
                return false;
            }
        })
    );
};
