import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentMethod {
  cardId: string;
  maskedCardNumber: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  lastUsed?: Date;
  registrationId: string;
}

export interface CardChangeHistory {
  cardId: string;
  maskedCardNumber: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  isActive: boolean;
  isCurrentSubscriptionCard: boolean;
  addedDate: Date;
  deactivatedDate?: Date;
  deactivationReason?: string;
}

export interface SubscriptionCardResponse {
  success: boolean;
  message: string;
  checkoutId?: string;
  paymentFormUrl?: string;
  subscriptionInfo?: {
    quotepaymentId: string;
    nextPaymentAmount: number;
    paymentsRemaining: number;
    nextChargeDate: Date;
  };
}

export interface PaymentMethodsResponse {
  success: boolean;
  customerEmail: string;
  paymentMethods: PaymentMethod[];
}

export interface CardHistoryResponse {
  success: boolean;
  quotepaymentId: string;
  cardHistory: CardChangeHistory[];
  currentRegistrationId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionCardService {
  private baseUrl = environment.apiUrl ? environment.apiUrl.replace('/api', '') : 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  /**
   * Get all payment methods for a customer
   */
  getPaymentMethods(customerEmail: string): Observable<PaymentMethodsResponse> {
    const params = { customerEmail: customerEmail };
    return this.http.get<PaymentMethodsResponse>(`${this.baseUrl}/api/subscription-card/payment-methods`, { params });
  }

  /**
   * Create a new payment form for changing subscription card
   */
  createCardChangeForm(quotepaymentId: string, customerEmail: string): Observable<SubscriptionCardResponse> {
    const body = { customerEmail: customerEmail };
    return this.http.post<SubscriptionCardResponse>(`${this.baseUrl}/api/subscription-card/${quotepaymentId}/change-card`, body);
  }

  /**
   * Update subscription to use a different existing card
   */
  updateSubscriptionCard(quotepaymentId: string, cardId: string, customerEmail: string): Observable<SubscriptionCardResponse> {
    const body = { cardId: cardId, customerEmail: customerEmail };
    return this.http.put<SubscriptionCardResponse>(`${this.baseUrl}/api/subscription-card/${quotepaymentId}/update-card`, body);
  }

  /**
   * Get card change history for a subscription
   */
  getCardHistory(quotepaymentId: string, customerEmail: string): Observable<CardHistoryResponse> {
    const params = { customerEmail: customerEmail };
    return this.http.get<CardHistoryResponse>(`${this.baseUrl}/api/subscription-card/${quotepaymentId}/card-history`, { params });
  }

  /**
   * Check if current URL indicates a successful card update
   */
  checkCardUpdateStatus(): { updated: boolean; success: boolean; quotepaymentId?: string } {
    if (typeof window ***REMOVED***= 'undefined') {
      return { updated: false, success: false };
    }

    const urlParams = new URLSearchParams(window.location.search);
    const cardUpdated = urlParams.get('card_updated');
    const quotepaymentId = urlParams.get('quotepaymentId');

    if (cardUpdated) {
      return {
        updated: true,
        success: cardUpdated ***REMOVED***= 'success',
        quotepaymentId: quotepaymentId || undefined
      };
    }

    return { updated: false, success: false };
  }

  /**
   * Clear card update status from URL
   */
  clearCardUpdateStatus(): void {
    if (typeof window ***REMOVED***= 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('card_updated');
    url.searchParams.delete('quotepaymentId');
    window.history.replaceState({}, document.title, url.toString());
  }
}
