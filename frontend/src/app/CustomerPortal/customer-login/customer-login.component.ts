import {
  Component,
  Inject,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
//import { isPlatformBrowser, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { ToastrService } from 'ngx-toastr';
import { CookieService } from 'ngx-cookie-service';
import { StyleLoader } from '../../services/style-loader';

@Component({
  selector: 'app-customer-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './customer-login.component.html',
  styleUrl: './customer-login.component.scss',
})
export class CustomerLoginComponent {
  loading = true;
  private themeUrls = [
    'assets/CustomerPortal/css/style.css',
    'assets/CustomerPortal/css/responsive.css',
  ];

  passwordVisible: boolean = false;
  showForgotPassword: boolean = false;
  forgotPasswordEmail: string = '';
  passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\(\)+\\;:'",.<>\/?=_\{\}\[\]\|\-]).{8,}$/;
  loginDetails = {
    email: '',
    password: '',
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private router: Router,
    private customerLoginService: CustomerLoginService,
    private toastr: ToastrService,
    private cookieService: CookieService,
    private styleLoader: StyleLoader
  ) {}

  ngOnInit(): void {
    this.styleLoader
      .loadThemes(this.themeUrls)
      .then(() => {
        // Styles loaded, show content
        this.loading = false;
      })
      .catch((err) => {
        console.error(err);
        this.loading = false; // Show anyway if failed
      });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  showForgotPasswordForm(): void {
    this.showForgotPassword = true;
    this.forgotPasswordEmail = this.loginDetails.email; // Pre-fill with login email if available
  }

  hideForgotPasswordForm(): void {
    this.showForgotPassword = false;
    this.forgotPasswordEmail = '';
  }

  sendPasswordReset(): void {
    if (!this.forgotPasswordEmail || !this.forgotPasswordEmail.includes('@')) {
      this.toastr.error('Please enter a valid email address');
      return;
    }

    this.customerLoginService
      .requestPasswordReset(this.forgotPasswordEmail)
      .subscribe({
        next: (res: any) => {
          if (res.success) {
            this.toastr.success('Password reset link sent! Check your email.');
            this.hideForgotPasswordForm();
          } else {
            this.toastr.error(
              res.message || 'Failed to send password reset email'
            );
          }
        },
        error: (err: any) => {
          console.error('Password reset error:', err);
          this.toastr.error(
            'Error sending password reset email. Please try again.'
          );
        },
      });
  }

  //console.log(loginDetails);

  login(data: any): void {
    console.log('hi');
    console.log('Login data:', this.loginDetails);
    if (this.loginDetails.email != '' && this.loginDetails.password != '') {
      this.customerLoginService.loggingIn(this.loginDetails).subscribe({
        next: (res: any) => {
          console.log(res);
          if (res.loggedIn ***REMOVED*** 1) {
            this.cookieService.set('jwtToken', res.token);

            // Store customer data for other components
            if (res.customer) {
              localStorage.setItem(
                'customerData',
                JSON.stringify(res.customer)
              );
            }

            console.log('Logged In');

            // Check if there's a redirect parameter
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');

            if (redirect ***REMOVED***= 'saved-card') {
              this.router.navigate(['/saved-card']);
            } else {
              this.router.navigate(['/active-services']); //set the navigation path for customer, after logging in
            }
          } else {
            this.toastr.error(res.message || 'Invalid email or password');
          }
        },
        error: (err: any) => {
          console.error('Login error:', err);
          this.toastr.error(
            err?.error?.message ||
              'Invalid email or password. Please try again.'
          );
        },
      });
    } else {
      this.toastr.error('Both Email and password are required to login');
    }
  }

  ngOnDestroy(): void {
    this.styleLoader.removeThemes(this.themeUrls);
  }
}
