import { Component } from '@angular/core';
import { UserService } from './service/user.service';
import { User } from './models/user.model';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/shared//footer/footer.component';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ProductsService } from './service/products.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [RouterOutlet, RouterLink, FooterComponent, CommonModule]
})
export class App{
  user$: Observable<User | null>;

  get cartItemCount() {
    return this.cartService.getCartItemsCount();
  }

  constructor(
    private cartService: ProductsService, 
    private authService: UserService
  ) {
    this.user$ = this.authService.user$;
  }

  logout() {
    this.authService.logout();
  }


}
