import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../../service/products.service';
@Component({
  standalone: true,
  selector: 'app-thank-you',
  templateUrl: './thank-you.component.html',
  styleUrls: ['./thank-you.component.scss'],
  imports: [RouterLink]
})
export class ThankYouComponent {
  
  constructor(
    private router: Router,
    private cartService: ProductsService
  ) {
    // Clear the cart after successful order
    this.cartService.clearCart();
  }

  continueShopping() {
    this.router.navigate(['/']);
  }
}
