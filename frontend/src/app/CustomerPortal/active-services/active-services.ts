import { Component, Inject, PLATFORM_ID, Renderer2, OnInit } from '@angular/core';
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

  constructor(
    @Inject(DOCUMENT) private document: Document, 
    private styleLoader: StyleLoader, 
    private renderer: Renderer2, 
    private customerLogin: CustomerLoginService,
    private activeServicesService: ActiveServicesService
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
          } else {
            console.error('❌ Response success was false:', response);
            this.errorMessage = 'Failed to load services. Please try again.';
          }
          
          this.loadingServices = false;
        },
        error: (error) => {
          console.error('❌ Error loading active services:', error);
          console.error('❌ Error details:', error.error);
          console.error('❌ Error status:', error.status);
          this.errorMessage = 'Failed to load services. Please check your connection and try again.';
          this.loadingServices = false;
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
    return service.id;
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
