import { Component, OnInit, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class PaymentComponent implements OnInit {
  checkoutId: string = '';
  entityId = '8ac7a4c797e1beca0197e482a8200127';
  brands = 'VISA MASTER AMEX';
  isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.checkoutId = this.route.snapshot.paramMap.get('checkoutId') || '';
    
    console.log('Payment Component - checkoutId:', this.checkoutId);
    console.log('Payment Component - isBrowser:', this.isBrowser);

    if (this.checkoutId && this.isBrowser) {
      const script = this.renderer.createElement('script');
      script.src = `https://eu-prod.oppwa.com/v1/paymentWidgets.js?checkoutId=${this.checkoutId}`;
      script.type = 'text/javascript';
      
      // Add onload and onerror handlers for debugging
      script.onload = () => {
        console.log('AFS Payment Widget script loaded successfully');
      };
      
      script.onerror = (error: any) => {
        console.error('Failed to load AFS Payment Widget script:', error);
      };
      
      this.renderer.appendChild(document.body, script);
      console.log('AFS Payment Widget script added to DOM');
    } else {
      console.error('Missing checkoutId or not in browser environment');
    }
  }
}
