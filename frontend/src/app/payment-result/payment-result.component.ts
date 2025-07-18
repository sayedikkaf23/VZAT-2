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
        // Update component state
        this.result = res;
        this.loading = false;
        this.error = '';
        
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
}
