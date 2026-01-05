import { Component, OnInit } from '@angular/core';
import { UserService } from './service/user.service';
import { User } from './models/user.model';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { FooterComponent } from './components/shared//footer/footer.component';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ProductsService } from './service/products.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [RouterOutlet, RouterLink, FooterComponent, CommonModule]
})
export class App implements OnInit {
  user$: Observable<User | null>;

  get cartItemCount() {
    return this.cartService.getCartItemsCount();
  }

  constructor(
    private cartService: ProductsService, 
    private authService: UserService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    // Scroll to top on route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo(0, 0);
    });
  }

  logout() {
    this.authService.logout();
  }


}
