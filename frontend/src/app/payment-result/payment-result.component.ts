import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.scss']
})
export class PaymentResultComponent implements OnInit {
  result: any;
  error: string = '';
  loading = true;
  
  // Dynamic data properties
  customerName: string = '';
  paymentAmount: number = 0;
  totalAmount: number = 0;
  remainingAmount: number = 0;
  showDebugInfo: boolean = false; // Set to true to show debug information

  constructor(private route: ActivatedRoute, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const resourcePath = this.route.snapshot.queryParamMap.get('resourcePath');
    const quotepaymentId = this.route.snapshot.queryParamMap.get('quotepaymentId');
    const id = this.route.snapshot.queryParamMap.get('id');
    
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
        this.cdr.detectChanges();
      }
    });
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
    
    // Extract QP ID from multiple possible sources
    const qpId = result?.quotepaymentId || 
                result?.quote_payment_id || 
                result?.QuotePaymentId ||
                this.route.snapshot.queryParamMap.get('quotepaymentId') ||
                'Not available';
    
    // Calculate remaining amount
    this.remainingAmount = this.totalAmount - this.paymentAmount;
    
    // Ensure remaining amount is not negative
    if (this.remainingAmount < 0) {
      this.remainingAmount = 0;
    }
    
    
    // Store QP ID for template access if needed
    this.result.qpId = qpId;
    
    // Enable debug info in development environment
    this.showDebugInfo = !environment.production;
  }
}
