import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-payment-widget',
  templateUrl: './payment-widget.component.html',
  styleUrls: ['./payment-widget.component.scss']
})
export class PaymentWidgetComponent implements OnInit, OnDestroy {
  @Input() paymentLink: string = '';
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit(): void {
    if (this.paymentLink) {
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = this.paymentLink;
      this.scriptElement.async = true;
      document.body.appendChild(this.scriptElement);
    }
  }

  ngOnDestroy(): void {
    if (this.scriptElement) {
      document.body.removeChild(this.scriptElement);
    }
  }
}
