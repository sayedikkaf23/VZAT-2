import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface PaymentDetails {
  paymentId: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  quotepaymentId: string;
  checkoutId?: string;
  paymentLink?: string;
}

@Component({
  selector: 'app-payment-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-widget.component.html',
  styleUrls: ['./payment-widget.component.scss']
})
export class PaymentWidgetComponent implements OnInit, OnDestroy {
  @Input() paymentLink: string = '';
  
  paymentDetails: PaymentDetails | null = null;
  private scriptElement: HTMLScriptElement | null = null;
  isLoading: boolean = true;
  isAfsPayment: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get payment details from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['paymentId']) {
        this.paymentDetails = {
          paymentId: params['paymentId'],
          amount: parseFloat(params['amount']) || 0,
          dueDate: new Date(params['dueDate']),
          invoiceNumber: params['invoiceNumber'] || '',
          quotepaymentId: params['quotepaymentId'] || '',
          checkoutId: params['checkoutId'],
          paymentLink: params['paymentLink']
        };
        
        console.log('Payment details received:', this.paymentDetails);
        
        // Check if this is an AFS payment
        this.isAfsPayment = !!(this.paymentDetails.checkoutId && this.paymentDetails.paymentLink);
        
        if (this.isAfsPayment) {
          this.initializeAfsPaymentGateway();
        } else {
          this.initializeManualPaymentGateway();
        }
      } else {
        console.error('No payment details provided');
        this.router.navigate(['/paymentSchedule']);
      }
    });

    if (this.paymentLink && !this.paymentDetails?.paymentLink) {
      this.paymentDetails = {
        ...this.paymentDetails!,
        paymentLink: this.paymentLink
      };
      this.initializeAfsPaymentGateway();
    }
  }

  private initializeAfsPaymentGateway(): void {
    this.isLoading = true;
    
    // Load the AFS payment widget script
    if (this.paymentDetails?.paymentLink) {
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = this.paymentDetails.paymentLink;
      this.scriptElement.async = true;
      
      this.scriptElement.onload = () => {
        console.log('AFS Payment widget loaded successfully');
        this.isLoading = false;
        this.setupAfsPaymentWidget();
      };
      
      this.scriptElement.onerror = () => {
        console.error('Failed to load AFS payment widget');
        this.isLoading = false;
        this.isAfsPayment = false; // Fallback to manual payment
      };
      
      document.head.appendChild(this.scriptElement);
    } else {
      this.isLoading = false;
      this.isAfsPayment = false;
    }
  }

  private setupAfsPaymentWidget(): void {
    // This will be replaced by the actual AFS widget implementation
    // The AFS script will automatically create the payment form
    console.log('Setting up AFS payment widget...');
    
    // Add AFS widget container if it doesn't exist
    setTimeout(() => {
      const widgetContainer = document.querySelector('.paymentWidgets');
      if (widgetContainer && this.paymentDetails?.checkoutId) {
        // The AFS script should automatically populate this container
        // with the payment form based on the checkout ID
        console.log('AFS widget container ready');
      }
    }, 1000);
  }

  private initializeManualPaymentGateway(): void {
    // Simulate manual payment gateway initialization
    setTimeout(() => {
      this.isLoading = false;
      console.log('Manual payment gateway initialized');
    }, 1000);
  }

  onPaymentSuccess(): void {
    console.log('Payment successful');
    
    // Redirect to the shopper result URL if available
    if (this.paymentDetails?.checkoutId) {
      // Use the actual result URL pattern from your API
      const resultUrl = `https://vzatnew.yeepeey.com/payment-result?id=${this.paymentDetails.checkoutId}&quotepaymentId=${this.paymentDetails.quotepaymentId}`;
      window.location.href = resultUrl;
    } else {
      // Fallback to local result page
      this.router.navigate(['/payment/result'], {
        queryParams: {
          status: 'success',
          paymentId: this.paymentDetails?.paymentId,
          amount: this.paymentDetails?.amount,
          quotepaymentId: this.paymentDetails?.quotepaymentId
        }
      });
    }
  }

  onPaymentFailure(): void {
    console.log('Payment failed');
    this.router.navigate(['/payment/result'], {
      queryParams: {
        status: 'failure',
        paymentId: this.paymentDetails?.paymentId,
        quotepaymentId: this.paymentDetails?.quotepaymentId
      }
    });
  }

  onPaymentCancel(): void {
    console.log('Payment cancelled');
    // Return to payment schedule
    if (this.paymentDetails?.quotepaymentId) {
      this.router.navigate(['/paymentSchedule', this.paymentDetails.quotepaymentId]);
    } else {
      this.router.navigate(['/paymentSchedule']);
    }
  }

  ngOnDestroy(): void {
    if (this.scriptElement) {
      document.head.removeChild(this.scriptElement);
    }
  }
}
