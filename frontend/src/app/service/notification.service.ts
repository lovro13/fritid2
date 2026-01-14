import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<Notification>();
    public notification$ = this.notificationSubject.asObservable();

    showSuccess(message: string, duration: number = 3000) {
        this.notificationSubject.next({ message, type: 'success', duration });
    }

    showError(message: string, duration: number = 5000) {
        this.notificationSubject.next({ message, type: 'error', duration });
    }

    showInfo(message: string, duration: number = 3000) {
        this.notificationSubject.next({ message, type: 'info', duration });
    }
}
