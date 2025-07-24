import { Component, AfterViewInit, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { SalesForceService } from '../../services/salesforce.service';
import { PaymentScheduleService, VzatRecurringData } from '../../services/payment-schedule.service';

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
  imports: [CommonModule, FormsModule, HttpClientModule],
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
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private salesForceService: SalesForceService,
    private paymentScheduleService: PaymentScheduleService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get route parameters
    this.route.params.subscribe(params => {
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
    this.route.queryParams.subscribe(params => {
      if (params['quotepaymentId']) {
        this.quotepaymentId = params['quotepaymentId'];
      }
    });

    this.getSalesForceDetails();
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
  private loadPaymentScheduleByCheckoutId(checkoutId: string): void {
    this.isLoading = true;
    this.errorMessage = ''; // Clear any previous error
    this.paymentScheduleService.getPaymentScheduleByCheckoutId(checkoutId).subscribe({
      next: (data: any) => {
        console.log('✅ Payment schedule data received:', data);
        this.populateComponentData(data);
        this.afsPaymentLink = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
        // isLoading is set to false in populateComponentData
      },
      error: (error) => {
        console.error('❌ Error loading payment schedule:', error);
        this.errorMessage = 'Failed to load payment schedule. Loading demo data...';
        this.isLoading = false; // Set loading to false immediately
        this.cdr.detectChanges(); // Force change detection
        setTimeout(() => {
          this.loadDemoData();
        }, 500); // Small delay to show error message
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
      error: (error) => {
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
    console.log('🎭 Loading demo data');
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
      invoiceNumber: "VZ2104858",
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
    console.log('📊 Populating component with data:', data);
    console.log('🔍 Data structure analysis:');
    console.log('  - Keys available:', Object.keys(data));
    console.log('  - Data type:', typeof data);
    console.log('  - Has subscription_info:', !!data.subscription_info);
    console.log('  - Has subscriptionInfo:', !!data.subscriptionInfo);
    console.log('  - Has paymentSchedule:', !!data.paymentSchedule);
    console.log('  - Has installments:', !!data.installments);
    
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
        invoiceNumber: data.quote_payment_number || 
                      data.QuoteId || 
                      data.quote_id || 
                      data.invoiceNumber || 
                      data.invoice_number || 
                      "INV-001",
        totalAmount: data.subscription_info?.total_amount || 
                     data.Total_After_VAT_Currency || 
                     data.TotalPrice || 
                     data.total_amount ||
                     data.amount ||
                     1800
      };

      // Update sales agent data with dynamic fields from API
      this.salesAgent = {
        name: data.opp_owner || "Sales Representative",
        position: data.opp_title || "Sales Specialist",
        faxNumber: data.opp_number || "+971 4 457 8271",
        phoneNumber: data.opp_phone || "+971 4 457 8271",
        email: data.opp_email || "sales@virtuzone.com"
      };

      // Add mobile number if available
      if (data.opp_mobile) {
        this.salesAgent.mobNo1 = data.opp_mobile;
      }

      this.quotepaymentId = data.quotepaymentId || 
                           data.quotepayment_id || 
                           data.quote_payment_id ||
                           data.id;
      
      console.log('💾 Updated customer data:', this.customerData);
      console.log('💾 Updated sales agent data:', this.salesAgent);
      console.log('💾 Quote payment ID:', this.quotepaymentId);
      
      // If paymentSchedule exists in data, use it, otherwise generate from subscription info
      if (data.paymentSchedule && Array.isArray(data.paymentSchedule)) {
        this.paymentSchedule = data.paymentSchedule;
        console.log('📅 Using existing payment schedule:', this.paymentSchedule);
      } else {
        // Generate payment schedule from subscription info
        console.log('🔄 Generating payment schedule from subscription data');
        this.generatePaymentScheduleFromData(data);
      }
      
      console.log('✅ Component data population completed successfully');
      
      // Set loading to false after successful data population
      console.log('🔄 Setting isLoading to false...');
      this.isLoading = false;
      console.log('✅ isLoading is now:', this.isLoading);
      
      // Force change detection
      this.cdr.detectChanges();
      setTimeout(() => {
        console.log('🔄 Timeout check - isLoading:', this.isLoading);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error populating component data:', error);
      this.loadDemoData();
    }
  }
  
  // Generate payment schedule from subscription data
  private generatePaymentScheduleFromData(data: any): void {
    console.log('🏗️ Generating payment schedule from data:', data);
    console.log('🔍 Available data keys:', Object.keys(data));
    
    // Try different possible subscription info structures
    const subscriptionInfo = data.subscription_info || 
                            data.subscriptionInfo || 
                            data.subscription || 
                            data.recurringInfo ||
                            data.recurring_info;
    
    // Check if we have direct payment schedule data
    if (data.installments || data.payment_schedule || data.paymentPlan) {
      console.log('📋 Direct payment schedule found in data');
      const installments = data.installments || data.payment_schedule || data.paymentPlan;
      this.paymentSchedule = this.convertToPaymentSchedule(installments);
      return;
    }
    
    if (subscriptionInfo) {
      console.log('📋 Subscription info found:', subscriptionInfo);
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
      
      for (let i = 0; i < totalInstallments; i++) {
        const dueDate = new Date(nextChargeDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        this.paymentSchedule.push({
          id: `payment-${i + 1}`,
          dueDate: dueDate,
          amount: installmentAmount,
          status: i === 0 ? 'due' : 'pending',
          isNextPayment: i === 0
        });
      }
      
      console.log('📅 Generated payment schedule:', this.paymentSchedule);
    } else {
      // Try to generate from direct data properties
      console.log('🔄 Attempting to generate from direct data properties');
      this.generateFromDirectData(data);
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
    console.log('🎯 Trying to extract payment info from direct data properties');
    
    // Look for total amount and try to create installments
    const totalAmount = data.Total_After_VAT_Currency || 
                       data.TotalPrice || 
                       data.total_amount || 
                       data.amount || 
                       this.customerData.totalAmount;
    
    if (totalAmount && totalAmount > 0) {
      console.log('💰 Found total amount:', totalAmount);
      
      // Default to 6 installments if not specified
      const installmentCount = data.installment_count || 
                              data.installmentCount || 
                              data.payments || 6;
      
      const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
      const startDate = new Date(data.start_date || data.startDate || '2025-07-29');
      
      this.paymentSchedule = [];
      
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        this.paymentSchedule.push({
          id: `payment-${i + 1}`,
          dueDate: dueDate,
          amount: installmentAmount,
          status: i === 0 ? 'due' : 'pending',
          isNextPayment: i === 0
        });
      }
      
      console.log('📅 Generated payment schedule from direct data:', this.paymentSchedule);
    } else {
      // Fallback to demo data
      console.log('⚠️ No usable payment data found, loading demo data');
      this.loadDemoData();
    }
  }

  // Calculate remaining amount based on unpaid installments
  get remainingAmount(): number {
    return this.paymentSchedule
      .filter(payment => payment.status !== 'completed')
      .reduce((total, payment) => total + payment.amount, 0);
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
      console.log('Initiating payment for:', payment);
      
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
    this.salesForceService.getSalesForceDetails().subscribe({
      next: (res: any) => {
        console.log('✅ SalesForce response:', res);
        if (res && res.name) {
          this.salesAgent.name = res.name;
          this.salesAgent.position = res.position;
          this.salesAgent.mobNo1 = res.mobNo1;
          this.salesAgent.mobNo2 = res.mobNo2;
          this.salesAgent.token = res.token;
          console.log('✅ Updated sales agent:', this.salesAgent);
        } else {
          console.warn('⚠️ Invalid SalesForce response, using fallback data');
          this.setFallbackSalesAgent();
        }
      },
      error: (err) => {
        console.error('❌ Error fetching SalesForce details:', err);
        this.setFallbackSalesAgent();
      },
      complete: () => {},
    });
  }

  private setFallbackSalesAgent() {
    this.salesAgent = {
      name: "Divya Naresh", 
      position: "Company Formation Specialist", 
      faxNumber: "+971 4 457 8271",
      phoneNumber: "+971 52 238 2839",
      email: "divya.naresh@virtuzone.com",
      mobNo1: "", 
      mobNo2: "", 
      token: 0
    };
    console.log('🔄 Using fallback sales agent data:', this.salesAgent);
  }

}
