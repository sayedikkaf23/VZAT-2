import { Component,Inject, PLATFORM_ID , Renderer2 , ElementRef, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomerLoginService } from '../../services/customer-login.service';
import { StyleLoader } from '../../services/style-loader';
import { SavedCardsService, SavedCard as SavedCardModel, ApiResponse } from '../../customer/saved-cards/saved-cards.service';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-saved-card',
  imports: [RouterLink, CommonModule],
  templateUrl: './saved-card.html',
  styleUrl: './saved-card.scss'
})
export class SavedCard implements OnInit, OnDestroy {
  loading = true; 
  cards: SavedCardModel[] = [];
  error: string | null = null;
  customerId: string | null = null;
  private loadingTimeout: any;
  
  private themeUrls = [
    'assets/CustomerPortal/css/style.css',
    'assets/CustomerPortal/css/responsive.css'
  ];
  isSidebarHidden = false;
  isNavbarActive = false;
  
  constructor( 
    @Inject(DOCUMENT) private document: Document, 
    private renderer: Renderer2, 
    private el: ElementRef, 
    private customerLogin: CustomerLoginService, 
    private styleLoader: StyleLoader,
    private savedCardsService: SavedCardsService,
    private cookieService: CookieService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadCustomerData();
    this.styleLoader.loadThemes(this.themeUrls)
      .then(() => {
        console.log('Styles loaded successfully');
        // Retry loading cards after styles are loaded if they failed initially
        if (this.customerId) {
          this.retryLoadCards();
        }
      })
      .catch(err => {
        console.error('Style loading failed:', err);
      });

    // Fallback checks to ensure loading works
    setTimeout(() => {
      if (this.loading && this.customerId) {
        this.retryLoadCards();
      }
    }, 1000);

    // Listen for layout changes that might indicate sidebar toggle
    this.setupLayoutObserver();
  }

  private debugCurrentState() {
    console.log('Current component state:', {
      loading: this.loading,
      error: this.error,
      customerId: this.customerId,
      cardsCount: this.cards.length
    });
  }

