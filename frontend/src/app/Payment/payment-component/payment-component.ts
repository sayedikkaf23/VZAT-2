import { Component, OnInit, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
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

    if (this.checkoutId && this.isBrowser) {
      const script = this.renderer.createElement('script');
      script.src = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${this.checkoutId}`;
      script.type = 'text/javascript';
      this.renderer.appendChild(document.body, script);
    }
  }
}
