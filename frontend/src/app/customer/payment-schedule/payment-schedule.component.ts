import { Component, AfterViewInit, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { SalesForceService } from '../../services/salesforce.service';
import { PaymentScheduleService, VzatRecurringData } from '../../services/payment-schedule.service';
import { SubscriptionCardService, PaymentMethod, CardChangeHistory } from '../../services/subscription-card.service';
import { SalesAgentSidebarComponent } from '../../shared/components/sales-agent-sidebar/sales-agent-sidebar.component';

interface PaymentScheduleItem {
  id: string;
  dueDate: Date;
  amount: number;
  status: 'completed' | 'due' | 'pending';
  isNextPayment: boolean;
}

interface CustomerData {
  name: string;
  invoiceNumber: string;
  totalAmount: number;
}

interface SalesAgent {
  name: string;
  position: string;
  faxNumber: string;
  phoneNumber: string;
  email: string;
  mobNo1?: string;
  mobNo2?: string;
  token?: number;
}

interface ApiResponseData {
  OpportunityId: string;
  quotepaymentId: string;
  QuoteId: string;
  quote_payment_number?: string;
  Customer_name?: string;
  opp_owner?: string;
  opp_email?: string;
  opp_number?: string;
  opp_title?: string;
  opp_phone?: string;
  opp_mobile?: string;
  TotalPrice: number;
  Total_After_VAT_Currency: number;
  InstallmentType: string;
  Status: string;
  CreatedDate: string;
}

@Component({
  selector: 'app-payment-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SalesAgentSidebarComponent],
  templateUrl: './payment-schedule.component.html',
  styleUrls: [
    './payment-schedule.component.scss',
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/payment-schedual.css'
  ]
})
export class PaymentScheduleComponent implements OnInit, AfterViewInit {

  // Customer data - will be populated from API
  customerData: CustomerData = {
    name: "Loading...",
    invoiceNumber: "Loading...",
    totalAmount: 0
  };

  // Sales agent data - will be populated from API
  salesAgent: SalesAgent = {
    name: "Loading...",
    position: "Loading...",
    faxNumber: "Loading...",
    phoneNumber: "Loading...",
    email: "Loading..."
  };

  // API response data
  apiData: ApiResponseData | null = null;

  // Payment schedule - will be populated from API
  paymentSchedule: PaymentScheduleItem[] = [];

  // UI state
  agreementAccepted: boolean = false;
  selectedPayment: PaymentScheduleItem | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  
  // API data
  currentCheckoutId: string = '';
  quotepaymentId: string = '';
  afsPaymentLink: string = '';
  
  // Card management properties
  paymentMethods: PaymentMethod[] = [];
  cardHistory: CardChangeHistory[] = [];
  showCardManagement: boolean = false;
  cardManagementLoading: boolean = false;
  cardUpdateMessage: string = '';
  selectedCardForUpdate: string = '';
  customerEmail: string = '';
  
  // Page type detection
  isPaymentPage: boolean = true; // This is a payment page, so hide card management
  
  // SalesForce data loading flag
  salesForceDataLoaded: boolean = false;
  
  // Blur page if first payment is completed
  isFirstPaymentCompleted: boolean = false;
  
  // Store the original API sales agent data to prevent overwriting
  originalSalesAgentData: SalesAgent | null = null;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private salesForceService: SalesForceService,
    private paymentScheduleService: PaymentScheduleService,
    private subscriptionCardService: SubscriptionCardService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get route parameters
    this.route.params.subscribe((params: any) => {
      if (params['checkoutId']) {
        this.currentCheckoutId = params['checkoutId'];
        this.loadPaymentScheduleByCheckoutId(this.currentCheckoutId);
      } else if (params['quotepaymentId']) {
        this.quotepaymentId = params['quotepaymentId'];
        this.loadPaymentScheduleByQuoteId(this.quotepaymentId);
      } else {
        // Load default/demo data
        this.loadDemoData();
      }
    });

    // Also check for query parameters
    this.route.queryParams.subscribe((params: any) => {
      if (params['quotepaymentId']) {
        this.quotepaymentId = params['quotepaymentId'];
      }
    });

    this.getSalesForceDetails();

    // Check for card update status in URL
    this.checkCardUpdateStatus();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Dynamically load JS only for this component
      this.loadScript('assets/js/jquery-2.2.4.min.js');
      this.loadScript('assets/js/bootstrap.bundle.min.js');
      this.loadScript('assets/js/simplebar.min.js');
      this.loadScript('assets/js/select2.min.js');
      this.loadScript('assets/js/custom.js');
    }
  }

  // Load payment schedule by checkout ID (from URL like /payment/{checkoutId})
  private loadPaymentScheduleByCheckoutId(checkoutId: string): void {    this.isLoading = true;
    this.errorMessage = ''; // Clear any previous error
    this.paymentScheduleService.getPaymentScheduleByCheckoutId(checkoutId).subscribe({
      next: (data: any) => {
        this.populateComponentData(data);
        this.afsPaymentLink = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
        // isLoading is set to false in populateComponentData
      },
      error: (error: any) => {
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        
        // Handle payment link expiration (410 Gone)
        if (error.status === 410 && error.error?.isExpired) {
          const errorData = error.error;
          let expiredMessage = '🚫 Payment Link Expired\n\n';
          expiredMessage += errorData.message || 'This payment link has expired and is no longer valid for payments.';
          
          if (errorData.expiryDate) {
            const expiryDate = new Date(errorData.expiryDate);
            expiredMessage += `\n\nThis link expired on ${expiryDate.toLocaleDateString()}.`;
          }
          
          expiredMessage += '\n\nPlease contact your sales representative to generate a new payment link.';
          this.errorMessage = expiredMessage;
        } else {
          this.errorMessage = `Failed to load payment schedule: ${error.status} ${error.statusText}\n\nPlease try again later or contact support if the problem persists.`;
        }
        
        this.isLoading = false; // Set loading to false immediately
        this.cdr.detectChanges(); // Force change detection
        
        // Only load demo data if it's not an expiration error
        if (error.status !== 410) {
          setTimeout(() => {
            this.loadDemoData();
          }, 500); // Small delay to show error message
        }
      }
    });
  }

  // Load payment schedule by quote payment ID
  private loadPaymentScheduleByQuoteId(quotepaymentId: string): void {
    this.isLoading = true;
    this.errorMessage = ''; // Clear any previous error
    this.paymentScheduleService.getVzatRecurringData(quotepaymentId).subscribe({
      next: (data: VzatRecurringData) => {
        this.populateComponentData(data);
        // isLoading is set to false in populateComponentData
      },
      error: (error: any) => {
        console.error('Error loading payment data:', error);
        this.errorMessage = 'Failed to load payment data. Loading demo data...';
        this.isLoading = false; // Set loading to false immediately
        this.cdr.detectChanges(); // Force change detection
        setTimeout(() => {
          this.loadDemoData();
        }, 500); // Small delay to show error message
      }
    });
  }

  // Load demo data (for testing)
  private loadDemoData(): void {
    // Demo data matching your API response structure
    const demoSubscriptionInfo = {
      total_installments: 6,
      remaining_installments: 5,
      next_charge_date: '2025-08-25',
      installment_amount: 300,
      total_amount: 1800
    };

    this.customerData = {
      name: "Hina Aslam",
      invoiceNumber: "tessst-subssz-2025-001", // Using quotepaymentId
      totalAmount: demoSubscriptionInfo.total_amount
    };

    this.quotepaymentId = "tessst-subssz-2025-001";
    this.paymentSchedule = this.paymentScheduleService.generatePaymentSchedule(
      demoSubscriptionInfo, 
      '2025-07-29'
    );
    
    console.log('🎭 Demo data loaded:', {
      customerData: this.customerData,
      paymentSchedule: this.paymentSchedule
    });
    
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  // Populate component data from API response
  private populateComponentData(data: any): void {
  try {
      // Store API data for reference
      this.apiData = data;
      
      // Update customer data - handle both API response formats
      this.customerData = {
        name: data.Customer_name || 
              data.customer_details?.name || 
              data.Customer_Name || 
              data.customerName || 
              data.name || 
              "Customer",
        invoiceNumber: data.quotepaymentId || 
                      data.quote_payment_number || 
                      data.QuoteId || 
                      data.quote_id || 
                      data.invoiceNumber || 
                      data.invoice_number || 
                      "INV-001",
        totalAmount: data.Total_After_VAT_Currency || 
                     data.subscription_info?.total_amount || 
                     data.TotalPrice || 
                     data.total_amount ||
                     data.amount ||
                     1800
      };

      // Update sales agent data with dynamic fields from API
      // Priority: salesPersonDetails > SalesForce data > fallback data
      if (data.salesPersonDetails) {
        // Use salesPersonDetails from API response
        this.salesAgent = {
          name: data.salesPersonDetails.salesPersonName || "NA",
          position:  "NA",
          faxNumber:  "NA",
          phoneNumber: data.salesPersonDetails.salesPersonMobile || "NA",
          email: data.salesPersonDetails.salesPersonEmail || "NA"
        };

        // Add mobile number if available from salesPersonDetails
        if (data.salesPersonDetails.salesPersonMobile) {
          this.salesAgent.mobNo1 = data.salesPersonDetails.salesPersonMobile;
        } else if (data.opp_mobile) {
          this.salesAgent.mobNo1 = data.opp_mobile;
        }
      } else if (!this.salesForceDataLoaded || !this.originalSalesAgentData) {
        // Fallback to opp_owner data if salesPersonDetails not available
        this.salesAgent = {
          name: data.opp_owner || "NA",
          position:  "NA",
          faxNumber:  "NA",
          phoneNumber:  "NA",
          email: data.opp_email || "NA"
        };

        // Add mobile number if available
        if (data.opp_mobile) {
          this.salesAgent.mobNo1 = data.opp_mobile;
        }
      } else {
        // Use the original SalesForce data but supplement with API data if fields are missing
        this.salesAgent = {
          name: this.originalSalesAgentData.name || data.opp_owner || "NA",
          position: this.originalSalesAgentData.position || data.opp_title || "NA",
          faxNumber: this.originalSalesAgentData.faxNumber || data.opp_number || "NA",
          phoneNumber: this.originalSalesAgentData.phoneNumber || data.opp_phone || "NA",
          email: this.originalSalesAgentData.email || data.opp_email || "NA",
          mobNo1: this.originalSalesAgentData.mobNo1 || data.opp_mobile || "NA",
          mobNo2: this.originalSalesAgentData.mobNo2 || "NA",
          token: this.originalSalesAgentData.token
        };
      }

      this.quotepaymentId = data.quotepaymentId || 
                           data.quotepayment_id || 
                           data.quote_payment_id ||
                           data.id;

      // Extract customer email for card management
      this.customerEmail = data.opp_email || 
                          data.customer_email || 
                          data.email || 
                          '';
      
      // Set checkout ID if available from API response
      this.currentCheckoutId = data.afs_checkout_id || 
                               data.checkoutId || 
                               data.checkout_id || 
                               data.checkout_token || 
                               '';
      
      // If we have a checkout ID, build the AFS payment link
      if (this.currentCheckoutId) {
        this.afsPaymentLink = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${this.currentCheckoutId}`;
      } else {
        console.log('� Available fields in API response:', Object.keys(data));
      }
      
      
      // If payment_schedule exists in data, use it directly (new structured approach)
      if (data.payment_schedule && Array.isArray(data.payment_schedule)) {
        this.paymentSchedule = this.convertStructuredPaymentSchedule(data.payment_schedule);
        // Check if first payment is completed
        this.checkFirstPaymentStatus(data.payment_schedule);
      } 
      // If paymentSchedule exists in data, use it (legacy format)
      else if (data.paymentSchedule && Array.isArray(data.paymentSchedule)) {
        this.paymentSchedule = data.paymentSchedule;
        // Check if first payment is completed
        this.checkFirstPaymentStatus(data.paymentSchedule);
      } else {
        // Generate payment schedule from subscription info (fallback)
        this.generatePaymentScheduleFromData(data);
      }
      
  
      
      // Set loading to false and force change detection
      this.isLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        console.log('🔄 Timeout check - isLoading:', this.isLoading);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error populating component data:', error);
      this.isLoading = false;
      this.loadDemoData();
    }
  }
  
  // Generate payment schedule from subscription data
  private generatePaymentScheduleFromData(data: any): void {
    
    // Try different possible subscription info structures
    const subscriptionInfo = data.subscription_info || 
                            data.subscriptionInfo || 
                            data.subscription || 
                            data.recurringInfo ||
                            data.recurring_info;
    
    // Check if we have direct payment schedule data
    if (data.installments || data.payment_schedule || data.paymentPlan) {
      const installments = data.installments || data.payment_schedule || data.paymentPlan;
      this.paymentSchedule = this.convertToPaymentSchedule(installments);
      return;
    }
    
    if (subscriptionInfo) {
      const installmentAmount = subscriptionInfo.installment_amount || 
                              subscriptionInfo.installmentAmount || 
                              subscriptionInfo.amount || 300;
      const totalInstallments = subscriptionInfo.total_installments || 
                              subscriptionInfo.totalInstallments || 
                              subscriptionInfo.installments || 6;
      const nextChargeDate = new Date(subscriptionInfo.next_charge_date || 
                                    subscriptionInfo.nextChargeDate || 
                                    subscriptionInfo.startDate || 
                                    '2025-07-29');
      
      this.paymentSchedule = [];
      
      // Calculate the payment day based on business rule
      const getPaymentDay = (date: Date): number => {
        const day = date.getDate();
        return day <= 15 ? 10 : 25; // 1st-15th: 10th, 16th-31st: 25th
      };
      
      for (let i = 0; i < totalInstallments; i++) {
        let dueDate: Date;
        
        if (i === 0) {
          // First payment: use the next charge date as provided
          dueDate = new Date(nextChargeDate);
        } else {
          // Subsequent payments: 10th or 25th of each month
          const paymentDay = getPaymentDay(nextChargeDate);
          const targetMonth = nextChargeDate.getMonth() + i;
          const targetYear = nextChargeDate.getFullYear() + Math.floor(targetMonth / 12);
          const adjustedMonth = targetMonth % 12;
          
          dueDate = new Date(targetYear, adjustedMonth, paymentDay);
        }
        
        this.paymentSchedule.push({
          id: `payment-${i + 1}`,
          dueDate: dueDate,
          amount: installmentAmount,
          status: i === 0 ? 'due' : 'pending',
          isNextPayment: i === 0
        });
      }
      
    } else {
      // Try to generate from direct data properties
      this.generateFromDirectData(data);
    }
  }

  // Helper method to convert structured payment_schedule from API to component format
  private convertStructuredPaymentSchedule(paymentSchedule: any[]): PaymentScheduleItem[] {
    return paymentSchedule.map((payment, index) => ({
      id: `payment-${payment.installment_number}`,
      dueDate: new Date(payment.due_date),
      amount: payment.amount,
      status: payment.status as 'completed' | 'due' | 'pending',
      isNextPayment: payment.status === 'due'
    }));
  }

  // Check if first payment is completed to determine if page should be blurred
  private checkFirstPaymentStatus(paymentSchedule: any[]): void {
    if (paymentSchedule && paymentSchedule.length > 0) {
      const firstPayment = paymentSchedule.find(payment => payment.installment_number === 1);
      this.isFirstPaymentCompleted = firstPayment ? firstPayment.status === 'completed' : false;
      
      console.log('🔍 First payment status check:', {
        firstPayment: firstPayment,
        isCompleted: this.isFirstPaymentCompleted
      });
    }
  }

  // Helper method to convert various installment formats to our payment schedule format
  private convertToPaymentSchedule(installments: any[]): PaymentScheduleItem[] {
    return installments.map((installment, index) => ({
      id: installment.id || `payment-${index + 1}`,
      dueDate: new Date(installment.dueDate || installment.due_date || installment.date),
      amount: installment.amount || installment.price || 0,
      status: installment.status || (index === 0 ? 'due' : 'pending'),
      isNextPayment: installment.isNext || index === 0
    }));
  }

  // Try to generate payment schedule from direct data properties
  private generateFromDirectData(data: any): void {
    
    // Look for total amount and try to create installments
    const totalAmount = data.Total_After_VAT_Currency || 
                       data.TotalPrice || 
                       data.total_amount || 
                       data.amount || 
                       this.customerData.totalAmount;
    
    if (totalAmount && totalAmount > 0) {
      
      // Default to 6 installments if not specified
      const installmentCount = data.installment_count || 
                              data.installmentCount || 
                              data.payments || 6;
      
      const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
      const startDate = new Date(data.start_date || data.startDate || '2025-07-29');
      
      this.paymentSchedule = [];
      
      // Calculate the payment day based on business rule
      const getPaymentDay = (date: Date): number => {
        const day = date.getDate();
        return day <= 15 ? 10 : 25; // 1st-15th: 10th, 16th-31st: 25th
      };
      
      for (let i = 0; i < installmentCount; i++) {
        let dueDate: Date;
        
        if (i === 0) {
          // First payment: use the start date as provided
          dueDate = new Date(startDate);
        } else {
          // Subsequent payments: 10th or 25th of each month
          const paymentDay = getPaymentDay(startDate);
          const targetMonth = startDate.getMonth() + i;
          const targetYear = startDate.getFullYear() + Math.floor(targetMonth / 12);
          const adjustedMonth = targetMonth % 12;
          
          dueDate = new Date(targetYear, adjustedMonth, paymentDay);
        }
        
        this.paymentSchedule.push({
          id: `payment-${i + 1}`,
          dueDate: dueDate,
          amount: installmentAmount,
          status: i === 0 ? 'due' : 'pending',
          isNextPayment: i === 0
        });
      }
      
    } else {
      // Fallback to demo data
      this.loadDemoData();
    }
  }

  // Calculate total amount from API data (Total_After_VAT_Currency)
  get totalAmount(): number {
    return this.apiData?.Total_After_VAT_Currency || this.customerData.totalAmount || 0;
  }

  // Calculate paid amount based on completed payments
  get paidAmount(): number {
    return this.paymentSchedule
      .filter(payment => payment.status === 'completed')
      .reduce((total, payment) => total + payment.amount, 0);
  }

  // Calculate remaining amount based on total - paid
  get remainingAmount(): number {
    return this.totalAmount - this.paidAmount;
  }

  // Get next payment date
  get nextPaymentDate(): Date | null {
    const nextPayment = this.paymentSchedule.find(payment => 
      payment.status === 'due' && payment.isNextPayment
    );
    return nextPayment ? nextPayment.dueDate : null;
  }

  // Check if there's an active payment available
  hasActivePayment(): boolean {
    return this.paymentSchedule.some(payment => 
      payment.status === 'due' && payment.isNextPayment
    );
  }

  // Initiate payment for a specific installment
  initiatePayment(payment: PaymentScheduleItem): void {
    if (payment.status === 'due' && payment.isNextPayment) {
      this.selectedPayment = payment;

      
      // Navigate to payment widget with AFS checkout data
      if (this.currentCheckoutId) {

        // If we have a checkout ID, navigate to the AFS payment widget
        this.router.navigate(['/payment-widget'], {
          queryParams: {
            checkoutId: this.currentCheckoutId,
            paymentId: payment.id,
            amount: payment.amount,
            dueDate: payment.dueDate.toISOString(),
            quotepaymentId: this.quotepaymentId,
            paymentLink: this.afsPaymentLink
          }
        });
      } else {

        // Fallback to manual payment widget
        this.router.navigate(['/payment-widget'], {
          queryParams: {
            paymentId: payment.id,
            amount: payment.amount,
            dueDate: payment.dueDate.toISOString(),
            invoiceNumber: this.customerData.invoiceNumber,
            quotepaymentId: this.quotepaymentId
          }
        });
      }
    } else {
      console.warn('Payment cannot be initiated - not due or not next payment:', payment);
    }
  }

  // Proceed to payment (main pay button)
  proceedToPayment(): void {
    if (!this.agreementAccepted) {
      alert('Please accept the terms and conditions before proceeding.');
      return;
    }

    const nextPayment = this.paymentSchedule.find(payment => 
      payment.status === 'due' && payment.isNextPayment
    );

    if (nextPayment) {
      this.initiatePayment(nextPayment);
    } else {
      alert('No payment is currently due.');
    }
  }

  private calculateRemainingAmount(): void {
    // This method can be used to recalculate amounts if needed
    console.log('Remaining amount calculated:', this.remainingAmount);
  }

  private loadScript(src: string) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }

   getSalesForceDetails()  {
    // Prevent multiple calls if data already loaded
    if (this.salesForceDataLoaded) {
      console.log('🔄 SalesForce data already loaded, skipping API call');
      return;
    }
    
    console.log('🔄 Fetching SalesForce details...');
    this.salesForceService.getSalesForceDetails().subscribe({
      next: (res: any) => {
        console.log('✅ SalesForce response:', res);
        if (res && res.name) {
          this.salesAgent = {
            name: res.name,
            position: res.position,
            phoneNumber: res.phoneNumber || res.phone || "+971 4 457 8271",
            faxNumber: res.faxNumber || res.fax || "+971 4 457 8271",
            email: res.email || "support@virtuzone.com",
            mobNo1: res.mobNo1,
            mobNo2: res.mobNo2,
            token: res.token
          };
          
          // Store a copy of the original data to prevent future overwrites
          this.originalSalesAgentData = { ...this.salesAgent };
          this.salesForceDataLoaded = true; // Mark as loaded

        } else {
          console.warn('⚠️ Invalid SalesForce response, using fallback data');
          this.setFallbackSalesAgent();
        }
      },
      error: (err: any) => {
        console.error('❌ Error fetching SalesForce details:', err);
        this.setFallbackSalesAgent();
      },
      complete: () => {},
    });
  }

  private setFallbackSalesAgent() {
    // Only set fallback if we don't already have sales agent data
    if (!this.salesAgent.name && !this.salesAgent.email && !this.salesAgent.phoneNumber) {
      this.salesAgent = {
        name: "", 
        position: "", 
        faxNumber: "",
        phoneNumber: "",
        email: "",
        mobNo1: "", 
        mobNo2: "", 
        token: 0
      };
      console.log('🔄 Using fallback sales agent data:', this.salesAgent);
    } else {
      console.log('✅ Sales agent data already exists, skipping fallback:', this.salesAgent);
    }
    this.salesForceDataLoaded = true; // Mark as loaded even for fallback
  }

  // ===============================
  // CARD MANAGEMENT METHODS
  // ===============================

  /**
   * Check for card update status in URL and show appropriate message
   */
  private checkCardUpdateStatus(): void {
    const status = this.subscriptionCardService.checkCardUpdateStatus();
    
    if (status.updated) {
      if (status.success) {
        this.cardUpdateMessage = '✅ Your payment card has been successfully updated for this subscription.';
        // Load updated payment methods
        if (this.customerEmail && this.quotepaymentId) {
          this.loadPaymentMethods();
        }
      } else {
        this.cardUpdateMessage = '❌ There was an issue updating your payment card. Please try again.';
      }
      
      // Clear the status from URL after 5 seconds
      setTimeout(() => {
        this.subscriptionCardService.clearCardUpdateStatus();
        this.cardUpdateMessage = '';
      }, 5000);
    }
  }

  /**
   * Toggle card management panel visibility
   */
  toggleCardManagement(): void {
    this.showCardManagement = !this.showCardManagement;
    
    if (this.showCardManagement && this.paymentMethods.length === 0) {
      this.loadPaymentMethods();
      this.loadCardHistory();
    }
  }

  /**
   * Load available payment methods for the customer
   */
  private loadPaymentMethods(): void {
    if (!this.customerEmail) {
      console.warn('⚠️ Customer email not available for loading payment methods');
      return;
    }

    this.cardManagementLoading = true;
    this.subscriptionCardService.getPaymentMethods(this.customerEmail).subscribe({
      next: (response) => {
        if (response.success) {
          this.paymentMethods = response.paymentMethods;

        } else {
          console.error('❌ Failed to load payment methods');
        }
        this.cardManagementLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading payment methods:', error);
        this.cardManagementLoading = false;
      }
    });
  }

  /**
   * Load card change history for the subscription
   */
  private loadCardHistory(): void {
    if (!this.customerEmail || !this.quotepaymentId) {
      console.warn('⚠️ Customer email or quote payment ID not available for loading card history');
      return;
    }

    this.subscriptionCardService.getCardHistory(this.quotepaymentId, this.customerEmail).subscribe({
      next: (response) => {
        if (response.success) {
          this.cardHistory = response.cardHistory;
          console.log('✅ Card history loaded:', this.cardHistory);
        } else {
          console.error('❌ Failed to load card history');
        }
      },
      error: (error) => {
        console.error('❌ Error loading card history:', error);
      }
    });
  }

  /**
   * Create a new payment form for adding/changing card
   */
  addNewCard(): void {
    if (!this.customerEmail || !this.quotepaymentId) {
      this.cardUpdateMessage = '❌ Unable to add new card. Missing customer information.';
      return;
    }

    this.cardManagementLoading = true;
    this.subscriptionCardService.createCardChangeForm(this.quotepaymentId, this.customerEmail).subscribe({
      next: (response) => {
        if (response.success && response.paymentFormUrl) {
          // Redirect to payment form
          window.location.href = response.paymentFormUrl;
        } else {
          this.cardUpdateMessage = '❌ Failed to create payment form for new card.';
          this.cardManagementLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error creating card change form:', error);
        this.cardUpdateMessage = '❌ Failed to create payment form. Please try again.';
        this.cardManagementLoading = false;
      }
    });
  }

  /**
   * Update subscription to use a different existing card
   */
  useExistingCard(): void {
    if (!this.selectedCardForUpdate) {
      this.cardUpdateMessage = '⚠️ Please select a card to use for this subscription.';
      return;
    }

    if (!this.customerEmail || !this.quotepaymentId) {
      this.cardUpdateMessage = '❌ Unable to update card. Missing customer information.';
      return;
    }

    this.cardManagementLoading = true;
    this.subscriptionCardService.updateSubscriptionCard(
      this.quotepaymentId, 
      this.selectedCardForUpdate, 
      this.customerEmail
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.cardUpdateMessage = '✅ Subscription payment method updated successfully!';
          // Reload payment methods to show updated status
          this.loadPaymentMethods();
          this.loadCardHistory();
        } else {
          this.cardUpdateMessage = '❌ Failed to update subscription payment method.';
        }
        this.cardManagementLoading = false;
      },
      error: (error) => {
        console.error('❌ Error updating subscription card:', error);
        this.cardUpdateMessage = '❌ Failed to update payment method. Please try again.';
        this.cardManagementLoading = false;
      }
    });
  }

  /**
   * Get the display text for card brand
   */
  getCardBrandIcon(brand: string): string {
    switch (brand.toUpperCase()) {
      case 'VISA': return '💳 Visa';
      case 'MASTERCARD': return '💳 Mastercard';
      case 'AMEX': return '💳 American Express';
      case 'DISCOVER': return '💳 Discover';
      case 'JCB': return '💳 JCB';
      case 'DINERS': return '💳 Diners Club';
      default: return '💳 ' + brand;
    }
  }

  /**
   * Check if a card is currently used for this subscription
   */
  isCurrentSubscriptionCard(card: PaymentMethod): boolean {
    // This would need to be checked against the subscription's current registration ID
    // For now, we'll use a simple check
    return card.isDefault;
  }

  /**
   * Navigate to customer portal
   */
  goToCustomerPortal(): void {
    // Navigate to customer portal with customer email
    if (this.customerEmail) {
      this.router.navigate(['/customer-portal'], {
        queryParams: { email: this.customerEmail }
      });
    } else {
      // Fallback to login page
      this.router.navigate(['/login']);
    }
  }

  /**
   * Contact support
   */
  contactSupport(): void {
    // You can implement this based on your support system
    // For now, we'll show an alert with contact information
    const supportInfo = `
      For support, please contact:
      
      Email: ${this.salesAgent.email}
      Phone: ${this.salesAgent.phoneNumber}
      ${this.salesAgent.mobNo1 ? `Mobile: ${this.salesAgent.mobNo1}` : ''}
    `;
    
    alert(supportInfo);
  }
}
