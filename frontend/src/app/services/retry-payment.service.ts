import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RetryPaymentRequest {
  quotepaymentId: string;
  customerEmail: string;
}

export interface RetryPaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  amount?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RetryPaymentService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  /**
   * Retry a failed payment
   */
  retryPayment(request: RetryPaymentRequest): Observable<RetryPaymentResponse> {
    return this.http.post<RetryPaymentResponse>(`${this.apiUrl}/retry-payment/retry-payment`, request);
  }
}
