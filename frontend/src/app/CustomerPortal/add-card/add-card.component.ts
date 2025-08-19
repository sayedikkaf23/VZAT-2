import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';
import { AddCardService, PrepareRegistrationResponse } from '../../services/add-card.service';
import { environment } from '../../../environments/environment';

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

  constructor(
    private addCardService: AddCardService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 AddCardComponent initialized');
    console.log('🌐 Current URL:', window.location.href);
    console.log('📋 Query params:', this.route.snapshot.queryParams);
    
    // Get customer email from localStorage
    this.loadCustomerData();
    
    // Check if this is a callback from AFS
    this.route.queryParams.subscribe(params => {
      console.log('📋 Route params changed:', params);
      
      // AFS sends different parameters depending on the type of integration
      const resourcePath = params['resourcePath'];
      const checkoutId = params['id']; // AFS sometimes uses 'id' parameter
      const afsCheckoutId = params['checkoutId']; // Alternative parameter name
      const resultCode = params['resultCode'];
      
      // Check for any AFS callback parameters
      if (resourcePath || checkoutId || afsCheckoutId || resultCode) {
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
   * Initialize card registration process
   */
  private initializeCardRegistration(): void {
    if (!this.customerEmail) {
      console.error('❌ No customer email found');
      this.errorMessage = 'Customer email not found. Please log in again.';
      this.loading = false;
      return;
    }

    console.log('🔄 Initializing card registration for:', this.customerEmail);
    console.log('🌐 Current URL:', window.location.href);
    console.log('🏠 Origin:', window.location.origin);

    this.addCardService.prepareCardRegistration(this.customerEmail).subscribe({
      next: (response: PrepareRegistrationResponse) => {
        console.log('✅ Registration preparation successful:', response);
        console.log('🔑 Checkout ID received:', response.checkoutId);
        console.log('📋 AFS Config:', response.afsConfig);
        
        this.checkoutId = response.checkoutId;
        this.loading = false; // Stop loading state so form can render
        
        // Use ChangeDetectorRef to ensure change detection completes
        this.cdr.detectChanges();
        
        // Give Angular time to render the form template now that checkoutId is set
        setTimeout(() => {
          console.log('⏰ Loading AFS widget after timeout');
          this.loadAfsWidget(response.afsConfig.scriptUrl);
        }, 200); // Increased timeout
      },
      error: (error) => {
        console.error('❌ Error preparing registration:', error);
        console.error('📋 Error details:', error.error);
        this.errorMessage = 'Failed to initialize card registration. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Load AFS widget script and initialize form
   */
  private loadAfsWidget(scriptUrl: string): void {
    this.addCardService.loadAfsScript(scriptUrl)
      .then(() => {
        // Wait for script to be fully loaded and AFS library to be available
        this.waitForAfsLibrary()
          .then(() => {
            // Additional wait to ensure DOM is fully rendered
            setTimeout(() => {
              this.initializeForm();
            }, 300);
          })
          .catch((error) => {
            console.error('❌ AFS library not available after loading:', error);
            this.errorMessage = 'Payment form library not available. Please try again.';
            this.loading = false;
          });
      })
      .catch((error) => {
        console.error('❌ Error loading AFS script:', error);
        this.errorMessage = 'Failed to load payment form. Please try again.';
        this.loading = false;
      });
  }

  /**
   * Wait for AFS library to be available
   */
  private waitForAfsLibrary(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds total (500ms * 20)
      
      const checkLibrary = () => {
        attempts++;
        
        if (typeof (window as any).wpwl !== 'undefined') {
          console.log('✅ AFS library detected after', attempts, 'attempts');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('❌ AFS library not available after', maxAttempts, 'attempts');
          reject(new Error('AFS library timeout'));
        } else {
          console.log('🔄 Waiting for AFS library... attempt', attempts);
          setTimeout(checkLibrary, 500);
        }
      };
      
      checkLibrary();
    });
  }

  /**
   * Check if all conditions are met for form rendering
   */
  private canRenderForm(): boolean {
    const conditions = {
      hasCheckoutId: !!this.checkoutId,
      notLoading: !this.loading,
      noErrorMessage: !this.errorMessage,
      noSuccessMessage: !this.successMessage
    };
    
    console.log('📋 Form render conditions:', conditions);
    return Object.values(conditions).every(condition => condition);
  }

  /**
   * Initialize the registration form
   */
  private initializeForm(): void {
    console.log('🔄 Initializing form...');
    
    // Check if all conditions are met for form rendering
    if (!this.canRenderForm()) {
      console.log('⚠️ Form render conditions not met, waiting...');
      setTimeout(() => this.initializeForm(), 500);
      return;
    }
    
    // Trigger change detection to ensure DOM is up to date
    this.cdr.detectChanges();
    
    const formElement = document.querySelector('.paymentWidgets') as HTMLFormElement;
    
    if (!formElement) {
      console.error('❌ Payment form element (.paymentWidgets) not found in DOM');
      console.log('📋 Available elements with class "paymentWidgets":', document.querySelectorAll('.paymentWidgets'));
      console.log('📋 All form elements:', document.querySelectorAll('form'));
      
      const containerElement = document.querySelector('.card-registration-container');
      console.log('📋 Container element content:', containerElement?.innerHTML || 'No container');
      console.log('📋 CheckoutId exists:', !!this.checkoutId);
      console.log('📋 Error message:', this.errorMessage);
      console.log('📋 Success message:', this.successMessage);
      console.log('📋 Loading state:', this.loading);
      
      // Force template re-render and retry
      this.errorMessage = '';
      this.successMessage = '';
      
      // Ensure loading is false so form can render
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
      
      setTimeout(() => {
        const retryFormElement = document.querySelector('.paymentWidgets') as HTMLFormElement;
        if (retryFormElement) {
          console.log('✅ Form element found on retry');
          this.finalizeFormSetup(retryFormElement);
        } else {
          console.error('❌ Form element still not found after retry');
          this.errorMessage = 'Payment form failed to load. Please refresh the page.';
        }
      }, 1000);
      return;
    }

    this.finalizeFormSetup(formElement);
  }

  private finalizeFormSetup(formElement: HTMLFormElement): void {

    console.log('✅ Payment form element found:', formElement);
    
    // Set the action URL for the form (callback URL)
    // For standalone registration, this should be the frontend URL where AFS will redirect
    // AFS will append ?resourcePath=/v1/checkouts/{id}/registration to this URL
    const shopperResultUrl = window.location.origin + '/customer-portal/add-card';
    formElement.action = shopperResultUrl;
    
    console.log('✅ Form action set to:', shopperResultUrl);
    console.log('📋 Current origin:', window.location.origin);
    console.log('📋 Full form action URL:', formElement.action);
    
    // AFS should automatically render the payment widgets now
    this.isFormReady = true;
    this.loading = false;
    console.log('✅ Card registration form ready');
    
    // Check if widgets rendered after a delay
    setTimeout(() => {
      const widgetElements = document.querySelectorAll('.wpwl-form, .wpwl-container, input[data-brands]');
      console.log('🔍 AFS widget elements found:', widgetElements.length);
      if (widgetElements.length === 0) {
        console.warn('⚠️ AFS widgets may not have rendered. Form content:', formElement.innerHTML);
        // Try manual rendering if available
        if (typeof (window as any).wpwl !== 'undefined' && (window as any).wpwl.render) {
          (window as any).wpwl.render();
          console.log('🔄 Manually triggered AFS widget rendering');
        }
      } else {
        console.log('✅ AFS widgets successfully rendered');
        
        // Log form details for debugging
        console.log('📋 Form details:');
        console.log('  Action:', formElement.action);
        console.log('  Method:', formElement.method);
        console.log('  Data-brands:', formElement.getAttribute('data-brands'));
        console.log('  Class:', formElement.className);
      }
    }, 2000);
    
    // Force change detection
    this.cdr.detectChanges();
  }

  /**
   * Handle callback from AFS after card registration
   */
  private handleAfsCallback(resourcePath: string): void {
    console.log('🔄 Handling AFS callback with resourcePath:', resourcePath);
    console.log('🌐 Full URL:', window.location.href);
    console.log('📋 Query params:', this.route.snapshot.queryParams);
    
    // Check for error in URL params first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
      console.error('❌ Error in callback URL:', urlParams.get('error'));
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
    console.log('🔑 Extracted checkout ID from callback:', callbackCheckoutId);
    
    this.processingRegistration = true;

    this.addCardService.handleRegistrationCallback(callbackCheckoutId, this.customerEmail).subscribe({
      next: (response) => {
        console.log('✅ Registration callback handled successfully:', response);
        console.log('📋 Response details:', JSON.stringify(response, null, 2));
        
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
}
