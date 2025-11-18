import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OnlinePaymentService } from '../services/online-payment.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  piData: any;
  sidebarData: any;
  orderId: string = '';

  constructor(
    private onlinePaymentService: OnlinePaymentService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.orderId = params['id'];
      console.log('Order ID:', this.orderId);
      this.fetchPiData(this.orderId);
    });

    this.onlinePaymentService.getSidebarData().subscribe(
      (data: any) => {
        this.sidebarData = data;
      },
      (error: any) => {
        console.error('Error fetching sidebar data:', error);
      }
    );
  }

  fetchPiData(quoteId: string): void {
    this.onlinePaymentService.getPiDataById(quoteId).subscribe(
      response => {
        console.log('Fetched Pi Data:', response);
        this.piData = response;
      },
      error => {
        console.error('Error fetching Pi Data:', error);
      }
    );
  }
}


