import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../service/notification.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container" *ngIf="currentNotification">
      <div class="toast" [ngClass]="currentNotification.type" [class.show]="isVisible">
        <div class="toast-content">
          <span class="icon" [ngSwitch]="currentNotification.type">
            <span *ngSwitchCase="'success'">✅</span>
            <span *ngSwitchCase="'error'">❌</span>
            <span *ngSwitchCase="'info'">ℹ️</span>
          </span>
          <span class="message">{{ currentNotification.message }}</span>
        </div>
        <button class="close-btn" (click)="hide()">&times;</button>
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      min-width: 250px;
      padding: 12px 16px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      transform: translateX(120%);
      transition: transform 0.3s ease-in-out;
      border-left: 4px solid #ccc;
    }
    .toast.show {
      transform: translateX(0);
    }
    .toast.success { border-left-color: #4CAF50; }
    .toast.error { border-left-color: #F44336; }
    .toast.info { border-left-color: #2196F3; }
    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .message {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      padding: 0 4px;
    }
    .close-btn:hover { color: #333; }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
    currentNotification: Notification | null = null;
    isVisible = false;
    private subscription: Subscription | null = null;
    private timer: any;

    constructor(private notificationService: NotificationService) { }

    ngOnInit() {
        this.subscription = this.notificationService.notification$.subscribe(n => {
            this.show(n);
        });
    }

    ngOnDestroy() {
        if (this.subscription) this.subscription.unsubscribe();
        if (this.timer) clearTimeout(this.timer);
    }

    show(notification: Notification) {
        if (this.timer) clearTimeout(this.timer);

        this.currentNotification = notification;
        setTimeout(() => this.isVisible = true, 10);

        this.timer = setTimeout(() => {
            this.hide();
        }, notification.duration || 3000);
    }

    hide() {
        this.isVisible = false;
        setTimeout(() => {
            this.currentNotification = null;
        }, 300);
    }
}
