import { Component, ChangeDetectorRef  } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-payment-methods',
  imports: [FormsModule,CommonModule],
  templateUrl: './payment-methods.html',
  styleUrl: './payment-methods.scss'
})
export class PaymentMethods {

      private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
  loading = true; 
  paymentMethods = [
    { name: 'Bank Transfer', enabled: true },
    { name: 'Card Machine', enabled: true },
    { name: 'Cash Deposit', enabled: true },
    { name: 'Cash Over Counter', enabled: true },
    { name: 'Cheque Deposit', enabled: true },
    { name: 'Online Payment', enabled: true },
    { name: 'PDC Cheque', enabled: true },
  ];

  paymentModeList: any = [];
  page: number | undefined;
  total_page: number | undefined;
  total_pages: number[] | undefined;
  pageLimit: any;
  searchTerm: any = '';

  sortOrder: { column: string; direction: 'asc' | 'desc' } = {
    column: '',
    direction: 'asc',
  };

  constructor(private paymentModeService: PaymentMethodsService, private styleLoader: StyleLoader,private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
       this.styleLoader.loadThemes(this.themeUrls)
    .then(() => {
      // Styles loaded, show content
      this.loading = false;
       // Dummy data
      this.paymentModeList = [
        { name: 'Bank Transfer', isActive: true, updatedAt: '2025-07-10 12:00' },
        { name: 'Card Machine', isActive: false, updatedAt: '2025-07-09 09:30' },
        { name: 'Cash Deposit', isActive: true, updatedAt: '2025-07-08 15:45' },
        { name: 'Online Payment', isActive: false, updatedAt: '2025-07-07 18:20' }
      ];
        this.cd.detectChanges();
    })
    .catch(err => {
      console.error(err);
      this.loading = false; // Show anyway if failed
    });
    // this.page = 1;
    // this.getPaymentModes(this.page);
  }

  getPaymentModes(page = 1) {
    this.page = page;
    this.paymentModeService
      .getPaymentModes(this.page, this.pageLimit)
      .subscribe({
        next: (res: any) => {
          this.paymentModeList = res?.data;
          this.total_page = res.pages;
          this.total_pages = Array(res.pages)
            .fill((_x: any, i: any) => i)
            .map((x, i) => i + 1);
        },
        error: () => {
          this.paymentModeList = [];
        },
        complete: () => {},
      });
  }

  onUserStatusChange(paymentMode: any) {
    if (paymentMode?._id) {
      this.paymentModeService
        .updatePaymentModeStatus({
          isActive: paymentMode?.isActive,
          paymentModeId: paymentMode?._id,
          name: paymentMode?.name,
        })
        .subscribe({
          next: (res: any) => {},
          error: () => {},
          complete: () => {},
        });
    }
  }

  onPaymentModeSearch() {
    if (this.searchTerm) {
      this.searchPaymentModes();
    } else {
      this.resetSearchAndFetchPaymentModes();
    }
  }

  searchPaymentModes() {
    this.paymentModeService
      .searchPaymentMode({
        searchTerm: this.searchTerm,
      })
      .subscribe((res: any) => {
        this.paymentModeList = res?.data;
        this.total_page = res.pages;
        this.total_pages = Array(res.pages)
          .fill((x: any, i: any) => i)
          .map((x, i) => i + 1);
      });
  }

  resetSearchAndFetchPaymentModes() {
    this.page = 1;
    this.searchPaymentModes();
  }

  sortColumn(column: string) {
    if (this.sortOrder.column ***REMOVED***= column) {
      // Toggle sorting direction if the same column is clicked
      this.sortOrder.direction =
        this.sortOrder.direction ***REMOVED***= 'asc' ? 'desc' : 'asc';
    } else {
      // Set default sorting direction for a new column
      this.sortOrder.column = column;
      this.sortOrder.direction = 'asc';
    }

    // Perform sorting based on the selected column and direction
    this.paymentModeList.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      const aValue = a[column];
      const bValue = b[column];

      if (aValue < bValue) {
        return this.sortOrder.direction ***REMOVED***= 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        return this.sortOrder.direction ***REMOVED***= 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }

        ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
