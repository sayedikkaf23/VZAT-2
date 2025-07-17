import { Component } from '@angular/core';
import { Auth } from '../../services/auth'; 
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { User } from '../../services/user';
import { StyleLoader} from '../../services/style-loader';

@Component({
  selector: 'app-header',
  imports: [FormsModule,CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss','../../../assets/css/admin-theme.css']
})
export class Header {
      private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
  constructor(private route: ActivatedRoute,  private styleLoader: StyleLoader, private router: Router, public authService: Auth, public userService: User) { }

  ngOnInit(): void { }
  back() {
    const currentRoute = this.route.snapshot.routeConfig?.path;
    const fullUrl = this.router.url; // Get the full URL, including hash fragments if any
  
    // Check if the URL starts with '/panel/invoice/generate'
    if (fullUrl.startsWith('/panel/invoice/generate')) {
      this.router.navigate(['/panel/manual_invoice_payment']);
    } else {
      history.back(); // Default history back for other routes
    }
  }
  

  toggleSideBar() {
    const bodyElement = document.body;
    bodyElement.classList.toggle('sidebar-collapsein');
  }

  logOut() {
    localStorage.clear();
    location.href = '/admin/login';
    location.reload();
    // this.router.navigate(['/admin/login']);
  }

  get isDashboardNavShow() {
    const routes = ['/panel/dashboard'];
    return routes.includes(location.pathname);
  }

  get isReportsNavShow() {
    const routes = ['/panel/reports'];
    return routes.includes(location.pathname);
  }

  get isSettingsNavShow() {
    const routes = [
      '/panel/settings',
      '/panel/roles',
      '/panel/add_role',
      '/panel/users',
      '/panel/add_user',
      '/panel/accounts',
      '/panel/sidebars',
      '/panel/profile',
      '/panel/mail',
      ,
    ];
    return routes.includes(location.pathname);
  }

  get activeUser() {
    return ['/panel/users', '/panel/add_user'].includes(location.pathname);
  }

  get activeRole() {
    return ['/panel/roles', '/panel/add_role'].includes(location.pathname);
  }

  get activeSideBar() {
    return ['/panel/sidebars'].includes(location.pathname);
  }

  get activeprofile() {
    return ['/panel/profile'].includes(location.pathname);
  }
  get activemail() {
    return ['/panel/mail'].includes(location.pathname);
  }

  get isCustomersNavShow() {
    const routes = ['/panel/transactions'];
    return routes.includes(location.pathname);
  }

  get activeCustomer() {
    return ['/panel/transactions'].includes(location.pathname);
  }

  get isPaymentModeNavShow() {
    const routes = ['/panel/payment_modes', '/panel/add_payment_mode','/panel/manual_invoice_payment'];
    return routes.includes(location.pathname);
  }

  get activePaymentMode() {
    return ['/panel/payment_modes', '/panel/add_payment_mode'].includes(
      location.pathname
    );
  }

  get isPaymentMethodNavShow() {
    const routes = ['/panel/payment_methods'];
    return routes.includes(location.pathname);
  }

  get isCustomerMangementNavShow() {
    const routes = [
      '/panel/online_payment',
      '/panel/bank_transfer',
      '/panel/cheque_deposit',
      '/panel/cash_deposit',
      '/panel/card_machine',
      '/panel/cash_counter',
      '/panel/manual_invoice_payment',
    ];
    return routes.includes(location.pathname);
  }

  get activeCustomerMangement() {
    return [
      '/panel/online_payment',
      '/panel/bank_transfer',
      '/panel/cheque_deposit',
      '/panel/cash_deposit',
      '/panel/card_machine',
      '/panel/cash_counter',
      '/panel/manual_invoice_payment',
    ].includes(location.pathname);
  }

  downloadLogs() {
    this.userService.downloadLogs().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vz-audit-logs.log';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err: any) => {
        console.error('Error downloading logs:', err);
        alert('Error downloading logs');
      },
      complete: () => { }
    });
  }
}

