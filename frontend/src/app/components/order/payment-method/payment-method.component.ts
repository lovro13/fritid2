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
export const FREE_SHIPPING_THRESHOLD = 50.00; // Free shipping threshold
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

  banks = ['nlb', 'skb', 'abanka', 'gorenjska', 'unicredit'];

  cardForm: FormGroup;

  constructor(private fb: FormBuilder,
    private cartService: ProductsService,
    private authService: UserService,
    private userService: UserService,
    private orderService: OrderService,
    private http: HttpClient,
    private router: Router) {
    this.cardForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9 ]{16,19}$')]],
      expiryDate: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/?([0-9]{2})$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
      cardHolder: ['', [Validators.required, Validators.minLength(2)]],

    });
  }

  ngOnInit() {
    // Scroll to top of the page
    window.scrollTo(0, 0);
    
    // Calculate order totals
    this.calculateOrderTotals();
    
    // Auto-fill user data if logged in
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.userService.getUserById(currentUser.id).subscribe(
        (user: any) => {
          this.cardForm.patchValue({
            cardHolder: `${user.firstName} ${user.lastName}`
          });
        },
        (error: any) => {
          console.error('Failed to fetch user details:', error);
        }
      );
    }
  }

  private calculateOrderTotals() {
    this.cartService.cartItems$.pipe(take(1)).subscribe(cartItems => {
      this.cartItems = cartItems;
      
      // Calculate subtotal (price WITH VAT included)
      this.subtotal = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.product.price.toString()) * item.quantity);
      }, 0);

      // Calculate shipping (free shipping above threshold)
      this.shippingCost = this.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

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
    this.selectedBank = "";
  }

  selectBank(bank: string) {
    this.selectedBank = bank;
  }

  getBankName(bankCode: string): string {
    const bankNames: { [key: string]: string } = {
      'nlb': 'NLB',
      'skb': 'SKB Banka',
      'abanka': 'A Banka',
      'gorenjska': 'Banka Gorenjska',
      'unicredit': 'UniCredit Banka'
    };
    return bankNames[bankCode] || bankCode;
  }

  processPayment() {
    if (this.cardForm.valid) {
      console.log('Processing card payment', this.cardForm.value);
      this.paymentComplete.emit('card');

      // Submit checkout data to backend
      combineLatest([
        this.orderService.personInfo$,
        this.cartService.cartItems$
      ])
        .pipe(take(1))
        .subscribe(([personInfo, cartItems]) => {
          const currentUser = this.authService.getCurrentUser();
          const payload = {
            personInfo,
            cartItems,
            userId: currentUser?.id || null  // Include userId if logged in
          };
          console.log('Checkout payload:', payload);
          this.http.post( `${environment.apiBase}/order`, payload).subscribe({
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
    
    confirmCashPayment() {
      console.log('Cash payment confirmed');
      this.paymentComplete.emit('cash');
      // Use observables to get the latest values
      
      combineLatest([
        this.orderService.personInfo$,
        this.cartService.cartItems$
      ])
      .pipe(take(1))
      .subscribe(([personInfo, cartItems]) => {
        const currentUser = this.authService.getCurrentUser();
        const payload = {
          personInfo,
          cartItems,
          userId: currentUser?.id || null  // Include userId if logged in
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

  processBankPayment() {
    if (this.selectedBank) {
      console.log('Processing bank payment with', this.selectedBank);
      this.paymentComplete.emit('bank');
    }
  }
}