import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { CartItem } from '../models/cart.model';
import { BehaviorSubject } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBase}/products`;

  private products: Product[] = [];

  private readonly CART_KEY = 'shopping_cart';
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();

  // ko se spletna stran začne nalagat tukaj nastavi na 
  // voziček iz local storage ali pa praznega če voziček iz local storage ne obstaja
  constructor() { this.loadCartFromLocalStorage() }

  private loadCartFromLocalStorage() {
    const cartData = localStorage.getItem(this.CART_KEY);
    if (cartData) {
      try {
        console.log("sem v CartService in loadCart")
        this.cartItemsSubject.next(JSON.parse(cartData));
      } catch (e) {
        console.error('Error parsing cart data', e);
        this.cartItemsSubject.next([]);
      }
    }
    console.log("sem v CartService in loadCart2")
  }

  private saveCart() {
    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItemsSubject.value));
  }

  addItemToCart(product: Product, quantity: number, selectedColor: string) {
    let currentItems = this.cartItemsSubject.value;
    const existingItem = currentItems.find(item =>
      item.product.id === product.id &&
      item.selectedColor === selectedColor
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      currentItems.push({ product, quantity, selectedColor });
    }
    this.cartItemsSubject.next(currentItems);
    this.saveCart();
    console.log("Item added to cart:", product, quantity, selectedColor);
  }

  removeItemFromCart(item: CartItem) {
    let cartItemsTemp = this.cartItemsSubject.value;
    for (let i = 0; i < cartItemsTemp.length; i++) {
      if (cartItemsTemp[i] == item) {
        cartItemsTemp.splice(i, 1);
      }
    }
    this.cartItemsSubject.next(cartItemsTemp);
    this.saveCart();
  }

  clearCart() {
    this.cartItemsSubject.next([]);
  }

  getTotal(): number {
    const cartItemsTemp = this.cartItemsSubject.value;
    let total_temp = 0;
    for (let i = 0; i < cartItemsTemp.length; i++) {
      total_temp += cartItemsTemp[i].product.price * cartItemsTemp[i].quantity;
    }
    return total_temp;
  }

  getCartItemsCount() {
    return this.cartItemsSubject.value.length
  }


  ngOnDestroy() {
    this.saveCart();
  }

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      map(products => {
        this.products = products.map(p => ({
          ...p,
          // The backend stores colors as a JSON string, parse it here
          colors: typeof p.colors === 'string' ? JSON.parse(p.colors) : p.colors
        }));
        return this.products;
      }),
      catchError(error => {
        console.error('Error fetching products from API, falling back to local data if any. Call to', this.apiUrl, error);
        return of(this.products); // return last known products or empty array
      })
    );
  }

  getProductById(id: string): Observable<Product | undefined> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      map(p => {
        return {
          ...p,
          colors: typeof p.colors === 'string' ? JSON.parse(p.colors) : p.colors
        };
      }),
      catchError(error => {
        console.error(`Error fetching product with id ${id}`, error);
        // Fallback to finding from the list if already fetched
        const product = this.products.find(p => p.id === Number(id));
        return of(product);
      })
    );
  }
}