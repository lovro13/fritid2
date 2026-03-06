import { Component, LOCALE_ID } from '@angular/core';
import { CartItem } from '../../../models/cart.model';
import { RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { ProductsService } from '../../../service/products.service';

registerLocaleData(localeDe);

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [RouterLink, DecimalPipe, CommonModule, FormsModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'de' }
  ]
})
export class CartComponent {
  cartItems: CartItem[] = [];
  private cartSub!: Subscription;
  total = 0;

  constructor(private cartService: ProductsService ) {
    this.total = this.cartService.getTotal();
  }


  ngOnInit() {
    this.cartSub = this.cartService.cartItems$.subscribe(items => { this.cartItems = items })
  }

  removeItem(item: CartItem) {
    this.cartService.removeItemFromCart(item);
  }

  increaseQuantity(item: CartItem) {
    item.quantity = Math.max(1, Math.floor(item.quantity || 1)) + 1;
    this.cartService.updateCartItemQuantity(item, item.quantity);
    this.updateTotal();
  }

  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      item.quantity--;
      this.cartService.updateCartItemQuantity(item, item.quantity);
      this.updateTotal();
    }
  }

  updateQuantity(item: CartItem, event: Event) {
    const target = event.target as HTMLInputElement;
    const newQuantity = parseInt(target.value, 10);

    if (Number.isNaN(newQuantity) || newQuantity < 1) {
      item.quantity = 1;
      target.value = '1';
    } else {
      item.quantity = newQuantity;
    }

    this.cartService.updateCartItemQuantity(item, item.quantity);
    this.updateTotal();
  }

  private updateTotal() {
    this.total = this.cartService.getTotal();
  }

}
