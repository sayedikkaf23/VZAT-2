import { Component } from '@angular/core';
import { ManualInvoice } from '../../services/manual-invoice';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-manual-invoice-payment',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './manual-invoice-payment.html',
  styleUrls: ['./manual-invoice-payment.scss',"../../../assets/css/responsive-admin.css","../../../assets/css/style-admin.css","../../../assets/css/admin-theme.css" ],
})
export class ManualInvoicePayment {

  dummyInvoices = [
  {
    billTo: 'John Doe',
    invoiceNumber: 'INV-001',
    email: 'john@example.com',
    totalAmount: '100.00',
    status: 'Paid',
    dueDate: '2025-07-15',
    paymentURL: 'https://example.com/pay/INV-001'
  },
  {
    billTo: 'Jane Smith',
    invoiceNumber: 'INV-002',
    email: 'jane@example.com',
    totalAmount: '200.00',
    status: 'Pending',
    dueDate: '2025-07-20',
    paymentURL: 'https://example.com/pay/INV-002'
  },
  {
    billTo: 'Bob Brown',
    invoiceNumber: 'INV-003',
    email: 'bob@example.com',
    totalAmount: '150.00',
    status: 'Overdue',
    dueDate: '2025-07-10',
    paymentURL: 'https://example.com/pay/INV-003'
  }
];

    private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];

   manualInvoiceList: any = [];
  filteredInvoiceList: any = [];
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
loading = true; 
  constructor(
    private ManualInvoiceService: ManualInvoice,
    private styleLoader:StyleLoader,
    private router: Router
  ) {}

  ngOnInit(): void {
     this.styleLoader.loadThemes(this.themeUrls)
    .then(() => {
      // Styles loaded, show content
      this.loading = false;
    })
    .catch(err => {
      console.error(err);
      this.loading = false; // Show anyway if failed
    });

      this.manualInvoiceList = [...this.dummyInvoices];
  this.filteredInvoiceList = [...this.dummyInvoices];


    this.getAllManualInvoice();
  }

  getAllManualInvoice() {
    this.ManualInvoiceService.getAllManualInvoice().subscribe({
      next: (res: any) => {
        this.manualInvoiceList = res?.data || [];
        this.filteredInvoiceList = [...this.manualInvoiceList];
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  searchInvoices() {
    const term = this.searchTerm.trim().toLowerCase(); // Normalize search term
  
    // Specify fields to include in the search
    const includedFields = ['billTo', 'invoiceNumber', 'email', 'totalAmount', 'dueDate', 'status'];
  
    this.filteredInvoiceList = this.manualInvoiceList.filter((item: any) => {
      return Object.entries(item).some(([key, value]) => {
        // Only check fields that are in the included list
        if (includedFields.includes(key) && value !***REMOVED*** null && value !***REMOVED*** undefined) {
          const normalizedValue = value.toString().toLowerCase();
          return normalizedValue.includes(term); // Match term in specified fields
        }
        return false;
      });
    });
  
    console.log('Search Term:', term);
    console.log('Filtered List:', this.filteredInvoiceList);
  
    this.currentPage = 1; // Reset to the first page after search
  }
  

  get paginatedInvoices() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredInvoiceList.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredInvoiceList.length / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages;
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  editInvoice(invoiceData: any) {
    this.router.navigate(['/panel/invoice/Edit'], {
      queryParams: { invoice: JSON.stringify(invoiceData) },
    });
  }
  sortColumn(column: string) {
    this.filteredInvoiceList.sort((a: any, b: any) => {
      const aValue = a[column]?.toString().toLowerCase();
      const bValue = b[column]?.toString().toLowerCase();
      return aValue.localeCompare(bValue);
    });

    this.currentPage = 1; // Reset to the first page after sorting
  }

  addInvoice() {
    this.router.navigate(['/panel/invoice/generate']);
  }

  navigateToPayment(paymentURL: string) {
    if (paymentURL) {
      window.open(paymentURL, '_blank');
    }
  }
      
  ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
