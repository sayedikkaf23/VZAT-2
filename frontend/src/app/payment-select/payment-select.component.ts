import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OnlinePaymentService } from '../services/online-payment.service';
import { PaymentScheduleService, VzatRecurringData } from '../services/payment-schedule.service';
import { SalesForceService } from '../services/salesforce.service';
import { MessageService } from '../services/message.service';
import { SalesAgentSidebarComponent } from '../shared/components/sales-agent-sidebar/sales-agent-sidebar.component';
// import { FooterComponent } from '../footer/footer.component';

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
  contactName?: string;
  contactEmail?: string;
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
  selector: 'app-payment-select',
  standalone: true,
  imports: [CommonModule, RouterModule, SalesAgentSidebarComponent],
  templateUrl: './payment-select.component.html',
  styleUrls: ['./payment-select.component.scss']
})
export class PaymentSelectComponent implements OnInit {
  orderData: any;
  piData: any;
  orderId: string = '';
  availablePaymentMethods: any[] = [];
  onlinepayment: any[] = [];
  loading: boolean = true;
  message: string = '';

  // Customer data for sidebar
  customerData: CustomerData = {
    name: "Loading...",
    invoiceNumber: "Loading...",
    totalAmount: 0
  };

  Quote_payment_number: string = '';

  // Sales agent data
  salesAgent: SalesAgent = {
    name: "Loading...",
    position: "Loading...",
    faxNumber: "",
    phoneNumber: "",
    email: ""
  };

  // API response data
  apiData: ApiResponseData | null = null;

  // SalesForce data loading flag
  salesForceDataLoaded: boolean = false;

  // Store the original API sales agent data to prevent overwriting
  originalSalesAgentData: SalesAgent | null = null;

  constructor(
    private onlinePaymentService: OnlinePaymentService,
    private paymentScheduleService: PaymentScheduleService,
    private salesForceService: SalesForceService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) { }

  // Normalize optional text fields like fax/email/phone coming from API
  private sanitizeField(val: any): string {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    const up = s.toUpperCase();
    if (!s || up === 'NA' || up === 'N/A' || up === 'UNDEFINED') return '';
    return s;
  }

