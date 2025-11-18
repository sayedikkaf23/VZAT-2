import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnlinePaymentService } from '../services/online-payment.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../services/message.service';

@Component({
  selector: 'app-payment-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-sidebar.component.html',
  styleUrls: ['./payment-sidebar.component.scss']
})
export class PaymentSidebarComponent implements OnInit {
  loading: boolean = true;
  orderData: any;
  piData: any;
  orderId: string = '';
  sidebarData: any;

  constructor(
    private onlinePaymentService: OnlinePaymentService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.orderId = params['id'];
      console.log('Order ID:', this.orderId);
   
      this.loading = true;
      this.fetchPiData(this.orderId);

      this.createSession(this.orderData);

      this.onlinePaymentService.getSidebarData().subscribe(
        (data: any) => {
          this.sidebarData = data;
        },
        (error: any) => {
          console.error('Error fetching sidebar data:', error);
        }
      );
    });
  }

  createSession(orderData: any): void {
    if (orderData) {
      this.onlinePaymentService.createTotalpaySession(orderData).subscribe(
        response => {
          console.log('Totalpay session created:', response);
          if (response.redirect_url) {
            window.open(response.redirect_url, '_blank');
          }
        },
        error => {
          console.error('Error creating Totalpay session:', error);
        }
      );
    } else {
      console.error('Error: orderData is not available.');
    }
  }

  fetchPiData(quoteId: string): void {
    this.onlinePaymentService.getPiDataById(quoteId).subscribe(
      response => {
        console.log('Fetched Pi Data:', response);
        this.piData = response;
        this.loading = false;
        this.messageService.setSidebarLoaded(true);
      },
      error => {
        console.error('Error fetching Pi Data:', error);
        this.loading = false;
        this.messageService.setSidebarLoaded(true);
      }
    );
  }
}


