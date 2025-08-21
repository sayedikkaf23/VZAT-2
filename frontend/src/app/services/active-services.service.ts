import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentScheduleService {
  id: string;
  installment_number: number;
  customerName: string;
  Customer_name: string; // Database field
  opp_email: string; // Database field
  QuoteLineItemId: string; // Database field
  quotepaymentId: string;
  due_date: string;
  amount: number;
  status: 'due' | 'pending' | 'completed' | 'paid' | 'failed' | 'overdue' | 'cancelled';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'pending' | 'expired' | 'failed' | 'overdue' | 'completed'; // Database field
  subscriptionStatus: string;
  Total_After_VAT_Currency?: number; // Total amount after VAT for remaining calculation
  // Additional fields for reference
  opportunityId: string;
  quoteId: string;
  createdDate: Date;
  payment_schedule?: PaymentScheduleItem[]; // For nested payment data
}

export interface PaymentScheduleItem {
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
}

export interface ActiveServicesResponse {
  success: boolean;
  customerEmail: string;
  totalServices: number;
  activeSubscriptions: number;
  services: PaymentScheduleService[];
  summary: {
    totalPaid: number;
    totalDue: number;
    totalPending: number;
    totalAmountPaid: number;
    totalAmountDue: number;
  };
}

export interface ServiceDetails {
  success: boolean;
  quotepaymentId: string;
  serviceName: string;
  customerName: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paymentsCompleted: number;
  subscriptionStatus: string;
  nextChargeDate?: Date;
  lastPaymentDate?: Date;
  paymentSchedule: Array<{
    paymentNumber: number;
    scheduledDate: Date;
    amount: number;
    status: 'Paid' | 'Due' | 'Future';
    paidDate?: Date;
  }>;
  opportunityId: string;
  quoteId: string;
  createdDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ActiveServicesService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all active services (payment schedules) for the customer
   */
  getActiveServices(customerEmail: string): Observable<ActiveServicesResponse> {
    
    const params = new HttpParams().set('customerEmail', customerEmail);
    
    return this.http.get<ActiveServicesResponse>(`${this.baseUrl}/customer/active-services`, { params });
  }

  /**
   * Get detailed information for a specific service
   */
  getServiceDetails(quotepaymentId: string, customerEmail: string): Observable<ServiceDetails> {
    
    const params = new HttpParams().set('customerEmail', customerEmail);
    
    return this.http.get<ServiceDetails>(`${this.baseUrl}/customer/service-details/${quotepaymentId}`, { params });
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get status badge class for payment status
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'badge-completed'; // Green with white text
      case 'due':
        return 'badge-due'; // Orange/yellow
      case 'pending':
        return 'badge-pending'; // Red with white text
      case 'overdue':
        return 'badge-overdue'; // Dark red
      case 'cancelled':
        return 'badge-cancelled'; // Dark gray
      default:
        return 'badge-unknown'; // Light gray
    }
  }

  /**
   * Get status icon for payment status
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'fas fa-check-circle text-success';
      case 'due':
        return 'fas fa-exclamation-circle text-warning';
      case 'pending':
        return 'fas fa-clock text-secondary';
      case 'overdue':
        return 'fas fa-exclamation-triangle text-danger';
      case 'cancelled':
        return 'fas fa-times-circle text-dark';
      default:
        return 'fas fa-question-circle text-muted';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date ***REMOVED***= 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Check if payment is overdue
   */
  isOverdue(dueDate: Date | string, status: string): boolean {
    if (status ***REMOVED***= 'paid' || status ***REMOVED***= 'pending') return false;
    
    const dateObj = typeof dueDate ***REMOVED***= 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    return dateObj < today && status ***REMOVED***= 'due';
  }
}
