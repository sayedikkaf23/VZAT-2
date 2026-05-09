import { Component, Inject, PLATFORM_ID, Renderer2, OnInit, ChangeDetectorRef } from '@angular/core';
import { DOCUMENT, NgIf, NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { StyleLoader } from '../../services/style-loader';
import { ActiveServicesService, PaymentScheduleService, ActiveServicesResponse } from '../../services/active-services.service';
import { RetryPaymentService, RetryPaymentRequest, RetryPaymentResponse } from '../../services/retry-payment.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
@Component({
  selector: 'app-active-services',
  imports: [NgIf, NgFor, NgClass, RouterLink, TitleCasePipe],
  templateUrl: './active-services.html',
  styleUrl: './active-services.scss',  
})
export class ActiveServices implements OnInit {
  private themeUrls = [
    'assets/CustomerPortal/css/style.css',
    'assets/CustomerPortal/css/responsive.css'
  ];

  loading = true; 
  isAdditionalModalOpen: boolean = false;
  isServiceModalOpen: boolean = false;
  isUploadModalOpen: boolean = false;
  isSidebarHidden = false;
  isNavbarActive = false;
  retryingPaymentKey: string | null = null;

  // Dynamic data properties
  activeServices: PaymentScheduleService[] = [];
  selectedService: PaymentScheduleService | null = null;
  customerEmail: string = '';
  servicesSummary: any = {};
  loadingServices = true;
  errorMessage: string = '';

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;

  /**
   * Get sorted active services with completed payments at the top
   */
  get sortedActiveServices(): PaymentScheduleService[] {
    return [...this.activeServices].sort((a, b) => {
      // Put completed/paid services first
      const aIsCompleted = a.status === 'completed' || a.status === 'paid';
      const bIsCompleted = b.status === 'completed' || b.status === 'paid';
      
      if (aIsCompleted && !bIsCompleted) return -1;
      if (!aIsCompleted && bIsCompleted) return 1;
      
      // Then sort by Customer_name alphabetically
      const aName = a.Customer_name || '';
      const bName = b.Customer_name || '';
      return aName.localeCompare(bName);
    });
  }

  /**
   * Get unique services grouped by quotepaymentId for table display
   */
  get uniqueServices(): PaymentScheduleService[] {
    const serviceMap = new Map<string, PaymentScheduleService>();
    
    this.activeServices.forEach(service => {
      const key = service.quotepaymentId || service.id || Math.random().toString();
      
      // If this quotepaymentId already exists, keep the first one
      if (!serviceMap.has(key)) {
        serviceMap.set(key, service);
      }
    });
    
    const uniqueArray = Array.from(serviceMap.values()).sort((a, b) => {
      // Put completed/paid services first
      const aIsCompleted = a.status === 'completed' || a.status === 'paid';
      const bIsCompleted = b.status === 'completed' || b.status === 'paid';
      
      if (aIsCompleted && !bIsCompleted) return -1;
      if (!aIsCompleted && bIsCompleted) return 1;
      
      // Then sort by Customer_name alphabetically
      const aName = a.Customer_name || '';
      const bName = b.Customer_name || '';
      return aName.localeCompare(bName);
    });

    // Update total pages when unique services change
    this.updatePagination(uniqueArray.length);
    
    return uniqueArray;
  }

  /**
   * Get paginated services for current page
   */
  get paginatedServices(): PaymentScheduleService[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.uniqueServices.slice(startIndex, endIndex);
  }

  /**
   * Update pagination calculations
   */
  updatePagination(totalItems: number): void {
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
    
    // Ensure current page is valid
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  /**
   * Get pagination info text
   */
  get paginationInfo(): string {
    const totalItems = this.uniqueServices.length;
    if (totalItems === 0) return 'Showing 0 entries';
    
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
    
    return `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
  }

  /**
   * Get array of page numbers for pagination display
   */
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let startPage = Math.max(1, this.currentPage - 2);
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Navigate to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
    }
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  /**
   * Change items per page
   */
  changeItemsPerPage(newItemsPerPage: number): void {
    this.itemsPerPage = newItemsPerPage;
    this.currentPage = 1; // Reset to first page
    this.updatePagination(this.uniqueServices.length);
  }

  constructor(
    @Inject(DOCUMENT) private document: Document, 
    private styleLoader: StyleLoader, 
    private renderer: Renderer2, 
    private customerLogin: CustomerLoginService,
    private activeServicesService: ActiveServicesService,
    private retryPaymentService: RetryPaymentService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}
  ngOnInit(): void {
    this.styleLoader.loadThemes(this.themeUrls)
      .then(() => {
        // Styles loaded, show content
        this.loading = false;
        
        // Load customer email and fetch active services
        this.loadActiveServices();
      })
      .catch(err => {
        this.loading = false; // Show anyway if failed
        this.loadActiveServices();
      });
  }

  /**
   * Load active services for the logged-in customer
   */
  loadActiveServices(): void {
    // Get customer email from localStorage
    const customerDataStr = localStorage.getItem('customerData');
    if (!customerDataStr) {
      console.error('❌ Customer not logged in or data not found');
      this.errorMessage = 'Customer session not found. Please log in again.';
      this.loadingServices = false;
      return;
    }

    try {
      const customerData = JSON.parse(customerDataStr);
      if (!customerData || !customerData.email) {
        this.errorMessage = 'Customer email not found. Please log in again.';
        this.loadingServices = false;
        return;
      }

      this.customerEmail = customerData.email;


      this.activeServicesService.getActiveServices(this.customerEmail).subscribe({
        next: (response: ActiveServicesResponse) => {

          
          if (response.success) {
            this.activeServices = response.services;
            this.servicesSummary = response.summary;
            this.errorMessage = '';
            console.log('✅ Active services loaded successfully. Total services:', this.activeServices.length);
            
            // Debug: Log the first service structure
            if (this.activeServices.length > 0) {
             
              
              // Log all services data for debugging
              console.log('📋 All services data:', this.activeServices.map((service, index) => ({
                index,
                Customer_name: service.Customer_name,
                opp_email: service.opp_email,
                QuoteLineItemId: service.QuoteLineItemId,
                subscription_status: service.subscription_status,
                quotepaymentId: service.quotepaymentId
              })));
            }
            
            this.cdr.detectChanges();
            setTimeout(() => {
              console.log('⏰ After timeout - activeServices length:', this.activeServices.length);
              this.cdr.detectChanges();
            }, 100);
          } else {
            console.error('❌ Response success was false:', response);
            this.errorMessage = 'Failed to load services. Please try again.';
          }
          
          this.loadingServices = false;
          this.cdr.detectChanges();
        },
        error: (error) => {

          this.errorMessage = 'Failed to load services. Please check your connection and try again.';
          this.loadingServices = false;
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.errorMessage = 'Invalid customer session. Please log in again.';
      this.loadingServices = false;
    }
  }

  /**
   * Get CSS class for payment status badge
   */
  getStatusClass(status: string): string {
    return this.activeServicesService.getStatusBadgeClass(status);
  }

  /**
   * Get icon for payment status
   */
  getStatusIcon(status: string): string {
    return this.activeServicesService.getStatusIcon(status);
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return this.activeServicesService.formatCurrency(amount);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    return this.activeServicesService.formatDate(date);
  }

  /**
   * Check if payment is overdue
   */
  isOverdue(dueDate: Date | string, status: string): boolean {
    return this.activeServicesService.isOverdue(dueDate, status);
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByServiceId(index: number, service: PaymentScheduleService): string {
    return service.quotepaymentId || service.id || index.toString();
  }

  /**
   * Get all payment schedules for a specific quotepaymentId
   */
  getPaymentSchedulesForService(service: PaymentScheduleService): PaymentScheduleService[] {
    if (!service.quotepaymentId) return [service];
    
    // Check if service has payment_schedule array (new API structure)
    if (service.payment_schedule && service.payment_schedule.length > 0) {
      // Convert payment_schedule items to PaymentScheduleService format
      return service.payment_schedule.map(payment => ({
        ...service,
        installment_number: payment.installment_number,
        due_date: payment.due_date,
        amount: payment.amount,
        status: payment.status as 'due' | 'pending' | 'completed' | 'paid' | 'failed' | 'overdue' | 'cancelled',
        q_payment_id: payment.q_payment_id,
        salesforce_status: payment.salesforce_status,
        _id: payment._id
      })).sort((a, b) => {
        const aInstallment = a.installment_number || 0;
        const bInstallment = b.installment_number || 0;
        return aInstallment - bInstallment;
      });
    }
    
    // Fallback: filter by quotepaymentId (old API structure)
    return this.activeServices.filter(s => s.quotepaymentId === service.quotepaymentId)
      .sort((a, b) => {
        // Sort by installment number if available
        const aInstallment = a.installment_number || 0;
        const bInstallment = b.installment_number || 0;
        return aInstallment - bInstallment;
      });
  }

  /**
   * Get total amount - either from Total_After_VAT_Currency or calculate from payment schedule
   */
  getTotalAmount(service: PaymentScheduleService): number {
    if (!service) return 0;
    
    // Try to get from Total_After_VAT_Currency first
    let totalAmount = service.Total_After_VAT_Currency || 0;
    
    // If Total_After_VAT_Currency is 0 or not available, calculate from payment schedule
    if (totalAmount === 0) {
      const allPayments = this.getPaymentSchedulesForService(service);
      totalAmount = allPayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
        return sum + (amount || 0);
      }, 0);
    }
    
    return totalAmount;
  }

  /**
   * Get all payments in correct installment order for the payment schedule modal
   */
  getAllPaymentsInOrder(service: PaymentScheduleService): PaymentScheduleService[] {
    const payments = this.getPaymentSchedulesForService(service);
    return payments.sort((a, b) => {
      const aInstallment = a.installment_number || 0;
      const bInstallment = b.installment_number || 0;
      return aInstallment - bInstallment;
    });
  }

  /**
   * Get completed payments for the payment schedule modal
   */
  getCompletedPayments(service: PaymentScheduleService): PaymentScheduleService[] {
    const payments = this.getPaymentSchedulesForService(service);
    return payments.filter(p => p.status === 'paid' || p.status === 'completed');
  }

  /**
   * Get current payment for the payment schedule modal
   */
  getCurrentPayment(service: PaymentScheduleService): PaymentScheduleService | null {
    const payments = this.getPaymentSchedulesForService(service);
    
    // First check if there are any failed payments - if so, no current payment
    const hasFailedPayments = payments.some(p => p.status === 'failed');
    if (hasFailedPayments) {
      return null; // No current payment if there are failed payments
    }
    
    // If no failed payments, find the first due/overdue payment (not pending)
    // Pending payments are future payments, not current ones
    return payments.find(p => p.status === 'due' || p.status === 'overdue') || null;
  }

  /**
   * Get pending payments for the payment schedule modal
   */
  getPendingPayments(service: PaymentScheduleService): PaymentScheduleService[] {
    const payments = this.getPaymentSchedulesForService(service);
    const currentPayment = this.getCurrentPayment(service);
    
    // If there are failed payments, show the next payment after failed ones
    const hasFailedPayments = payments.some(p => p.status === 'failed');
    if (hasFailedPayments) {
      const failedPayments = payments.filter(p => p.status === 'failed');
      const maxFailedInstallment = Math.max(...failedPayments.map(p => p.installment_number));
      
      // Return payments that come after the failed payments
      return payments.filter(p => 
        p.status === 'pending' && 
        p.installment_number > maxFailedInstallment
      );
    }
    
    // If no failed payments, show regular pending payments (excluding current)
    return payments.filter(p => 
      p.status !== 'paid' && 
      p.status !== 'completed' && 
      p.status !== 'failed' &&
      p !== currentPayment
    );
  }

  /**
   * Get failed payments for the payment schedule modal
   */
  getFailedPayments(service: PaymentScheduleService): PaymentScheduleService[] {
    const payments = this.getPaymentSchedulesForService(service);
    return payments.filter(p => p.status === 'failed');
  }

  /**
   * Get current payment index (for display purposes)
   */
  getCurrentPaymentIndex(service: PaymentScheduleService): number {
    const currentPayment = this.getCurrentPayment(service);
    if (currentPayment) {
      return currentPayment.installment_number;
    }
    
    // If no current payment (due to failed payments), return the next installment number
    const payments = this.getPaymentSchedulesForService(service);
    const completedCount = this.getCompletedPayments(service).length;
    const failedPayments = payments.filter(p => p.status === 'failed');
    
    if (failedPayments.length > 0) {
      const maxFailedInstallment = Math.max(...failedPayments.map(p => p.installment_number));
      return maxFailedInstallment + 1;
    }
    
    return completedCount + 1;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number | string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Calculate remaining amount based on completed payments
   */
  getRemainingAmount(service: PaymentScheduleService): number {
    if (!service) return 0;
    
    const totalAmount = this.getTotalAmount(service);
    const completedPayments = this.getCompletedPayments(service);
    const totalPaid = completedPayments.reduce((sum, payment) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + (amount || 0);
    }, 0);
    
    return totalAmount - totalPaid;
  }

  /**
   * Format remaining amount for display
   */
  formatRemainingAmount(service: PaymentScheduleService): string {
    const remaining = this.getRemainingAmount(service);
    return `AED ${remaining.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Get total paid amount
   */
  getTotalPaidAmount(service: PaymentScheduleService): number {
    if (!service) return 0;
    
    const completedPayments = this.getCompletedPayments(service);
    return completedPayments.reduce((sum, payment) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + (amount || 0);
    }, 0);
  }

  /**
   * Format total paid amount for display
   */
  formatTotalPaidAmount(service: PaymentScheduleService): string {
    const totalPaid = this.getTotalPaidAmount(service);
    return `AED ${totalPaid.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Get total amount for display
   */
  formatTotalAmount(service: PaymentScheduleService): string {
    if (!service) return 'AED 0.00';
    
    const totalAmount = this.getTotalAmount(service);
    
    return `AED ${totalAmount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

   openModal(): void {
    this.isAdditionalModalOpen = true;

  }


  onLogout(): void {
    this.customerLogin.logout();
  }
  closeModal(): void {
    this.isAdditionalModalOpen = false;
  }

     openUploadModal(): void {
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
  }

  /**
   * Open service modal with specific service data
   */
  openServiceModal(service?: PaymentScheduleService): void {
    if (service) {

      this.selectedService = service;
    }
    this.isServiceModalOpen = true;
  }

  closeServiceModal(): void {
    this.isServiceModalOpen = false;
    this.selectedService = null;
  }

  toggleSidebar(): void {
    this.isSidebarHidden = !this.isSidebarHidden;

    if (this.isSidebarHidden) {
      this.renderer.addClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.addClass(adminBody, 'sidebar-hidden');
    } else {
      this.renderer.removeClass(this.document.body, 'menu-hide');
      const adminBody = this.document.querySelector('.admin_body');
      if (adminBody) this.renderer.removeClass(adminBody, 'sidebar-hidden');
    }
  }

  toggleNavbar(): void {
    this.isNavbarActive = !this.isNavbarActive;

    const toggleElement = this.document.querySelector('.navbar-toggle');
    if (toggleElement) {
      if (this.isNavbarActive) {
        toggleElement.classList.add('active');
      } else {
        toggleElement.classList.remove('active');
      }
    }
  }

  /**
   * Get customer name from selected service
   */
  getCustomerName(service?: PaymentScheduleService): string {
    if (!service) return 'Customer';
    return service.Customer_name || service.customerName || 'Customer';
  }

  /**
   * Get customer email from selected service
   */
  getCustomerEmail(service?: PaymentScheduleService): string {
    if (!service) return '';
    return service.opp_email || this.customerEmail || '';
  }

  /**
   * Check if a payment can be retried (2 minutes must have passed since failure)
   */
  canRetryPayment(payment: any): boolean {
    if (!payment || payment.status !== 'failed') {
      return false;
    }
    
    // If there's no failure date, allow retry
    if (!payment.failure_date) {
      return true;
    }
    
    const failureDate = new Date(payment.failure_date);
    const now = new Date();
    const timeDiff = now.getTime() - failureDate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    return minutesDiff >= 2;
  }

  /**
   * Get time remaining before retry is allowed
   */
  getRetryTimeRemaining(payment: any): string {
    if (!payment || payment.status !== 'failed' || !payment.failure_date) {
      return '';
    }
    
    const failureDate = new Date(payment.failure_date);
    const now = new Date();
    const timeDiff = now.getTime() - failureDate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff >= 2) {
      return '';
    }
    
    const remainingMinutes = Math.ceil(2 - minutesDiff);
    return `${remainingMinutes} min`;
  }

  /**
   * Get the next failed payment that can be retried
   */
  getNextFailedPayment(service: PaymentScheduleService): PaymentScheduleService | null {
    if (!service || !service.quotepaymentId) return null;
    
    const payments = this.getPaymentSchedulesForService(service);
    return payments.find(p => p.status === 'failed' || p.status === 'overdue') || null;
  }

  private getPaymentIdentifier(service: PaymentScheduleService | null, payment?: any): string {
    if (!service) {
      return '';
    }

    const serviceId = service.quotepaymentId || service.id || 'service';
    if (!payment) {
      return serviceId;
    }

    const paymentId = payment._id || payment.q_payment_id || payment.installment_number || 'payment';
    return `${serviceId}-${paymentId}`;
  }

  isPaymentRetrying(service: PaymentScheduleService | null, payment?: any): boolean {
    if (!this.retryingPaymentKey) {
      return false;
    }
    return this.retryingPaymentKey === this.getPaymentIdentifier(service, payment);
  }

  /**
   * Retry a failed payment
   */
  retryPayment(service: PaymentScheduleService, payment?: any): void {
    if (!service || !service.quotepaymentId) {
      console.error('❌ Cannot retry payment: Invalid service data');
      return;
    }

    // If payment is provided (from modal), use it; otherwise find the next failed payment
    const failedPayment = payment || this.getNextFailedPayment(service);
    if (!failedPayment) {
      console.error('❌ Cannot retry payment: No failed payments found');
      this.toastr.error('No failed payments available to retry.');
      return;
    }

    const request: RetryPaymentRequest = {
      quotepaymentId: service.quotepaymentId,
      customerEmail: this.customerEmail
    };

    console.log('🔄 Retrying payment for:', request);

    const paymentIdentifier = this.getPaymentIdentifier(service, failedPayment);
    this.retryingPaymentKey = paymentIdentifier;
    this.cdr.detectChanges();

    this.retryPaymentService.retryPayment(request)
      .pipe(
        finalize(() => {
          this.retryingPaymentKey = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: RetryPaymentResponse) => {
          if (response.success) {
            console.log('✅ Payment retry successful:', response);
            const successMessage = response.message ||
              (response.transactionId
                ? `Payment retry successful! Transaction ID: ${response.transactionId}`
                : 'Payment retry successful!');
            this.toastr.success(successMessage);

            // Immediately update the local selectedService so the modal re-renders without waiting
            if (this.selectedService && failedPayment) {
              const scheduleItem = this.selectedService.payment_schedule?.find(
                (p: any) => p._id === failedPayment._id ||
                  p.installment_number === failedPayment.installment_number
              );
              if (scheduleItem) {
                scheduleItem.status = 'completed';
                this.cdr.detectChanges();
              }
            }

            // Reload active services to reflect the updated status
            this.loadActiveServices();

            // Close the service modal
            if (this.selectedService) {
              this.closeServiceModal();
            }
          } else {
            console.error('❌ Payment retry failed:', response);
            this.toastr.error(response.message || 'Payment retry failed. Please try again.');
          }
        },
        error: (error) => {
          console.error('💥 Error during payment retry:', error);
          const errorMessage = error?.error?.message || error?.message || 'An error occurred while retrying the payment. Please try again.';
          this.toastr.error(errorMessage);
        }
      });
  }

  /**
   * Check if retry button should be shown for a service
   */
  shouldShowRetryButton(service: PaymentScheduleService): boolean {
    const failedPayments = this.getFailedPayments(service);
    return failedPayments.length > 0 && service.subscription_status === 'active';
  }

    ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
