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
    console.log('PaymentWidgetComponent initialized');
    console.log('Input paymentLink:', this.paymentLink);
    
    // Get payment details from query parameters
    this.route.queryParams.subscribe(params => {
      console.log('Query parameters received:', params);
      
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
        
        console.log('Payment details parsed:', this.paymentDetails);
        
        // Check if this is an AFS payment
        this.isAfsPayment = !!(this.paymentDetails.checkoutId && this.paymentDetails.paymentLink);
        console.log('Is AFS payment:', this.isAfsPayment);
        console.log('CheckoutId present:', !!this.paymentDetails.checkoutId);
        console.log('PaymentLink present:', !!this.paymentDetails.paymentLink);
        console.log('CheckoutId value:', this.paymentDetails.checkoutId);
        console.log('PaymentLink value:', this.paymentDetails.paymentLink);
        
        if (this.isAfsPayment) {
          this.initializeAfsPaymentGateway();
        } else {
          console.log('Falling back to manual payment gateway');
          this.initializeManualPaymentGateway();
        }
      } else {
        console.error('No payment details provided in query parameters');
        this.router.navigate(['/paymentSchedule']);
      }
    });

    if (this.paymentLink && !this.paymentDetails?.paymentLink) {
      console.log('Using direct paymentLink input');
      this.paymentDetails = {
        ...this.paymentDetails!,
        paymentLink: this.paymentLink
      };
      this.initializeAfsPaymentGateway();
    }
  }

  private initializeAfsPaymentGateway(): void {
    this.isLoading = true;
    console.log('Initializing AFS payment gateway...');
    
    // Load the AFS payment widget script
    if (this.paymentDetails?.paymentLink) {
      console.log('Loading AFS script from:', this.paymentDetails.paymentLink);
      
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = this.paymentDetails.paymentLink;
      this.scriptElement.async = true;
      
      // Set a timeout for script loading
      const loadingTimeout = setTimeout(() => {
        console.error('AFS script loading timeout after 10 seconds');
        this.handleAfsWidgetFailure();
      }, 10000);
      
      this.scriptElement.onload = () => {
        clearTimeout(loadingTimeout);
        console.log('AFS Payment widget script loaded successfully');
        
        // Wait a moment for the script to be fully executed
        setTimeout(() => {
          this.setupAfsPaymentWidget();
        }, 1000);
      };
      
      this.scriptElement.onerror = (error: any) => {
        clearTimeout(loadingTimeout);
        console.error('Failed to load AFS payment widget script:', error);
        this.handleAfsWidgetFailure();
      };
      
      document.head.appendChild(this.scriptElement);
    } else {
      console.error('No payment link provided for AFS gateway');
      this.isLoading = false;
      this.isAfsPayment = false;
    }
  }

  private setupAfsPaymentWidget(): void {
    console.log('Setting up AFS payment widget...');
    console.log('Current payment details:', this.paymentDetails);
    console.log('Checkout ID:', this.paymentDetails?.checkoutId);
    console.log('Is AFS payment:', this.isAfsPayment);
    
    // Wait for the AFS script to be fully loaded and available
    setTimeout(() => {
      const widgetContainer = document.querySelector('.paymentWidgets');
      console.log('Widget container found:', !!widgetContainer);
      console.log('Container element:', widgetContainer);
      
      if (widgetContainer && this.paymentDetails?.checkoutId) {
        // Ensure the container has the required attributes for AFS
        widgetContainer.setAttribute('data-checkout-id', this.paymentDetails.checkoutId);
        widgetContainer.setAttribute('data-brands', 'VISA MASTER AMEX');
        
        console.log('AFS widget container configured with checkout ID:', this.paymentDetails.checkoutId);
        console.log('Container attributes set:', {
          'data-checkout-id': widgetContainer.getAttribute('data-checkout-id'),
          'data-brands': widgetContainer.getAttribute('data-brands')
        });
        
        // Check if the AFS library is available and trigger widget creation
        if ((window as any).wpwlOptions || (window as any).wpwl) {
          console.log('AFS library detected, widget should auto-initialize');
        } else {
          console.log('AFS library loading...');
        }
        
        // Wait a bit longer before checking for form fields, and only stop loading after forms appear
        setTimeout(() => {
          const formFields = widgetContainer.querySelectorAll('input, select, iframe');
          if (formFields.length > 0) {
            console.log('AFS widget form fields detected:', formFields.length);
            this.isLoading = false; // Stop loading when fields appear
          } else {
            console.warn('AFS widget form fields not found after 2 seconds, checking if widget is still loading...');
            
            // Give it more time, sometimes AFS widgets load slowly
            setTimeout(() => {
              const laterFields = widgetContainer.querySelectorAll('input, select, iframe');
              if (laterFields.length ***REMOVED***= 0) {
                console.error('AFS widget failed to initialize after 5 seconds');
                this.handleAfsWidgetFailure();
              } else {
                console.log('AFS widget initialized successfully (late detection):', laterFields.length, 'form elements');
                this.isLoading = false; // Stop loading when fields appear
              }
            }, 3000);
          }
        }, 2000);
      } else {
        console.error('AFS widget container not found or missing checkout ID');
        console.error('Widget container found:', !!widgetContainer);
        console.error('Checkout ID available:', !!this.paymentDetails?.checkoutId);
        console.error('Payment details:', this.paymentDetails);
        
        if (!widgetContainer) {
          console.error('Cannot find element with class .paymentWidgets');
          // Let's check if the element exists in the DOM at all
          const allForms = document.querySelectorAll('form');
          console.error('All forms in DOM:', allForms);
          const paymentContainers = document.querySelectorAll('.afs-payment-container, .payment-gateway-section');
          console.error('Payment containers found:', paymentContainers);
        }
        
        if (!this.paymentDetails?.checkoutId) {
          console.error('Checkout ID is missing from payment details');
        }
        
        this.handleAfsWidgetFailure();
      }
    }, 500);
  }
  
  private handleAfsWidgetFailure(): void {
    console.warn('AFS widget failed to initialize, falling back to manual payment');
    this.isAfsPayment = false;
    this.isLoading = false;
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
