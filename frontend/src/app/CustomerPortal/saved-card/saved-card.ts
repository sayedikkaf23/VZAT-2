import { Component,Inject, PLATFORM_ID , Renderer2 , ElementRef, OnInit, OnDestroy} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomerLoginService } from '../../services/customer-login.service';
import { StyleLoader } from '../../services/style-loader';
import { SavedCardsService, SavedCard as SavedCardModel, ApiResponse } from '../../customer/saved-cards/saved-cards.service';

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
    private savedCardsService: SavedCardsService
  ) {}
  
  ngOnInit(): void {
    this.loadCustomerData();
    this.styleLoader.loadThemes(this.themeUrls)
      .then(() => {
        // Styles loaded, show content
        this.loading = false;
      })
      .catch(err => {
        console.error(err);
        this.loading = false; // Show anyway if failed
      });
  }

  private loadCustomerData() {
    // Get customer ID from localStorage (set during login)
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      const parsed = JSON.parse(customerData);
      this.customerId = parsed.customerId || parsed._id;
      
      if (this.customerId) {
        this.loadSavedCards();
      } else {
        this.error = 'Customer ID not found. Please login again.';
      }
    } else {
      this.error = 'Not logged in. Please login again.';
    }
  }

  loadSavedCards() {
    if (!this.customerId) return;
    
    this.error = null;
    
    this.savedCardsService.getCustomerCards(this.customerId).subscribe({
      next: (response: ApiResponse<SavedCardModel>) => {
        if (response.success) {
          this.cards = response.cards || [];
          console.log('Cards loaded:', this.cards);
        } else {
          this.error = response.message || 'Failed to load saved cards';
        }
      },
      error: (error: any) => {
        console.error('Error loading cards:', error);
        this.error = 'Failed to load saved cards. Please try again.';
      }
    });
  }

  setDefaultCard(cardId: string) {
    if (!this.customerId) return;
    
    this.savedCardsService.setDefaultCard(cardId, this.customerId).subscribe({
      next: (response: ApiResponse<void>) => {
        if (response.success) {
          // Update local cards array
          this.cards.forEach(card => {
            card.isDefault = card._id ***REMOVED***= cardId;
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
            this.cards = this.cards.filter(card => card._id !***REMOVED*** cardId);
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

      ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
