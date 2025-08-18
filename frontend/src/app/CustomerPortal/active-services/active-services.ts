import { Component, Inject, PLATFORM_ID, Renderer2, OnInit, ChangeDetectorRef } from '@angular/core';
import { DOCUMENT, NgIf, NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { StyleLoader } from '../../services/style-loader';
import { ActiveServicesService, PaymentScheduleService, ActiveServicesResponse } from '../../services/active-services.service';
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
    private cdr: ChangeDetectorRef
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
        console.error(err);
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
        console.error('❌ Customer email not found in stored data');
        this.errorMessage = 'Customer email not found. Please log in again.';
        this.loadingServices = false;
        return;
      }

      this.customerEmail = customerData.email;
      console.log('🔍 Loading active services for:', this.customerEmail);
      console.log('📧 Customer data found:', customerData);

      this.activeServicesService.getActiveServices(this.customerEmail).subscribe({
        next: (response: ActiveServicesResponse) => {
          console.log('✅ Active services response received:', response);
          console.log('📊 Services count:', response.services?.length || 0);
          console.log('📋 First service sample:', response.services?.[0] || 'No services');
          
          if (response.success) {
            this.activeServices = response.services;
            this.servicesSummary = response.summary;
            this.errorMessage = '';
            console.log('✅ Active services loaded successfully. Total services:', this.activeServices.length);
            
            // Debug: Log the first service structure
            if (this.activeServices.length > 0) {
              console.log('🔍 First service structure:', JSON.stringify(this.activeServices[0], null, 2));
              console.log('🔍 Service keys:', Object.keys(this.activeServices[0]));
              console.log('🔍 Customer_name:', this.activeServices[0].Customer_name);
              console.log('🔍 opp_email:', this.activeServices[0].opp_email);
              console.log('🔍 QuoteLineItemId:', this.activeServices[0].QuoteLineItemId);
              console.log('🔍 subscription_status:', this.activeServices[0].subscription_status);
              
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
            
            // Force change detection
            console.log('🔄 Triggering change detection...');
            this.cdr.detectChanges();
            setTimeout(() => {
              console.log('⏰ After timeout - activeServices length:', this.activeServices.length);
              this.cdr.detectChanges();
            }, 100);
          } else {
            console.error('❌ Response success was false:', response);
            this.errorMessage = 'Failed to load services. Please try again.';
          }
          
          console.log('🔄 About to set loadingServices to false. Current value:', this.loadingServices);
          this.loadingServices = false;
          console.log('🔄 Setting loadingServices to false, triggering change detection. New value:', this.loadingServices);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error loading active services:', error);
          console.error('❌ Error details:', error.error);
          console.error('❌ Error status:', error.status);
          this.errorMessage = 'Failed to load services. Please check your connection and try again.';
          this.loadingServices = false;
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      console.error('❌ Error parsing customer data:', error);
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
    return payments.find(p => p.status === 'pending' || p.status === 'due' || p.status === 'overdue') || null;
  }

  /**
   * Get pending payments for the payment schedule modal
   */
  getPendingPayments(service: PaymentScheduleService): PaymentScheduleService[] {
    const payments = this.getPaymentSchedulesForService(service);
    const currentPayment = this.getCurrentPayment(service);
    
    return payments.filter(p => 
      p.status !== 'paid' && 
      p.status !== 'completed' && 
      p !== currentPayment
    );
  }

  /**
   * Get current payment index (for display purposes)
   */
  getCurrentPaymentIndex(service: PaymentScheduleService): number {
    const completedCount = this.getCompletedPayments(service).length;
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
    console.log('modal open --', this.isAdditionalModalOpen);
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
      console.log('Opening service modal for:', service.quotepaymentId);
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

    ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }

}
