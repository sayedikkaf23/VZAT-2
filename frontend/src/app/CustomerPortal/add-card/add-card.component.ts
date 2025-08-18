import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { AddCardService, PrepareRegistrationResponse } from '../../services/add-card.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-card',
  standalone: true,
  imports: [NgIf, NgFor, CommonModule],
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
    // Get customer email from localStorage
    this.loadCustomerData();
    
    // Check if this is a callback from AFS
    this.route.queryParams.subscribe(params => {
      const resourcePath = params['resourcePath'];
      if (resourcePath) {
        this.handleAfsCallback(resourcePath);
      } else {
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
      this.loading = false;
      return;
    }

    console.log('🔄 Initializing card registration for:', this.customerEmail);

    this.addCardService.prepareCardRegistration(this.customerEmail).subscribe({
      next: (response: PrepareRegistrationResponse) => {
        console.log('✅ Registration preparation successful:', response);
        
        this.checkoutId = response.checkoutId;
        this.loadAfsWidget(response.afsConfig.scriptUrl);
      },
      error: (error) => {
        console.error('❌ Error preparing registration:', error);
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
            this.initializeForm();
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
        
        if (typeof (window as any).wpwl !***REMOVED*** 'undefined') {
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
   * Initialize the registration form
   */
  private initializeForm(): void {
    // Wait for Angular to render the form element
    setTimeout(() => {
      console.log('🔍 Looking for payment form element...');
      const formElement = document.querySelector('.paymentWidgets') as HTMLFormElement;
      
      if (!formElement) {
        console.error('❌ Payment form element (.paymentWidgets) not found in DOM');
        console.log('📋 Available elements with class "paymentWidgets":', document.querySelectorAll('.paymentWidgets'));
        console.log('📋 All form elements:', document.querySelectorAll('form'));
        this.errorMessage = 'Payment form failed to load. Please refresh the page.';
        this.loading = false;
        return;
      }

      console.log('✅ Payment form element found:', formElement);
      
      // Set the action URL for the form (callback URL)
      const shopperResultUrl = `${window.location.origin}/saved-card/add-card`;
      formElement.action = shopperResultUrl;
      
      // Check if AFS widgets are being rendered
      console.log('🔍 Checking AFS widget rendering...');
      console.log('📋 Form innerHTML before AFS:', formElement.innerHTML);
      
      // Wait a bit more for AFS to render the widgets
      setTimeout(() => {
        console.log('📋 Form innerHTML after AFS rendering:', formElement.innerHTML);
        
        if (formElement.innerHTML.trim() ***REMOVED***= '') {
          console.warn('⚠️ AFS widgets not rendered yet, trying manual trigger...');
          // Try to manually trigger widget rendering if available
          if (typeof (window as any).wpwl !***REMOVED*** 'undefined' && (window as any).wpwl.render) {
            (window as any).wpwl.render();
            console.log('🔄 Manually triggered AFS widget rendering');
          }
        }
      }, 1000);
      
      console.log('✅ Form action set to:', shopperResultUrl);
      
      // Set form ready state
      this.isFormReady = true;
      this.loading = false;
      console.log('✅ Card registration form ready');
      
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
    }, 500); // Increased timeout to ensure DOM is ready
  }

  /**
   * Handle callback from AFS after card registration
   */
  private handleAfsCallback(resourcePath: string): void {
    console.log('🔄 Handling AFS callback with resourcePath:', resourcePath);
    
    // Extract checkout ID from resource path
    const checkoutIdMatch = resourcePath.match(/\/checkouts\/([^\/]+)\/registration/);
    if (!checkoutIdMatch) {
      this.errorMessage = 'Invalid callback from payment provider.';
      this.loading = false;
      return;
    }

    const callbackCheckoutId = checkoutIdMatch[1];
    this.processingRegistration = true;

    this.addCardService.handleRegistrationCallback(callbackCheckoutId, this.customerEmail).subscribe({
      next: (response) => {
        console.log('✅ Registration callback handled successfully:', response);
        
        if (response.success) {
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigate(['/saved-card']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Card registration failed.';
        }
        
        this.processingRegistration = false;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error handling registration callback:', error);
        this.errorMessage = 'Failed to complete card registration. Please try again.';
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
