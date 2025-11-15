import { CurrencyPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductsService } from '../../../service/products.service';
import { UserService } from '../../../service/user.service';
import { OrderService } from '../../../service/order.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { combineLatest, take } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Constants for order calculation
export const SHIPPING_COST = 5.99; // Shipping cost constant
export const VAT_RATE = 0.22; // 22% VAT rate

@Component({
  standalone: true,
  selector: 'app-payment-method',
  templateUrl: './payment-method.component.html',
  styleUrls: ['./payment-method.component.scss'],
  imports: [ReactiveFormsModule, CurrencyPipe]
})
export class PaymentMethodComponent implements OnInit {
  @Input() total: number = 0;
  @Output() paymentComplete = new EventEmitter<string>();

  selectedMethod: string | null = null;
  selectedBank: string = "";

  // Order summary properties
  subtotal: number = 0;
  shippingCost: number = SHIPPING_COST;
  vatAmount: number = 0;
  totalAmount: number = 0;
  cartItems: any[] = [];


  constructor(private fb: FormBuilder,
    private cartService: ProductsService,
    private orderService: OrderService,
    private http: HttpClient,
    private router: Router) {
  }

  ngOnInit() {
    // Scroll to top of the page
    window.scrollTo(0, 0);
    
    // Calculate order totals
    this.calculateOrderTotals();
    
    // Auto-fill user data if logged in
  }

  private calculateOrderTotals() {
    this.cartService.cartItems$.pipe(take(1)).subscribe(cartItems => {
      this.cartItems = cartItems;
      
      // Calculate subtotal (price WITH VAT included)
      this.subtotal = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.product.price.toString()) * item.quantity);
      }, 0);

      // Calculate shipping (free shipping above threshold)
      this.shippingCost = SHIPPING_COST;

      // Final total (subtotal + shipping)
      this.totalAmount = this.subtotal + this.shippingCost;
      
      // Update the input total as well
      this.total = this.totalAmount;
    });
  }

  // Template helper methods
  calculateItemPrice(price: number, quantity: number): number {
    return parseFloat(price.toString()) * quantity;
  }

  get vatRate(): number {
    return VAT_RATE;
  }

  selectMethod(method: string) {
    this.selectedMethod = method;
  }


  confirmPayment() {
      console.log('Payment confirmed');
      if (this.selectedMethod == 'cash')  {
        this.paymentComplete.emit('cash');
      } else {
        this.paymentComplete.emit('upn');
      }
      
      combineLatest([
        this.orderService.personInfo$,
        this.cartService.cartItems$
      ])
      .pipe(take(1))
      .subscribe(([personInfo, cartItems]) => {
        const payload = {
          personInfo,
          cartItems,
          typeOfOrder: this.selectedMethod
        };
        
        console.log('Checkout payload:', payload);
        console.log('sending to backend: ', `${environment.apiBase}/orders`)
        this.http.post(`${environment.apiBase}/orders`, payload).subscribe({
          next: (response) => {
            console.log('Checkout success', response);
            this.router.navigate(['/thank-you']);
          },
          error: (err) => {
            console.error('Checkout failed', err);
          }
        });
      });
  }

}