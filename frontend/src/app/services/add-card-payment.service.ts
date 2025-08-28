import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CardDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutId?: string;
  message?: string;
  error?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AddCardPaymentService {
  private apiUrl = environment.apiUrl;
  private oppwaUrl = 'https://eu-test.oppwa.com/v1';
  // Note: entityId and authorization are now handled by the backend using environment variables

  constructor(private http: HttpClient) {}

  // Initialize payment for card addition (1 AED charge)
  initializeCardPayment(customerId: string): Observable<PaymentResponse> {
    console.log('🔍 AddCardPaymentService: customerId =', customerId);
    
    const payload = {
      amount: '1.00',
      currency: 'AED',
      paymentType: 'DB',
      customerId: customerId,
      description: 'Card verification charge - will be refunded'
    };

    console.log('🔍 AddCardPaymentService: payload =', payload);

    return this.http.post<PaymentResponse>(`${this.apiUrl}/add-card/initialize-payment`, payload);
  }

  // Process card payment with AFS
  processCardPayment(checkoutId: string, cardDetails: CardDetails): Observable<PaymentResponse> {
    const payload = {
      checkoutId: checkoutId,
      cardDetails: cardDetails,
      amount: '1.00',
      currency: 'AED',
      paymentType: 'DB'
    };

    return this.http.post<PaymentResponse>(`${this.apiUrl}/add-card/process-payment`, payload);
  }

  // Refund the 1 AED charge
  refundCardPayment(paymentId: string): Observable<RefundResponse> {
    const payload = {
      amount: '1.00',
      paymentType: 'RF',
      currency: 'AED',
      paymentId: paymentId
    };

    return this.http.post<RefundResponse>(`${this.apiUrl}/add-card/refund-payment`, payload);
  }

  // Save card details to database
  saveCardDetails(customerId: string, cardDetails: CardDetails, paymentId: string): Observable<any> {
    const payload = {
      customerId: customerId,
      cardDetails: cardDetails,
      paymentId: paymentId,
      isDefault: false, // Will be set to true if this is the first card
      isActive: true
    };

    return this.http.post(`${this.apiUrl}/add-card/save-card`, payload);
  }

  // Set card as default
  setCardAsDefault(cardId: string, customerId: string): Observable<any> {
    const payload = {
      cardId: cardId,
      customerId: customerId
    };

    return this.http.put(`${this.apiUrl}/saved-cards/card/${cardId}/set-default`, payload);
  }

  // Get customer's saved cards to check if this is the first card
  getCustomerCards(customerId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/saved-cards/customer/${customerId}`);
  }
}
