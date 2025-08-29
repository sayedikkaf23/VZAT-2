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
  paymentAmount: number = 0;
  totalAmount: number = 0;
  remainingAmount: number = 0;
  quotepaymentId: string = '';
  showDebugInfo: boolean = false; // Set to true to show debug information
  
  // Sales agent data
  salesAgent: any = {
    name: "NA",
    position: "NA",
    faxNumber: "NA",
    phoneNumber: "NA",
    email: "NA"
  };

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
    
    // Extract payment amount
    this.paymentAmount = parseFloat(data?.Total_After_VAT_Currency) || 
                        parseFloat(data?.total_after_vat_currency) ||
                        parseFloat(data?.amount) ||
                        0;
    
    // Store quotepaymentId for display
    this.quotepaymentId = data?.quotepaymentId || this.quotepaymentId;
    
    // Extract sales agent information from VzatRecurringData
    if (data?.salesPersonDetails) {
      this.salesAgent = {
        name: data.salesPersonDetails.salesPersonName || "NA",
        position: data.salesPersonDetails.salesPersonPosition || "Sales Representative",
        faxNumber: data.salesPersonDetails.salesPersonFax || "NA",
        phoneNumber: data.salesPersonDetails.salesPersonMobile || data.salesPersonDetails.salesPersonPhone || "NA",
        email: data.salesPersonDetails.salesPersonEmail || "NA",
        mobNo1: data.salesPersonDetails.salesPersonMobile || null
      };
    } else {
      // Fallback to default contact information
      this.salesAgent = {
        name: "Support Team",
        position: "Customer Support",
        faxNumber: "+971 4 457 8271",
        phoneNumber: "+971 4 457 8271",
        email: "support@virtuzone.com"
      };
    }
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
    
    // Extract sales agent information
    if (result?.salesPersonDetails) {
      this.salesAgent = {
        name: result.salesPersonDetails.salesPersonName || "NA",
        position: "NA",
        faxNumber: "NA",
        phoneNumber: result.salesPersonDetails.salesPersonMobile || "NA",
        email: result.salesPersonDetails.salesPersonEmail || "NA",
        mobNo1: result.salesPersonDetails.salesPersonMobile || null
      };
    } else {
      // Fallback to default contact information
      this.salesAgent = {
        name: "Support Team",
        position: "Customer Support",
        faxNumber: "+971 4 457 8271",
        phoneNumber: "+971 4 457 8271",
        email: "support@virtuzone.com"
      };
    }
    
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
}
