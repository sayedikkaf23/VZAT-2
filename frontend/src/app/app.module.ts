import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { PaymentWidgetComponent } from './payment-widget/payment-widget.component';

@NgModule({
  imports: [
    BrowserModule,
    PaymentWidgetComponent // Standalone component imported here
  ],
  bootstrap: []
})
export class AppModule {}
