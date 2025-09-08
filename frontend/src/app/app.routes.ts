import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product/catalog/product-list.component';
import { CartComponent } from './components/product/cart/cart.component';
import { ProductDetailComponent } from './components/product/product-detail/product-detail.component';
import { Info } from './components/shared/info/info';
import { CheckoutComponent } from './components/order/checkout/checkout.component';
import { PaymentMethodComponent } from './components/order/payment-method/payment-method.component';
import { ThankYouComponent } from './components/order/thank-you/thank-you.component';
import { AuthComponent } from './components/auth/auth.component';
import { ProductManagementComponent } from './components/admin/product-management/product-management.component';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [ 
  { path: '', component: ProductListComponent },
  { path: 'cart', component: CartComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'info/:id', component: Info},
  { path: 'checkout', component: CheckoutComponent },
  { path: 'payment-method', component: PaymentMethodComponent },
  { path: 'thank-you', component: ThankYouComponent },
  { path: 'auth', component: AuthComponent },
  { 
    path: 'admin/products', 
    component: ProductManagementComponent,
    canActivate: [adminGuard] 
  },
  { path: '**', redirectTo: '' }
];
