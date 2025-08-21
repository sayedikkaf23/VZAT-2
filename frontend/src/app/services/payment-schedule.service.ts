import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentScheduleResponse {
  status: boolean;
  message: string;
  quotepaymentId: string;
  payment_type: string;
  first_payment_due_date: string;
  next_installment_due_date: string;
  payment_amount: number;
  installments_left: number;
  installment_type: string;
  payment_link: string;
  payment_page_url: string;
  afs_checkout_id: string;
  shopper_result_url: string;
  data_brands: string;
  payment_schedule: Array<{
    installment_number: number;
    due_date: string;
    amount: number;
    status: 'completed' | 'due' | 'pending' | 'overdue' | 'cancelled';
    transaction_id?: string;
    payment_date?: string;
  }>;
  subscription_info: {
    total_installments: number;
    remaining_installments: number;
    next_charge_date: string;
    installment_amount: number;
    total_amount: number;
  };
  afs_error: any;
}

export interface PaymentRequest {
  OpportunityId: string;
  quotepaymentId: string;
  QuoteId: string;
  InstallmentType: string;
  CreatedDate: string;
  Status: string;
  TotalPrice: number;
  Total_After_VAT_Currency: number;
  Product_details: Array<{
    QuoteLineItemId: string;
    TotalPrice: number;
    Total_Price_After_VAT: number;
  }>;
  quote_payment_number?: string;
  Customer_name?: string;
  opp_owner?: string;
  opp_email?: string;
  opp_number?: string;
  opp_title?: string;
  opp_phone?: string;
  opp_mobile?: string;
}

export interface VzatRecurringData {
  OpportunityId: string;
  quotepaymentId: string;
  QuoteId: string;
  quote_payment_number?: string;
  Customer_name?: string;
  opp_owner?: string;
  opp_email?: string;
  opp_number?: string;
  opp_title?: string;
  opp_phone?: string;
  opp_mobile?: string;
  customer_details?: {
    name: string;
    email: string;
    phone: string;
  };
  paymentSchedule: Array<{
    id: string;
    dueDate: Date;
    amount: number;
    status: 'completed' | 'due' | 'pending';
    isNextPayment: boolean;
  }>;
  subscription_info: {
    total_installments: number;
    remaining_installments: number;
    next_charge_date: string;
    installment_amount: number;
    total_amount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentScheduleService {
  private apiUrl = environment.apiUrl; // Use environment configuration
  
  private paymentDataSubject = new BehaviorSubject<VzatRecurringData | null>(null);
  public paymentData$ = this.paymentDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Create payment link for subscription
   */
  createPaymentLink(paymentRequest: PaymentRequest): Observable<PaymentScheduleResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<PaymentScheduleResponse>(
      `${this.apiUrl}/vzat_recurring_create_payment_link`,
      paymentRequest,
      { headers }
    );
  }

  /**
   * Get VZAT recurring data by quotepaymentId
   */
  getVzatRecurringData(quotepaymentId: string): Observable<VzatRecurringData> {
    return this.http.get<VzatRecurringData>(
      `${this.apiUrl}/vzat_recurring_create_payment_link/${quotepaymentId}`
    );
  }

  /**
   * Get payment schedule details by checkoutId
   */
  getPaymentScheduleByCheckoutId(checkoutId: string): Observable<VzatRecurringData> {
    const url = `${this.apiUrl}/payment_schedule/${checkoutId}`;

    
    return this.http.get<VzatRecurringData>(url);
  }

  /**
   * Process payment for a specific installment
   */
  processPayment(checkoutId: string, paymentData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.apiUrl}/process_payment/${checkoutId}`,
      paymentData,
      { headers }
    );
  }

  /**
   * Set current payment data in service
   */
  setPaymentData(data: VzatRecurringData): void {
    this.paymentDataSubject.next(data);
  }

  /**
   * Get current payment data
   */
  getCurrentPaymentData(): VzatRecurringData | null {
    return this.paymentDataSubject.value;
  }

  /**
   * Clear payment data
   */
  clearPaymentData(): void {
    this.paymentDataSubject.next(null);
  }

  /**
   * Generate payment schedule from API response
   */
  generatePaymentSchedule(subscriptionInfo: any, firstPaymentDate: string): any[] {
    const schedule = [];
    const startDate = new Date(firstPaymentDate);
    const totalInstallments = subscriptionInfo.total_installments;
    const installmentAmount = subscriptionInfo.installment_amount;

    // Calculate the payment day based on business rule
    const getPaymentDay = (date: Date): number => {
      const day = date.getDate();
      return day <= 15 ? 10 : 25; // 1st-15th: 10th, 16th-31st: 25th
    };

    for (let i = 0; i < totalInstallments; i++) {
      let dueDate: Date;
      
      if (i === 0) {
        // First payment: use the provided first payment date
        dueDate = new Date(startDate);
      } else {
        // Subsequent payments: 10th or 25th of each month
        const paymentDay = getPaymentDay(startDate);
        const targetMonth = startDate.getMonth() + i;
        const targetYear = startDate.getFullYear() + Math.floor(targetMonth / 12);
        const adjustedMonth = targetMonth % 12;
        
        dueDate = new Date(targetYear, adjustedMonth, paymentDay);
      }

      const isNextPayment = i === (totalInstallments - subscriptionInfo.remaining_installments);
      const status = i < (totalInstallments - subscriptionInfo.remaining_installments) ? 'completed' : 
                    isNextPayment ? 'due' : 'pending';

      schedule.push({
        id: `installment_${i + 1}`,
        dueDate: dueDate,
        amount: installmentAmount,
        status: status,
        isNextPayment: isNextPayment
      });
    }

    return schedule;
  }
}
