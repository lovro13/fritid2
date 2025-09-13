import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { UserService } from '../../../service/user.service';
import { CartItem } from '../../../models/cart.model';
import localeDe from '@angular/common/locales/de';
import { OrderService } from '../../../service/order.service';
import { CommonModule, DecimalPipe, registerLocaleData } from '@angular/common';
import { PersonInfo } from '../../../models/order.model';
import { ProductsService } from '../../../service/products.service';

registerLocaleData(localeDe);

// ime
// priimek
// naslov
// poštna številka
// kraj
// elektornski naslov
// telefon
// ID  za DDV (podjetja) (optional)

@Component({
  standalone: true,
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, CommonModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'de' }
  ]
})
export class CheckoutComponent {
  checkoutForm: FormGroup;
  personInfo: any = BehaviorSubject;
  private cartSub!: Subscription;
  total = 0;
  cartItems: CartItem[] = [];
  dataSource: 'none' | 'profile' | 'recent_order' = 'none';

  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService, // Inject service
    private orderService: OrderService, // Inject order service
    private authService: UserService,
    private cartService: ProductsService
  ) {
    this.total = this.cartService.getTotal();
    this.checkoutForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      city: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^(\\+386|0)[0-9]{8}$')]],
      companyID: [''] // Optional
    });
  }
  
  ngOnInit() {
    // Auto-fill user data if logged in
    this.cartSub = this.cartService.cartItems$.subscribe(items => { this.cartItems = items })
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      // First try to get user's most recent order for shipping info
      this.orderService.getUserOrders(currentUser.id).subscribe(
        (orders) => {
          if (orders && orders.length > 0) {
            // Get the most recent order (assuming orders are sorted by date)
            const mostRecentOrder = orders[0];
            console.log('Most recent order:', mostRecentOrder);
            
            // Auto-fill form with most recent order's shipping data
            const formData = {
              firstName: mostRecentOrder.shippingFirstName || '',
              lastName: mostRecentOrder.shippingLastName || '',
              email: mostRecentOrder.shippingEmail || '',
              address: mostRecentOrder.shippingAddress || '',
              postalCode: mostRecentOrder.shippingPostalCode || '',
              city: mostRecentOrder.shippingCity || '',
              phone: mostRecentOrder.shippingPhoneNumber || ''
            };
            
            console.log('Form data to patch:', formData);
            this.checkoutForm.patchValue(formData);
            this.dataSource = 'recent_order';
          } else {
            // Fallback to user profile data if no orders found
            this.fillFromUserProfile(currentUser.id);
          }
        },
        (error) => {
          console.error('Failed to fetch user orders:', error);
          // Fallback to user profile data if orders fetch fails
          this.fillFromUserProfile(currentUser.id);
        }
      );
    }
  }

  private fillFromUserProfile(userId: number) {
    this.userService.getUserById(userId).subscribe(
      (user) => {
        // Auto-fill form with user profile data
        this.checkoutForm.patchValue({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          address: user.address || '',
          postalCode: user.postalCode || '',
          city: user.city || '',
          phone: user.phoneNumber || ''
        });
        this.dataSource = 'profile';
      },
      (error) => {
        console.error('Failed to fetch user details:', error);
      }
    );
  }

  clearForm() {
    this.checkoutForm.reset();
    this.dataSource = 'none';
  }

  onSubmit() {
    if (this.checkoutForm.valid) {
      this.orderService.setPersonInfo(this.checkoutForm.value as PersonInfo);
      console.log('Form Submitted', this.checkoutForm.value);
      console.log('With cart items:', this.cartItems);
      this.router.navigate(['/payment-method']);
    }
  }
}
