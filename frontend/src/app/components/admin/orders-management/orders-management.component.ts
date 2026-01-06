import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AdminService } from '../../../service/admin.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-orders-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-management.component.html',
  styleUrls: ['./orders-management.component.scss']
})
export class OrdersManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  
  orders$!: Observable<Order[]>;
  selectedOrder: Order | null = null;
  
  ngOnInit() {
    this.loadOrders();
  }
  
  loadOrders() {
    this.orders$ = this.adminService.getAllOrders();
  }
  
  viewOrderDetails(order: Order) {
    this.selectedOrder = order;
  }
  
  closeDetails() {
    this.selectedOrder = null;
  }
  
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Pending': 'status-pending',
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Delivered': 'status-delivered',
      'Cancelled': 'status-cancelled',
      'Invoice Error': 'status-error'
    };
    return statusMap[status] || 'status-pending';
  }
  
  getPaymentMethodLabel(method: string): string {
    return method === 'UPN' ? 'UPN nalog' : 'Plačilo ob dostavi';
  }
  
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('sl-SI', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
