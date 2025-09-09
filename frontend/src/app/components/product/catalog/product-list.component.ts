import { Component, OnInit, inject } from '@angular/core';
import { ProductsService } from '../../../service/products.service';
import { Product } from '../../../models/product.model';
import { Router, RouterLink } from '@angular/router';
import { FormModule } from '@coreui/angular';
import { DecimalPipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

registerLocaleData(localeDe);


@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  imports: [RouterLink, FormModule, DecimalPipe, CommonModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'de' }
  ]
})
export class ProductListComponent implements OnInit {
  products$: Observable<Product[]>;
  selectedCategory: string = 'all';
  categoryCount: { [key: string]: number } = {};
  availableCategories: string[] = [];
  private productsService = inject(ProductsService);
  private router = inject(Router);
  private allProducts$: Observable<Product[]>;
  private categoryFilter$ = new BehaviorSubject<string>('all');

  constructor() {
    this.allProducts$ = this.productsService.getAllProducts();
    
    // Initialize categories and counts
    this.allProducts$.subscribe(products => {
      this.extractAvailableCategories(products);
      this.updateCategoryCounts(products);
    });
    
    // Combine products with category filter
    this.products$ = combineLatest([
      this.allProducts$,
      this.categoryFilter$
    ]).pipe(
      map(([products, category]) => this.filterProducts(products, category))
    );
  }

  ngOnInit(): void {
    // The products are now fetched via the async pipe in the template
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.categoryFilter$.next(category);
  }

  private extractAvailableCategories(products: Product[]): void {
    const categorySet = new Set<string>();
    
    products.forEach(product => {
      if (product.category && product.category.trim() !== '') {
        const normalizedCategory = product.category.toLowerCase().trim();
        categorySet.add(normalizedCategory);
      }
    });
    
    // Sort categories alphabetically
    this.availableCategories = Array.from(categorySet).sort();
  }

  private filterProducts(products: Product[], category: string): Product[] {
    if (category === 'all') {
      return products;
    }
    
    if (category === 'others') {
      return products.filter(product => 
        !product.category || 
        product.category.trim() === '' ||
        !this.availableCategories.includes(product.category.toLowerCase().trim())
      );
    }
    
    return products.filter(product => {
      if (!product.category || product.category.trim() === '') {
        return false;
      }
      
      return product.category.toLowerCase().trim() === category.toLowerCase();
    });
  }

  private updateCategoryCounts(products: Product[]): void {
    this.categoryCount = {
      all: products.length,
      others: this.filterProducts(products, 'others').length
    };
    
    // Add counts for all available categories
    this.availableCategories.forEach(category => {
      this.categoryCount[category] = this.filterProducts(products, category).length;
    });
  }

  getCategoryCount(category: string): number {
    return this.categoryCount[category] || 0;
  }

  getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'all': 'Vsi izdelki',
      'others': 'Ostalo',
      'steklenice': 'Steklenice',
      'pokrovčki': 'Pokrovčki', 
      'dodatki': 'Dodatki'
    };
    
    return categoryMap[category] || this.capitalizeFirstLetter(category);
  }

  getCategoryDescription(category: string): string {
    const descriptionMap: { [key: string]: string } = {
      'all': 'Celotna ponudba naših izdelkov',
      'others': 'Ostali izdelki in nekategorizirani produkti',
      'steklenice': 'Kakovostne steklene steklenice različnih velikosti',
      'pokrovčki': 'Različni pokrovčki za optimalno zatesnitev',
      'dodatki': 'Pripomočki in dodatki za shranjevanje'
    };
    
    return descriptionMap[category] || `Izdelki iz kategorije ${this.capitalizeFirstLetter(category)}`;
  }

  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'all': 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z',
      'others': 'M6,2V8H6V8L10,12L6,16V16H6V22H18V16H18V16L14,12L18,8V8H18V2H6M16,16.5V20H8V16.5L12,12.5L16,16.5M12,11.5L8,7.5V4H16V7.5L12,11.5Z',
      'steklenice': 'M12,2A3,3 0 0,1 15,5V6H16A1,1 0 0,1 17,7V8A1,1 0 0,1 16,9H15V19A3,3 0 0,1 12,22A3,3 0 0,1 9,19V9H8A1,1 0 0,1 7,8V7A1,1 0 0,1 8,6H9V5A3,3 0 0,1 12,2M11,6H13V19A1,1 0 0,1 12,20A1,1 0 0,1 11,19V6Z',
      'pokrovčki': 'M12,1L21.5,6.5L12,12L2.5,6.5L12,1M12,23L2.5,17.5L12,12L21.5,17.5L12,23Z',
      'dodatki': 'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21Z'
    };
    
    // Default icon for unknown categories
    return iconMap[category] || 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z';
  }

  trackByCategory(index: number, category: string): string {
    return category;
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    return  `${environment.apiBase}${imageUrl}`;
  }
}
