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
    
    console.log('🔍 Payment Result Debug:');
    console.log('   - Environment API URL:', environment.apiUrl);
    console.log('   - Backend URL:', backendUrl);
    console.log('   - Resource Path:', resourcePath);
    console.log('   - Quote Payment ID:', quotepaymentId);
    console.log('   - ID:', id);
    console.log('   - Params:', params);
    
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
        console.error('Payment result error:', err);
        
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
    console.log('🔍 Extracting dynamic data from result:', result);
    
    // Extract customer name from various possible sources
    this.customerName = result?.customer_name || 
                       result?.Customer_name ||
                       result?.customerName ||
                       result?.paymentData?.customer_name ||
                       result?.subscription_info?.customer_name ||
                       'Customer';
    
    // Extract payment amount from various possible sources
    this.paymentAmount = parseFloat(result?.amount) || 
                        parseFloat(result?.Amount) ||
                        parseFloat(result?.paid_amount) ||
                        parseFloat(result?.Paid_Amount) ||
                        parseFloat(result?.subscription_info?.amount) ||
                        parseFloat(result?.paymentData?.amount) ||
                        0;
    
    console.log('📋 Extracted Data:');
    console.log('   - Customer Name:', this.customerName);
    console.log('   - Payment Amount:', this.paymentAmount);
    
    // Enable debug info in development environment
    this.showDebugInfo = !environment.production;
  }
}
