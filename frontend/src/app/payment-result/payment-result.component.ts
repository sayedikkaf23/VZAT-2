import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { SalesAgentSidebarComponent } from '../shared/components/sales-agent-sidebar/sales-agent-sidebar.component';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, SalesAgentSidebarComponent],
  templateUrl: './payment-result.component.html',
  styleUrls: [
    './payment-result.component.scss',
    '../../assets/css/bootstrap.min.css',
    '../../assets/css/payment-schedual.css'
  ]
})
export class PaymentResultComponent implements OnInit {
  result: any;
  error: string = '';
  loading = true;
  reason: string = ''; // Add missing reason property
  
  // Dynamic data properties
  customerName: string = '';
  paymentAmount: number = 0; // Installment amount for main display
  totalAmount: number = 0; // Full contract amount
  remainingAmount: number = 0;
  quotepaymentId: string = '';
  Quote_payment_number: string = ''; // Quote payment number field
  showDebugInfo: boolean = false; // Set to true to show debug information
  
  // Sidebar specific properties
  sidebarPaymentAmount: number = 0; // Full amount for sidebar display
  
  // Sales agent data
  salesAgent: any = {
    name: "NA",
    position: "NA",
    faxNumber: "NA",
    phoneNumber: "NA",
    email: "NA",
    mobNo1: null
  };

  private sanitizeField(val: any): string {
    if (val ***REMOVED*** null) return '';
    const s = String(val).trim();
    const up = s.toUpperCase();
    if (!s || up ***REMOVED***= 'NA' || up ***REMOVED***= 'N/A') return '';
    return s;
  }

