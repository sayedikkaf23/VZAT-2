import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavedCardsService, ApiResponse, SavedCard } from './saved-cards.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-saved-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-cards.component.html',
  styleUrls: ['./saved-cards.component.scss']
})
export class SavedCardsComponent implements OnInit {
  cards: SavedCard[] = [];
  loading = true;
  error: string | null = null;
  customerId: string | null = null;

  constructor(
    private savedCardsService: SavedCardsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCustomerData();
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
        this.loading = false;
      }
    } else {
      this.error = 'Not logged in. Redirecting to login...';
      this.loading = false;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }

  loadSavedCards() {
    if (!this.customerId) return;
    
    this.loading = true;
    this.error = null;
    
    this.savedCardsService.getCustomerCards(this.customerId).subscribe({
      next: (response: ApiResponse<SavedCard>) => {
        if (response.success) {
          this.cards = response.cards || [];
          console.log('Cards loaded:', this.cards);
        } else {
          this.error = response.message || 'Failed to load saved cards';
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading cards:', error);
        this.error = 'Failed to load saved cards. Please try again.';
        this.loading = false;
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

  getCardIcon(brand: string): string {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳'; // You can replace with actual icon paths
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

  navigateToActiveServices() {
    this.router.navigate(['/active-services']);
  }

  navigateToProfile() {
    this.router.navigate(['/customer-profile']);
  }

  logout() {
    localStorage.removeItem('customerData');
    this.router.navigate(['/login']);
  }

  getDefaultCardNumber(): string {
    const defaultCard = this.cards.find(c => c.isDefault);
    return defaultCard?.maskedCardNumber || 'None';
  }
}
