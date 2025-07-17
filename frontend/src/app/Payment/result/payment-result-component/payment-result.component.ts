import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class PaymentResultComponent implements OnInit {
  paymentStatus: any = null;
  loading = true;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    const resourcePath = this.route.snapshot.queryParamMap.get('resourcePath');
    if (resourcePath) {
      this.http
        .get(`/api/vzat_recurring_create_payment_link/payment/result?resourcePath=${encodeURIComponent(resourcePath)}`)
        .subscribe({
          next: (result) => {
            this.paymentStatus = result;
            this.loading = false;
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to fetch payment result.';
            this.loading = false;
          },
        });
    } else {
      this.error = 'Missing payment result information.';
      this.loading = false;
    }
  }
}
