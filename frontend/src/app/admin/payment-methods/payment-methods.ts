import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { PaymentMethodsService } from '../../services/payment-methods.service';

@Component({
  selector: 'app-payment-methods',
  imports: [FormsModule,CommonModule],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss'
})
export class PaymentMethods {
  paymentMethods: any = [];
  page: number = 1;
  total_page: number =1;
  total_pages: number[] = [];
  pageLimit: any;
  searchTerm: any = '';

  constructor(private paymentMethodsService: PaymentMethodsService) {}

  ngOnInit(): void {
    this.page = 1;
    this.getPaymentMethods(this.page);
  }

  getPaymentMethods(page: any) {
    this.page = page;
    this.paymentMethodsService.getPaymentMethods(this.page, this.pageLimit).subscribe({
      next: (res: any) => {
        this.paymentMethods = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x: any, i: number) => i)
          .map((x: any, i: number) => i + 1);
      },
      error: () => {
        this.paymentMethods = [];
      },
      complete: () => {},
    });
  }

  onPaymentMethodStatusChange(payment: any, methodType: string) {
    if (payment?._id) {
      const updateObject = { [methodType]: payment[methodType] };
      this.paymentMethodsService
        .updatePaymentMethodStatus(payment._id, updateObject)
        .subscribe({
          next: () => {},
          error: (err:any) => {console.log(err)},
          complete: () => {},
        });
    }
  }

}