  private normalizePhone(n: string | null | undefined): string {
    return (n || '').replace(/\D+/g, '');
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.orderId = params['id'];

      // Load payment data using the same API as payment-schedule
      this.loadPaymentData(this.orderId);

      // Get SalesForce details
      this.getSalesForceDetails();
    });
  }

  // Load payment data using PaymentScheduleService (same as payment-schedule)
  private loadPaymentData(quotepaymentId: string): void {
    this.loading = true;
    this.paymentScheduleService.getPaymentScheduleByCheckoutId(quotepaymentId).subscribe({
      next: (data: VzatRecurringData) => {
        this.populateComponentData(data);
      },
      error: (error: any) => {
        console.error('Error loading payment data:', error);
        this.loading = false;
        // Fallback to OnlinePaymentService if PaymentScheduleService fails
        this.fallbackToOnlinePaymentService(quotepaymentId);
      }
    });
  }

  // Fallback to original OnlinePaymentService if needed
  private fallbackToOnlinePaymentService(quotepaymentId: string): void {
    this.onlinePaymentService.getQuoteById(quotepaymentId).subscribe((data) => {
      console.log('Response from backend:', data);
      const isActive = data && data.isActive;
      console.log(isActive);

      if (!isActive) {
        this.messageService.setMessage(
          'You have already paid for the Proforma Invoice. Please contact your sales agent for more information.'
        );
        this.router.navigate(['/onlinepayments/', quotepaymentId]);
      } else {
        this.fetchPiData(quotepaymentId);
      }
    });
  }

  // Populate component data from API response (same logic as payment-schedule)
  private populateComponentData(data: any): void {
    try {
      // Store API data for reference
      this.apiData = data;

      // Extract Quote_payment_number
      this.Quote_payment_number = data.Quote_payment_number ||
        data.quote_payment_number ||
        data.QuotePaymentNumber ||
        '';

      // Update customer data - handle both API response formats
      this.customerData = {
        name: data.contactName ||
          data.Customer_name ||
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
          0
      };

      // Update sales agent data with dynamic fields from API
      // Priority: salesPersonDetails > SalesForce data > fallback data
      if (data.salesPersonDetails) {
        // Use only salesPersonDetails here; do not fallback to opp_*
        const phoneRaw = data.salesPersonDetails.salesPersonPhone;
        const mobileRaw = data.salesPersonDetails.salesPersonMobile;
        const phone = this.sanitizeField(phoneRaw);
        const mobile = this.sanitizeField(mobileRaw);
        const same = this.normalizePhone(phone) === this.normalizePhone(mobile);

        this.salesAgent = {
          name: this.sanitizeField(data.salesPersonDetails.salesPersonName),
          position: '',
          faxNumber: this.sanitizeField(data.salesPersonDetails.salesPersonFax),
          phoneNumber: phone || mobile || '',
          email: this.sanitizeField(data.salesPersonDetails.salesPersonEmail),
          mobNo1: same ? undefined : (mobile || undefined)
        };
      } else if (!this.salesForceDataLoaded || !this.originalSalesAgentData) {
        // Fallback to opp_owner data if salesPersonDetails not available
        const phone = this.sanitizeField(data.opp_phone);
        const mobile = this.sanitizeField(data.opp_mobile);
        const same = this.normalizePhone(phone) === this.normalizePhone(mobile);

        this.salesAgent = {
          name: this.sanitizeField(data.opp_owner),
          position: '',
          faxNumber: this.sanitizeField(data.opp_fax),
          phoneNumber: phone || mobile || '',
          email: this.sanitizeField(data.opp_email),
          mobNo1: same ? undefined : (mobile || undefined)
        };
      } else {
        // Use the original SalesForce data but supplement with API data if fields are missing
        this.salesAgent = {
          name: this.sanitizeField(this.originalSalesAgentData.name) || this.sanitizeField(data.opp_owner),
          position: this.sanitizeField(this.originalSalesAgentData.position) || this.sanitizeField(data.opp_title),
          faxNumber: this.sanitizeField(this.originalSalesAgentData.faxNumber) || this.sanitizeField(data.opp_number),
          phoneNumber: this.sanitizeField(this.originalSalesAgentData.phoneNumber) || this.sanitizeField(data.opp_phone),
          email: this.sanitizeField(this.originalSalesAgentData.email) || this.sanitizeField(data.opp_email),
          mobNo1: this.sanitizeField(this.originalSalesAgentData.mobNo1) || this.sanitizeField(data.opp_mobile),
          mobNo2: this.sanitizeField(this.originalSalesAgentData.mobNo2),
          token: this.originalSalesAgentData.token
        };

        // De-duplicate if phone and mobile are the same
        if (this.normalizePhone(this.salesAgent.phoneNumber) === this.normalizePhone(this.salesAgent.mobNo1 || '')) {
          this.salesAgent.mobNo1 = undefined;
        }
      }

      // Store piData for compatibility
      this.piData = data;

      // Set loading to false and force change detection
      this.loading = false;
      this.cdr.detectChanges();

      // Check if we should stay on this page or redirect
      if (this.piData.prepayment_screening === false && this.piData.compliance_clear === false) {
        // Stay on this page - show payment select options
      } else {
        // Redirect to online payment
        this.router.navigate([`/payment/${this.orderId}`]);
      }

    } catch (error) {
      console.error('❌ Error populating component data:', error);
      this.loading = false;
    }
  }

  // Get SalesForce details (same as payment-schedule)
  getSalesForceDetails(): void {
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
            phoneNumber: res.phoneNumber || res.phone || "",
            faxNumber: res.faxNumber || res.fax || "",
            email: res.email || "",
            mobNo1: res.mobNo1,
            mobNo2: res.mobNo2,
            token: res.token
          };

          // De-duplicate phone/mobile if identical
          if (this.normalizePhone(this.salesAgent.phoneNumber) === this.normalizePhone(this.salesAgent.mobNo1 || '')) {
            this.salesAgent.mobNo1 = undefined;
          }

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
      complete: () => { },
    });
  }

  private setFallbackSalesAgent(): void {
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

  // Fallback method for compatibility
  fetchPiData(sfId: string): void {
    this.onlinePaymentService.getPiDataById(sfId).subscribe(
      (response) => {
        console.log('Fetched Pi Data:', response);
        this.piData = response;
        this.populateComponentData(response);
      },
      (error) => {
        console.error('Error fetching Pi Data:', error);
        this.loading = false;
      }
    );
  }
}

