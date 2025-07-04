import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-payment-methods',
  imports: [FormsModule,CommonModule],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss'
})
export class PaymentMethods {
  paymentMethods = [
    { name: 'Bank Transfer', enabled: true },
    { name: 'Card Machine', enabled: true },
    { name: 'Cash Deposit', enabled: true },
    { name: 'Cash Over Counter', enabled: true },
    { name: 'Cheque Deposit', enabled: true },
    { name: 'Online Payment', enabled: true },
    { name: 'PDC Cheque', enabled: true },
  ];

 
}
