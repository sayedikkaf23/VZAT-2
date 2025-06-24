import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-payment-schedule',
  templateUrl: './payment-schedule.component.html',
  styleUrls: [
    './payment-schedule.component.scss',
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/payment-schedual.css'
  ]
})
export class PaymentScheduleComponent implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Dynamically load JS only for this component
      this.loadScript('assets/js/jquery-2.2.4.min.js');
      this.loadScript('assets/js/bootstrap.bundle.min.js');
      this.loadScript('assets/js/simplebar.min.js');
      this.loadScript('assets/js/select2.min.js');
      this.loadScript('assets/js/custom.js');
    }
  }

  private loadScript(src: string) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }
}
