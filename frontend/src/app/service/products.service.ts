import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';


@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBase}/products`;
  private backendUrl = `${environment.apiBase}`;

  private products: Product[] = [];

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