  constructor(private route: ActivatedRoute, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const resourcePath = this.route.snapshot.queryParamMap.get('resourcePath');
    const quotepaymentId = this.route.snapshot.queryParamMap.get('quotepaymentId');
    const id = this.route.snapshot.queryParamMap.get('id');
    
    // Store quotepaymentId for later use
    this.quotepaymentId = quotepaymentId || '';
    
    // Get reason from query params
    this.reason = this.route.snapshot.queryParamMap.get('reason') || '';
    
    if (!resourcePath) {
      this.error = 'Missing resourcePath parameter.';
      this.loading = false;
      return;
    }
    
    const params: any = { resourcePath: resourcePath || '', quotepaymentId: quotepaymentId || '' };
    
    const backendUrl = `${environment.apiUrl}/payment/result`;
    
    
    this.http.get(backendUrl, { params }).subscribe({
      next: (res: any) => {
        console.log('📋 Payment Result Response:', res);
        
        // Update component state
        this.result = res;
        this.loading = false;
        this.error = '';
        
        // Extract dynamic data
        this.extractDynamicData(res);
        
        // If quotepaymentId is available, fetch additional data from VzatRecurringData
        if (this.quotepaymentId) {
          this.fetchVzatRecurringData(this.quotepaymentId);
        }
        
        // Force change detection
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ Payment result error:', err);
        
        this.error = err?.error?.message || 'Failed to get payment result.';
        this.loading = false;
        
        // If payment fails, fetch VzatRecurringData using quotepaymentId
        if (quotepaymentId) {
          this.fetchVzatRecurringData(quotepaymentId);
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  // Add missing tryAgain method
  tryAgain(): void {
    // Reload the current page to retry
    window.location.reload();
  }

  /**
   * Fetch VzatRecurringData when payment fails
   */
  private fetchVzatRecurringData(quotepaymentId: string): void {
    const vzatDataUrl = `${environment.apiUrl}/vzat_recurring_create_payment_link/${quotepaymentId}`;
    
    console.log('🔍 Fetching VzatRecurringData for quotepaymentId:', quotepaymentId);
    
    this.http.get(vzatDataUrl).subscribe({
      next: (data: any) => {
        console.log('📋 VzatRecurringData Response:', data);
        
        // Extract data for sidebar display
        this.extractVzatDataForSidebar(data);
        
        // Force change detection
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ VzatRecurringData fetch error:', err);
        // Keep default sales agent data if fetch fails
      }
    });
  }

  /**
   * Extract VzatRecurringData for sidebar display
   */
  private extractVzatDataForSidebar(data: any): void {
    // Extract customer name
    this.customerName = data?.Customer_name || 
                       data?.customer_name || 
                       data?.name ||
                       'Customer';
    
    // Extract Quote_payment_number
    this.Quote_payment_number = data?.Quote_payment_number || 
                               data?.quote_payment_number ||
                               data?.QuotePaymentNumber ||
                               '';
    
    // Extract installment amount from payment schedule (first installment)
    let installmentAmount = 0;
    if (data?.payment_schedule && Array.isArray(data.payment_schedule) && data.payment_schedule.length > 0) {
      installmentAmount = parseFloat(data.payment_schedule[0].amount) || 0;
    }
    
    // If no payment schedule, try to get installment amount from other fields
    if (installmentAmount ***REMOVED***= 0) {
      installmentAmount = parseFloat(data?.installment_amount) || 
                         parseFloat(data?.Installment_amount) ||
                         parseFloat(data?.payment_amount) ||
                         0;
    }
    
    // Store full amount for sidebar display (total contract value)
    this.sidebarPaymentAmount = parseFloat(data?.Total_After_VAT_Currency) || 
                               parseFloat(data?.total_after_vat_currency) ||
                               parseFloat(data?.amount) ||
                               0;
    
    console.log('💰 Sidebar Amount Logic:', {
      totalAfterVAT: data?.Total_After_VAT_Currency,
      sidebarPaymentAmount: this.sidebarPaymentAmount,
      installmentAmount: installmentAmount
    });
    
    // Store quotepaymentId for display
    this.quotepaymentId = data?.quotepaymentId || this.quotepaymentId;
    
    // Extract sales agent information from VzatRecurringData with better fallback
    if (data?.salesPersonDetails) {
      const phoneRaw = data.salesPersonDetails.salesPersonPhone || '';
      const mobileRaw = data.salesPersonDetails.salesPersonMobile || '';
      const phone = phoneRaw.trim();
      const mobile = mobileRaw.trim();
      const same = this.normalizePhone(phone) ***REMOVED***= this.normalizePhone(mobile);

      this.salesAgent = {
        name: data.salesPersonDetails.salesPersonName,
        // position: data.salesPersonDetails.salesPersonPosition || "Sales Representative",
        faxNumber: this.sanitizeField(data.salesPersonDetails.salesPersonFax),
        phoneNumber: phone || (mobile || 'NA'),
        email: data.salesPersonDetails.salesPersonEmail || "support@virtuzone.com",
        mobNo1: same ? null : (mobile || null)
      };
    } else {
      // Fallback to default contact information
      this.salesAgent = {
        name: "Support Team",
        position: "Customer Support",
        faxNumber: "+971 4 457 8271",
        phoneNumber: "+971 4 457 8271",
        email: "support@virtuzone.com",
        mobNo1: null
      };
    }
    
    console.log('🔧 VzatData Sales Agent Updated:', this.salesAgent);
  }

  /**
   * Extract dynamic data from payment result
   */
  private extractDynamicData(result: any): void {
    
    // Extract customer name - prioritize different possible field names
    this.customerName = result?.customer_name || 
                       result?.Customer_name || 
                       result?.customerName ||
                       result?.name ||
                       'Customer';
    
    // Extract Quote_payment_number
    this.Quote_payment_number = result?.Quote_payment_number || 
                               result?.quote_payment_number ||
                               result?.QuotePaymentNumber ||
                               '';
    
    // Extract total amount from Total_After_VAT_Currency
    this.totalAmount = parseFloat(result?.Total_After_VAT_Currency) || 
                      parseFloat(result?.total_after_vat_currency) ||
                      parseFloat(result?.total_amount) ||
                      0;
    
    // Extract payment amount (how much was paid in this transaction)
    this.paymentAmount = parseFloat(result?.amount) || 
                        parseFloat(result?.Amount) ||
                        parseFloat(result?.paid_amount) ||
                        parseFloat(result?.Paid_Amount) ||
                        0;
    
    // Extract installment amount from payment schedule (first installment)
    let installmentAmount = 0;
    if (result?.payment_schedule && Array.isArray(result.payment_schedule) && result.payment_schedule.length > 0) {
      installmentAmount = parseFloat(result.payment_schedule[0].amount) || 0;
    }
    
    // If no payment schedule, try to get installment amount from other fields
    if (installmentAmount ***REMOVED***= 0) {
      installmentAmount = parseFloat(result?.installment_amount) || 
                         parseFloat(result?.Installment_amount) ||
                         parseFloat(result?.payment_amount) ||
                         0;
    }
    
    // Store installment amount for display
    this.paymentAmount = installmentAmount > 0 ? installmentAmount : this.paymentAmount;
    
    console.log('💰 Payment Amount Logic:', {
      installmentAmount,
      originalPaymentAmount: parseFloat(result?.amount) || 0,
      finalPaymentAmount: this.paymentAmount,
      totalAmount: this.totalAmount,
      paymentSchedule: result?.payment_schedule
    });
    
    // Extract sales agent information with better fallback handling
    if (result?.salesPersonDetails) {
      const phoneRaw = result.salesPersonDetails.salesPersonPhone || '';
      const mobileRaw = result.salesPersonDetails.salesPersonMobile || '';
      const phone = phoneRaw.trim();
      const mobile = mobileRaw.trim();
      const same = this.normalizePhone(phone) ***REMOVED***= this.normalizePhone(mobile);

      this.salesAgent = {
        name: result.salesPersonDetails.salesPersonName,
        position: result.salesPersonDetails.salesPersonPosition,
        faxNumber: this.sanitizeField(result.salesPersonDetails.salesPersonFax),
        phoneNumber: phone || (mobile || 'NA'),
        email: result.salesPersonDetails.salesPersonEmail || "NA",
        mobNo1: same ? null : (mobile || null)
      };
    } else {
      // Fallback to default contact information
      this.salesAgent = {
        name: "Support Team",
        position: "Customer Support",
        faxNumber: "+971 4 457 8271",
        phoneNumber: "+971 4 457 8271",
        email: "support@virtuzone.com",
        mobNo1: null
      };
    }
    
    console.log('🔧 Sales Agent Data Updated:', this.salesAgent);
    
    // Extract QP ID from multiple possible sources and store in quotepaymentId property
    this.quotepaymentId = result?.quotepaymentId || 
                         result?.quote_payment_id || 
                         result?.QuotePaymentId ||
                         this.route.snapshot.queryParamMap.get('quotepaymentId') ||
                         this.quotepaymentId ||
                         'Not available';
    
    // Calculate remaining amount
    this.remainingAmount = this.totalAmount - this.paymentAmount;
    
    // Ensure remaining amount is not negative
    if (this.remainingAmount < 0) {
      this.remainingAmount = 0;
    }
    
    
    // Store QP ID for template access if needed
    this.result.qpId = this.quotepaymentId;
    
    // Enable debug info in development environment
    this.showDebugInfo = !environment.production;
  }

  private normalizePhone(n: string | null | undefined): string {
    return (n || '').replace(/\D+/g, '');
  }
}