  private setupLayoutObserver() {
    // Use ResizeObserver to detect when component becomes visible/layout changes
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          // If component becomes visible and we're still loading, retry
          if (entry.contentRect.width > 0 && this.loading && this.customerId) {
            console.log('Component became visible, checking card load status');
            setTimeout(() => {
              if (this.loading) {
                console.log('Still loading after visibility change, retrying');
                this.retryLoadCards();
              }
            }, 100);
          }
        }
      });
      
      resizeObserver.observe(this.el.nativeElement);
    }
  }

  private loadCustomerData() {
    // Get customer ID from localStorage (set during login)
    const customerData = localStorage.getItem('customerData');
    
    if (customerData) {
      try {
        const parsed = JSON.parse(customerData);
        console.log('Customer data found:', parsed);
        
        // Try different possible field names for customer ID
        this.customerId = parsed.id || parsed._id || parsed.customerId;
        
        if (this.customerId) {
          console.log('Customer ID found:', this.customerId);
          // Immediate load
          this.loadSavedCards();
          
          // Also schedule a backup load
          setTimeout(() => {
            if (this.loading) {
              this.loadSavedCards();
            }
          }, 50);
        } else {
          console.error('No customer ID found in data:', parsed);
          this.error = 'Customer ID not found. Please login again.';
          this.loading = false;
        }
      } catch (e) {
        console.error('Error parsing customer data:', e);
        this.error = 'Invalid customer data. Please login again.';
        this.loading = false;
      }
    } else {
      // Try to get customer ID from JWT token as fallback
      console.log('No customer data in localStorage, trying JWT token');
      this.tryGetCustomerIdFromToken();
    }
  }

  private tryGetCustomerIdFromToken() {
    const token = this.cookieService.get('jwtToken');
    if (token) {
      try {
        // Decode JWT token (basic decode, not verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT payload:', payload);
        
        this.customerId = payload.customerId || payload.id || payload.userId;
        
        if (this.customerId) {
          console.log('Customer ID found in JWT:', this.customerId);
          this.loadSavedCards();
        } else {
          console.error('No customer ID found in JWT:', payload);
          this.error = 'Customer ID not found. Please login again.';
          this.loading = false;
        }
      } catch (e) {
        console.error('Error decoding JWT token:', e);
        this.error = 'Invalid session. Please login again.';
        this.loading = false;
      }
    } else {
      console.error('No JWT token found');
      this.error = 'Not logged in. Please login again.';
      this.loading = false;
    }
  }

  loadSavedCards() {
    if (!this.customerId) {
      console.error('Cannot load cards - no customer ID');
      this.loading = false;
      this.error = 'Customer ID not found. Please login again.';
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    // Clear any existing timeout
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    // Set a timeout to prevent infinite loading
    this.loadingTimeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'Loading took too long. Please try clicking refresh again.';
      }
    }, 15000);
    
    this.savedCardsService.getCustomerCards(this.customerId).subscribe({
      next: (response: ApiResponse<SavedCardModel>) => {
        console.log('API Response received:', response);
        this.loading = false;
        if (this.loadingTimeout) {
          clearTimeout(this.loadingTimeout);
          this.loadingTimeout = null;
        }
        
        // Force change detection for loading state
        this.cdr.detectChanges();
        
        if (response.success) {
          this.cards = response.cards || [];
          console.log('Cards loaded successfully:', this.cards.length, 'cards');
          
          // Force change detection for cards
          this.cdr.detectChanges();
          
          if (this.cards.length === 0) {
            console.log('No cards found for this customer');
          }
        } else {
          console.error('API returned error:', response.message);
          this.error = response.message || 'Failed to load saved cards';
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('API Error occurred:', error);
        this.loading = false;
        if (this.loadingTimeout) {
          clearTimeout(this.loadingTimeout);
          this.loadingTimeout = null;
        }
        
        // Force change detection for error state
        this.cdr.detectChanges();
        
        if (error.status === 0) {
          this.error = 'Unable to connect to server. Please check your internet connection and try again.';
          // Auto-retry once for network errors
          setTimeout(() => {
            if (this.error && this.customerId) {
              this.retryLoadCards();
            }
          }, 2000);
        } else if (error.status === 404) {
          this.error = 'Cards service not found. Please contact support.';
        } else if (error.status === 500) {
          this.error = 'Server error. Please try again in a few moments.';
        } else if (error.status === 401 || error.status === 403) {
          this.error = 'Session expired. Please login again.';
        } else {
          this.error = `Failed to load saved cards. Error: ${error.status || 'Network error'}`;
        }
      }
    });
  }

  private ensureCardsLoaded() {
    if (this.loading && this.customerId && !this.error) {
      console.log('🔄 Ensuring cards are loaded - current state:', {
        loading: this.loading,
        customerId: this.customerId,
        cardsCount: this.cards.length,
        error: this.error
      });
      
      // If still loading after reasonable time, retry
      this.retryLoadCards();
    }
  }

  public retryLoadCards() {
    if (!this.customerId) {
      console.error('Cannot retry - no customer ID');
      this.error = 'Customer ID not found. Please login again.';
      this.loading = false;
      return;
    }
    
    console.log('Retrying card load for customer:', this.customerId);
    
    // Clear any existing timeout before retry
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    this.error = null;
    this.loading = true;
    this.loadSavedCards();
  }

  refreshCards() {
    console.log('Manual refresh triggered');
    
    // Reset all states first
    this.loading = true;
    this.error = null;
    this.cards = [];
    
    // Clear any existing timeout
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    if (this.customerId) {
      this.loadSavedCards();
    } else {
      this.loadCustomerData();
    }
  }

  // TrackBy function for ngFor performance
  trackByCardId(index: number, card: SavedCardModel): string {
    return card._id;
  }

  setDefaultCard(cardId: string) {
    if (!this.customerId) return;
    
    this.savedCardsService.setDefaultCard(cardId, this.customerId).subscribe({
      next: (response: ApiResponse<void>) => {
        if (response.success) {
          // Update local cards array
          this.cards.forEach(card => {
            card.isDefault = card._id === cardId;
          });
          console.log('Default card updated');
        } else {
          this.error = response.message || 'Failed to set default card';
        }
      },
      error: (error: any) => {
        console.error('Error setting default card:', error);
        this.error = 'Failed to set default card. Please try again.';
      }
    });
  }

  removeCard(cardId: string) {
    if (!this.customerId) return;
    
    if (confirm('Are you sure you want to remove this card?')) {
      this.savedCardsService.removeCard(cardId, this.customerId).subscribe({
        next: (response: ApiResponse<void>) => {
          if (response.success) {
            // Remove card from local array
            this.cards = this.cards.filter(card => card._id !== cardId);
            console.log('Card removed successfully');
          } else {
            this.error = response.message || 'Failed to remove card';
          }
        },
        error: (error: any) => {
          console.error('Error removing card:', error);
          this.error = 'Failed to remove card. Please try again.';
        }
      });
    }
  }

  // Fix existing card numbers (for development/testing)
  fixCardNumbers() {
    console.log('🔧 Fixing existing card numbers...');
    this.savedCardsService.fixCardNumbers().subscribe({
      next: (response: ApiResponse<void>) => {
        if (response.success) {
          console.log('✅ Card numbers fixed successfully');
          // Reload cards to see the changes
          this.loadSavedCards();
        } else {
          console.error('❌ Failed to fix card numbers:', response.message);
        }
      },
      error: (error: any) => {
        console.error('❌ Error fixing card numbers:', error);
      }
    });
  }

  getCardIcon(brand: string): string {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  }

  formatCardNumber(maskedNumber: string): string {
    // Ensure proper formatting of masked card number
    return maskedNumber.replace(/(.{4})/g, '$1 ').trim();
  }

  onLogout(): void {
    this.customerLogin.logout();
  }

    toggleSidebar(): void {
    this.isSidebarHidden = !this.isSidebarHidden;

    if (this.isSidebarHidden) {
      this.renderer.addClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.addClass(adminBody, 'sidebar-hidden');
    } else {
      this.renderer.removeClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.removeClass(adminBody, 'sidebar-hidden');
    }

    // Check if cards need to be loaded when sidebar state changes
    setTimeout(() => {
      if (this.loading && this.customerId) {
        this.retryLoadCards();
      }
    }, 100);
  }

    toggleNavbar(): void {
    this.isNavbarActive = !this.isNavbarActive;

    const toggleElement = this.document.querySelector('.navbar-toggle');
    if (toggleElement) {
      if (this.isNavbarActive) {
        toggleElement.classList.add('active');
      } else {
        toggleElement.classList.remove('active');
      }
    }
  }

  /**
   * Navigate to add card page
   */
  addCard(): void {
    console.log('🔄 Navigating to add card page...');
    this.router.navigate(['/saved-card/add-card']);
  }

  ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }

}
