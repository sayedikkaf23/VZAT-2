import {
  Component, OnInit, OnDestroy, ElementRef, Renderer2, AfterViewInit, ViewEncapsulation,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';
import { AddCardService, PrepareRegistrationResponse } from '../../services/add-card.service';
import { environment } from '../../../environments/environment';
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
  selector: 'app-add-card',
  standalone: true,
  imports: [NgIf, CommonModule],
  templateUrl: './add-card.component.html',
  styleUrls: ['./add-card.component.scss']
})
export class AddCardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('widgetHost', { static: false }) widgetHost!: ElementRef;

  loading = true;
  processingRegistration = false;
  errorMessage = '';
  scriptEl!: HTMLScriptElement;
  integrity = ''; // if you don’t use integrity, leave empty string
  successMessage = '';
  customerEmail = '';
  checkoutId = '';
  isFormReady = false;
  paymentDetails: PaymentDetails | null = null;
  isAfsPayment: boolean = false;
  isLoading: boolean = true;
  // checkoutId = '';
  shopperResultUrl = '';
  afsPaymentLink: string = '';
  shouldInitializeRegistration = false;
 
  constructor(
    private addCardService: AddCardService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private rnd: Renderer2,
    private host: ElementRef<HTMLElement> 
  ) {}

  ngOnInit(): void {
    this.loadCustomerData();
  
    this.route.queryParams.subscribe(params => {
      const resourcePath = params['resourcePath'];
      const checkoutId = params['id'];
      const paymentStatus = params['status']; // optional
  
      if (resourcePath) {
        console.log('🔄 Checking payment status for:', resourcePath);
  
        this.addCardService.checkPaymentStatus(resourcePath, this.customerEmail).subscribe({
          next: (response) => {
            console.log('✅ Payment status response:', response);
        
            // Check response status first
            if (response?.status === 'SUCCESS') {
              // Card was saved successfully
              const savedCard = response?.savedCard;
              if (savedCard) {
                console.log('✅ Card saved successfully:', savedCard);
                this.router.navigate(['/saved-card'], {
                  queryParams: { 
                    id: checkoutId,
                    cardAdded: 'success',
                    cardId: savedCard.id,
                    isDefault: savedCard.isDefault
                  }
                });
              } else {
                this.router.navigate(['/saved-card'], {
                  queryParams: { id: checkoutId }
                });
              }
              return;
            }

            // Fallback: Check payment result codes (any code starting with "000." is success)
            const paymentResult = response?.payment?.result?.code;
            const refundResult = response?.refund?.result?.code;
        
            // Case 1: Both payment and refund succeeded
            if (paymentResult?.startsWith("000.") && (refundResult?.startsWith("000.") || refundResult === undefined)) {
              const savedCard = response?.savedCard;
              if (savedCard) {
                console.log('✅ Card saved successfully:', savedCard);
                this.router.navigate(['/saved-card'], {
                  queryParams: { 
                    id: checkoutId,
                    cardAdded: 'success',
                    cardId: savedCard.id,
                    isDefault: savedCard.isDefault
                  }
                });
              } else {
                this.router.navigate(['/saved-card'], {
                  queryParams: { id: checkoutId }
                });
              }
              return;
            }
        
            // Case 2: Payment succeeded but refund failed
            if (paymentResult?.startsWith("000.") && refundResult && !refundResult?.startsWith("000.")) {
              this.router.navigate(['/payment-failed'], {
                queryParams: { id: checkoutId, reason: response?.refund?.result?.description || 'Refund failed' }
              });
              return;
            }
        
            // Case 3: Payment itself failed
            this.router.navigate(['/payment-failed'], {
              queryParams: { id: checkoutId, reason: response?.payment?.result?.description || 'Payment failed' }
            });
          },
          error: (err) => {
            console.error('❌ Error checking payment status:', err);
            this.router.navigate(['/payment-failed'], {
              queryParams: { id: checkoutId, reason: 'Server error' }
            });
          }
        });
        
      } else {
        console.log('🔄 No AFS callback params, starting fresh checkout');
        // Store the initialization flag to run after view init
        this.shouldInitializeRegistration = true;
      }
    });
  }

  ngAfterViewInit(): void {
    // Check if we need to initialize registration after view is ready
    if (this.shouldInitializeRegistration) {
      this.initializeCardRegistration();
    }
  }
  

  ngOnDestroy(): void {
    // Clean up AFS script when component is destroyed
    const script = document.getElementById('afs-widget-script');
    if (script) {
      script.remove();
    }
  }



  /**
   * Load customer data from localStorage
   */
  private loadCustomerData(): void {
    const customerDataStr = localStorage.getItem('customerData');
    if (!customerDataStr) {
      this.errorMessage = 'Customer session not found. Please log in again.';
      this.loading = false;
      return;
    }

    try {
      const customerData = JSON.parse(customerDataStr);
      this.customerEmail = customerData.email;
      
      if (!this.customerEmail) {
        this.errorMessage = 'Customer email not found. Please log in again.';
        this.loading = false;
        return;
      }
    } catch (error) {
      this.errorMessage = 'Invalid customer session. Please log in again.';
      this.loading = false;
    }
  }

  /**
   * Initialize card registration process with payment
   */
  private initializeCardRegistration(): void {
    if (!this.customerEmail) {
      this.errorMessage = 'Customer email not found. Please log in again.';
      return;
    }

    // Use payment approach instead of registration only
    this.addCardService.prepareCardRegistrationWithPayment(this.customerEmail, 1.00).subscribe({
      next: (response: PrepareRegistrationResponse) => {
        console.log('✅ Card registration with payment response:', response);
    
        this.checkoutId = response.afs_checkout_id;
        this.shopperResultUrl = response.shopper_result_url;
        this.integrity = response.checkoutResult?.integrity || '';
        console.log(this.integrity,'integrity',response.checkoutResult?.integrity)
        this.loading = false;

        // this.afsPaymentLink = `https://eu-prod.oppwa.com/v1/paymentWidgets.js?checkoutId=${this.checkoutId}`;
        // this.paymentDetails = {
        //   paymentId: 'card-verification-' + Date.now(),
        //   amount: 1,
        //   dueDate: new Date(),
        //   invoiceNumber: 'CARD-VERIFY-' + Date.now(),
        //   quotepaymentId: 'card-verify-' + Date.now(),
        //   checkoutId: response.afs_checkout_id,
        //   paymentLink:   response.payment_widget_url
        // };
        
        this.isAfsPayment = true;
        this.isLoading = false;
    
        // Force change detection to ensure the form is rendered first
        this.cdr.detectChanges();
        
        // Wait for DOM to be updated, then load the script
        setTimeout(() => {
          console.log('🔗 Loading AFS widget from URL:', response.payment_widget_url);
          this.injectScript(response.payment_widget_url);
        }, 100);
      },
      error: (err) => {
        console.error('❌ Error preparing card registration with payment:', err);
        this.errorMessage = 'Failed to initialize card registration with payment';
        this.loading = false;
      }
    });
  }


  
  injectScript(link:string) {
    // Wait for the view to be ready
    if (!this.widgetHost || !this.widgetHost.nativeElement) {
      console.log('🔄 Waiting for widgetHost to be available...');
      setTimeout(() => {
        this.injectScript(link);
      }, 100);
      return;
    }

    /* 1. <script src="…paymentWidgets.js?checkoutId"> */
    this.scriptEl = this.rnd.createElement('script');
    this.scriptEl.src = link;
    this.scriptEl.setAttribute('integrity', this.integrity);
    this.scriptEl.setAttribute('crossorigin', 'anonymous');

    /* 2. <form action="…" class="paymentWidgets" data-brands="VISA MASTER"> */
    const formEl = this.rnd.createElement('form');
    formEl.action = `https://installment.virtuzone.com/saved-card/add-card`;   // shopperResultUrl
    formEl.className = 'paymentWidgets';
    formEl.setAttribute('data-brands', 'VISA MASTER'); // only allowed brands
         // only show card brands you need

    /* 3. Append both to the DOM */
    console.log('✅ widgetHost found, appending script and form');
    this.widgetHost.nativeElement.appendChild(this.scriptEl);
    this.widgetHost.nativeElement.appendChild(formEl);

    this.loading = false;
  }


  /**
   * Setup AFS registration widget
   */
  private setupAfsRegistrationWidget(): void {
    // Wait for the AFS script to be fully loaded and DOM to be available
    setTimeout(() => {
      if (!this.checkoutId) {
        console.error('❌ Checkout ID is missing, cannot setup widget');
        this.handleAfsWidgetFailure();
        return;
      }

      const widgetContainer = document.querySelector('.paymentWidgets');

      if (widgetContainer) {
        console.log('✅ AFS registration widget container found');
        console.log('✅ AFS registration widget configured with checkout ID:', this.checkoutId);
        
        // Check if the AFS library is available
        if ((window as any).wpwlOptions || (window as any).wpwl) {
          console.log('✅ AFS library detected, widget should auto-initialize');
          
          // Wait for form fields to appear - AFS should auto-initialize
          setTimeout(() => {
            const formFields = widgetContainer.querySelectorAll('input, select, iframe');
            if (formFields.length > 0) {
              console.log('✅ AFS registration widget initialized successfully:', formFields.length, 'form elements');
              this.isFormReady = true;
              this.loading = false;
              this.cdr.detectChanges();
            } else {
              // Try to manually trigger AFS widget creation if available
              if ((window as any).wpwl && (window as any).wpwl.render) {
                console.log('🔄 Attempting manual AFS widget render...');
                try {
                  (window as any).wpwl.render();
                  
                  // Check again after manual render
                  setTimeout(() => {
                    const manualFields = widgetContainer.querySelectorAll('input, select, iframe');
                    if (manualFields.length > 0) {
                      console.log('✅ AFS registration widget initialized successfully after manual render:', manualFields.length, 'form elements');
                      this.isFormReady = true;
                      this.loading = false;
                      this.cdr.detectChanges();
                    } else {
                      this.handleAfsWidgetFailure();
                    }
                  }, 2000);
                } catch (error) {
                  console.error('❌ Manual AFS widget render failed:', error);
                  this.handleAfsWidgetFailure();
                }
              } else {
                this.handleAfsWidgetFailure();
              }
            }
          }, 2000);
        } else {
          console.log('🔄 AFS library loading...');
          this.handleAfsWidgetFailure();
        }
      } else {
        console.error('❌ Payment widget container (.paymentWidgets) not found in DOM');
        this.handleAfsWidgetFailure();
      }
    }, 1000);
  }

  /**
   * Handle AFS widget failure
   */
  private handleAfsWidgetFailure(): void {
    console.error('❌ AFS widget failed to load or initialize');
    this.errorMessage = 'Failed to load payment widget. Please try again.';
    this.loading = false;
    this.isFormReady = false;
  }

  /**
   * Handle callback from AFS after card registration
   */
  private handleAfsCallback(resourcePath: string): void {
    // Check for error in URL params first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
      this.errorMessage = `Payment error: ${urlParams.get('error')}`;
      this.loading = false;
      return;
    }
    
    // Extract checkout ID from resource path - handle both /registration and /payment endpoints
    let checkoutIdMatch = resourcePath.match(/\/checkouts\/([^\/]+)\/registration/);
    if (!checkoutIdMatch) {
      // Try with /payment endpoint
      checkoutIdMatch = resourcePath.match(/\/checkouts\/([^\/]+)\/payment/);
    }
    if (!checkoutIdMatch) {
      // Try with just checkout ID (no endpoint suffix)
      checkoutIdMatch = resourcePath.match(/\/checkouts\/([^\/]+)$/);
    }
    
    if (!checkoutIdMatch) {
      console.error('❌ Could not extract checkout ID from resourcePath:', resourcePath);
      this.errorMessage = 'Invalid callback from payment provider. Please try again.';
      this.loading = false;
      return;
    }

    const callbackCheckoutId = checkoutIdMatch[1];
    
    this.processingRegistration = true;

    this.addCardService.handlePaymentCallback(callbackCheckoutId, this.customerEmail).subscribe({
      next: (response) => {
        
        if (response.success) {
          this.successMessage = response.message;
          console.log('🎉 Card registration successful! Redirecting to saved cards page...');
          
          // Show success message for 2 seconds then redirect
          setTimeout(() => {
            console.log('🔄 Navigating to saved cards page');
            this.router.navigate(['/saved-card']).then(
              (navigated: boolean) => {
                if (navigated) {
                  console.log('✅ Successfully navigated to saved cards page');
                } else {
                  console.error('❌ Navigation to saved cards page failed');
                }
              }
            ).catch(navError => {
              console.error('❌ Navigation error:', navError);
            });
          }, 2000);
        } else {
          console.error('❌ Card registration failed:', response.message);
          this.errorMessage = response.message || 'Card registration failed.';
        }
        
        this.processingRegistration = false;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error handling registration callback:', error);
        console.error('📋 Error details:', error.error);
        
        // Handle specific error cases
        if (error.error?.error_code === 'REGISTRATION_NOT_COMPLETED' || 
            error.error?.error_code === 'USER_CANCELLED_REGISTRATION') {
          this.errorMessage = 'Card registration was not completed. Please click "Try Again" to restart the process.';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Failed to complete card registration. Please try again.';
        }
        
        this.processingRegistration = false;
        this.loading = false;
      }
    });
  }

  /**
   * Cancel and go back to saved cards
   */
  cancelAddCard(): void {
    this.router.navigate(['/saved-card']);
  }

  /**
   * Retry the registration process
   */
  retryRegistration(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;
    this.isFormReady = false;
    this.initializeCardRegistration();
  }

  /**
   * Check if running in test environment
   */
  isTestEnvironment(): boolean {
    return !environment.production || window.location.hostname.includes('localhost');
  }

  /**
   * Check payment status of a checkout
   */

}
