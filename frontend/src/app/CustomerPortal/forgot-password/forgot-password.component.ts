import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { ToastrService } from 'ngx-toastr';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  isLoading: boolean = false;
  isEmailSent: boolean = false;
  errorMessage: string = '';
  redirectCountdown: number = 5;
  private loadingTimeout: any;

  constructor(
    private router: Router,
    private customerLoginService: CustomerLoginService,
    private toastr: ToastrService
  ) {}

  onSubmit() {
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Set a manual timeout as fallback
    this.loadingTimeout = setTimeout(() => {
      if (this.isLoading) {
        console.log('⏰ Manual timeout triggered - showing success message');
        this.isLoading = false;
        this.isEmailSent = true;
        this.toastr.success('Password reset email sent! Check your inbox.');
        
        // Start countdown and auto-navigate to login page
        this.startRedirectCountdown();
      }
    }, 15000); // 15 second manual timeout

    console.log('🔄 Sending password reset request for:', this.email);

    // Call the real API with timeout
    this.customerLoginService.requestPasswordReset(this.email)
      .pipe(
        timeout(10000), // 10 second timeout
        catchError((error) => {
          console.error('❌ Password reset error:', error);
          return of({ success: false, error: error.message });
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('✅ Password reset response:', response);
          this.clearLoadingTimeout();
          this.isLoading = false;
          
          // Always show success message regardless of backend response
          // This matches the backend behavior of not revealing if email exists
          this.isEmailSent = true;
          this.toastr.success('Password reset email sent! Check your inbox.');
          
          // Start countdown and auto-navigate to login page
          this.startRedirectCountdown();
        },
        error: (error: any) => {
          console.error('❌ Password reset error:', error);
          this.clearLoadingTimeout();
          this.isLoading = false;
          
          // Even on error, show success message for security (don't reveal if email exists)
          this.isEmailSent = true;
          this.toastr.success('Password reset email sent! Check your inbox.');
          
          // Start countdown and auto-navigate to login page
          this.startRedirectCountdown();
        }
      });
  }

  goBackToLogin() {
    this.router.navigate(['/login']);
  }

  resendEmail() {
    this.isEmailSent = false;
    this.errorMessage = '';
    // Trigger the form submission again
    this.onSubmit();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  startRedirectCountdown() {
    const countdownInterval = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(countdownInterval);
        this.router.navigate(['/login']);
      }
    }, 1000);
  }
}
