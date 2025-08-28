import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
export class AddCardComponent implements OnInit, OnDestroy {
  loading = true;
  processingRegistration = false;
  errorMessage = '';
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
  constructor(
    private addCardService: AddCardService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    
    // Get customer email from localStorage
    this.loadCustomerData();
    
    // Check if this is a callback from AFS
    this.route.queryParams.subscribe(params => {
      
      // AFS sends different parameters depending on the type of integration
      const resourcePath = params['resourcePath'];
      const checkoutId = params['id']; // AFS sometimes uses 'id' parameter
      const afsCheckoutId = params['checkoutId']; // Alternative parameter name
      const resultCode = params['resultCode'];
      const paymentStatus = params['status']; // New parameter for payment status
      
      // Check for payment status parameters first
      if (resourcePath && checkoutId && paymentStatus) {
        console.log('🔄 Detected payment status check with parameters:', {
          resourcePath, checkoutId, paymentStatus
        });
        this.checkPaymentStatus(resourcePath, checkoutId, paymentStatus);
      }
      // Check for any AFS callback parameters
      else if (resourcePath || checkoutId || afsCheckoutId || resultCode) {
        console.log('🔄 Detected AFS callback with parameters:', {
          resourcePath, checkoutId, afsCheckoutId, resultCode
        });
        this.handleAfsCallback(resourcePath || checkoutId || afsCheckoutId);
      } else {
        console.log('🔄 No AFS callback parameters found, initializing new card registration');
        this.initializeCardRegistration();
      }
    });
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
        this.loading = false;

        this.afsPaymentLink = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${this.checkoutId}`;
        this.paymentDetails = {
          paymentId: 'card-verification-' + Date.now(),
          amount: 1,
          dueDate: new Date(),
          invoiceNumber: 'CARD-VERIFY-' + Date.now(),
          quotepaymentId: 'card-verify-' + Date.now(),
          checkoutId: response.afs_checkout_id,
          paymentLink:    this.afsPaymentLink
        };
        
        this.isAfsPayment = true;
        this.isLoading = false;
    
        // Force change detection to ensure the form is rendered first
        this.cdr.detectChanges();
        
        // Wait for DOM to be updated, then load the script
        setTimeout(() => {
          console.log('🔗 Loading AFS widget from URL:', response.payment_widget_url);
          this.loadAfsWidgetScript(response.payment_widget_url);
        }, 100);
      },
      error: (err) => {
        console.error('❌ Error preparing card registration with payment:', err);
        this.errorMessage = 'Failed to initialize card registration with payment';
        this.loading = false;
      }
    });
  }

  /**
   * Load AFS widget script similar to payment widget
   */
  private loadAfsWidgetScript(scriptUrl: string): void {
    // Remove existing AFS scripts to avoid conflicts
    const existingScript = document.getElementById('afs-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    const scriptElement = document.createElement('script');
    scriptElement.id = 'afs-widget-script';
    scriptElement.src = scriptUrl;
    scriptElement.async = true;
    
    // Set a timeout for script loading
    const loadingTimeout = setTimeout(() => {
      console.error('AFS script loading timeout after 10 seconds');
      this.handleAfsWidgetFailure();
    }, 10000);
    
    scriptElement.onload = () => {
      clearTimeout(loadingTimeout);
      console.log('✅ AFS widget script loaded successfully');
      
      // Check if the form is ready before setting up the widget
      const widgetContainer = document.querySelector('.paymentWidgets');
      if (widgetContainer) {
        console.log('✅ Form container found, setting up widget...');
        // Wait a moment for the script to be fully executed and DOM to be ready
        setTimeout(() => {
          this.setupAfsRegistrationWidget();
        }, 2000);
      } else {
        console.error('❌ Form container not found after script load');
        this.handleAfsWidgetFailure();
      }
    };
    
    scriptElement.onerror = (error: any) => {
      clearTimeout(loadingTimeout);
      console.error('❌ Failed to load AFS widget script:', error);
      this.handleAfsWidgetFailure();
    };
    
    document.head.appendChild(scriptElement);
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
        if (error.error?.error_code ***REMOVED***= 'REGISTRATION_NOT_COMPLETED' || 
            error.error?.error_code ***REMOVED***= 'USER_CANCELLED_REGISTRATION') {
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
  private checkPaymentStatus(resourcePath: string, checkoutId: string, status: string): void {
    this.processingRegistration = true;
    this.addCardService.checkPaymentStatus(checkoutId, this.customerEmail).subscribe({
      next: (response: any) => {
        console.log('✅ Payment status response:', response);
        if (response.success) {
          this.successMessage = response.message;
          console.log('🎉 Payment status successful! Redirecting to saved cards page...');
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
          console.error('❌ Payment status failed:', response.message);
          this.errorMessage = response.message || 'Failed to check payment status.';
        }
        this.processingRegistration = false;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error checking payment status:', error);
        console.error('📋 Error details:', error.error);
        this.errorMessage = 'Failed to check payment status. Please try again.';
        this.processingRegistration = false;
        this.loading = false;
      }
    });
  }
}
