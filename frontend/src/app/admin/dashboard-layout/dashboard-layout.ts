import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Often needed for standalone components
import { RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { User } from '../../services/user';
import { NgxPermissionsService, NgxPermissionsModule  } from 'ngx-permissions';
import { Header } from '../header/header';
import { Footer} from '../footer/footer';
import { StyleLoader} from '../../services/style-loader';

@Component({
  selector: 'app-dashboard-layout',
  imports: [CommonModule,RouterLink, RouterOutlet, Header, Footer, NgxPermissionsModule ],
  standalone: true,
  templateUrl: './dashboard-layout.html',
  styleUrls: ['./dashboard-layout.scss']
})
export class DashboardLayout {
    private themeUrls = [
    'assets/css/admin-theme.css',
    'assets/css/style-admin.css',
    'assets/css/responsive-admin.css'
  ];
  permissions: any = [];
  loading = true; 

  constructor(
    public authSvc: Auth,
    private router: Router,
    private userService: User,
    private permissionsService: NgxPermissionsService,
    private styleLoader: StyleLoader
  ) { }

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
    const token = this.authSvc.token;
    // if (!token) {
    //   localStorage.clear();
    //   // Swal.fire('Error', 'Please Login Again!', 'error');
    //   this.router.navigate(['/admin/login']);
    // } else {
    //   this.getUserPermissions();
    // }
  }

  getUserPermissions() {
    this.userService.getUserPermissions().subscribe({
      next: (res: any) => {
        localStorage.setItem('user_name', res?.data?.user_name);
        this.userService.roleName = res?.data?.role_id?.role_name;
        this.permissions = res?.data?.role_id?.permissions;
        this.permissionsService.loadPermissions(this.permissions);
      },
      error: (err) => {
        this.permissions = [];
      },
      complete: () => { },
    });
  }

  toggleSideBar() {
    const bodyElement = document.body;
    if (!bodyElement.classList.contains('sidebar-collapsein')) {
      bodyElement.classList.add('sidebar-collapsein');
    } else {
      bodyElement.classList.remove('sidebar-collapsein');
    }
  }

  get activeSetting() {
    return [
      '/panel/add_user',
      '/panel/users',
      '/panel/add_role',
      '/panel/roles',
      '/panel/settings',
      '/panel/accounts',
      '/panel/mail',
    ].includes(location.pathname);
  }

  get activeCustomerManagement() {
    return [
      '/panel/online_payment',
      '/panel/bank_transfer',
      '/panel/cheque_deposit',
      '/panel/cash_deposit',
      '/panel/card_machine',
      '/panel/cash_counter',
    ].includes(location.pathname);
  }

      ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
