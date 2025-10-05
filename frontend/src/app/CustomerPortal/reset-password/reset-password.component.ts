import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerLoginService } from '../../services/customer-login.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  email: string = '';
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  isSuccess: boolean = false;
  isPasswordValid: boolean = false;
  isPasswordMatch: boolean = false;
  redirectCountdown: number = 3;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\(\)+\\;:'",.<>\/?=_\{\}\[\]\|\-]).{8,}$/;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private customerLoginService: CustomerLoginService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Get token and email from URL parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      
      if (!this.token || !this.email) {
        this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  onSubmit() {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all password fields.';
      return;
    }

    if (!this.passwordPattern.test(this.newPassword)) {
      this.errorMessage = 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character.';
      return;
    }

    if (this.newPassword !***REMOVED*** this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Call the reset password API
    this.customerLoginService.resetPassword(this.email, this.token, this.newPassword).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.isSuccess = true;
          this.toastr.success('Password reset successfully! Redirecting to login...');
          
          // Start countdown and auto-navigate to login page
          this.startRedirectCountdown();
        } else {
          this.errorMessage = response.message || 'Failed to reset password.';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Password reset error:', error);
        this.errorMessage = 'Error resetting password. Please try again or request a new reset link.';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  requestNewReset() {
    this.router.navigate(['/forgot-password']);
  }

  validatePassword() {
    this.isPasswordValid = this.passwordPattern.test(this.newPassword);
    this.validatePasswordMatch();
  }

  validatePasswordMatch() {
    this.isPasswordMatch = this.newPassword ***REMOVED***= this.confirmPassword && this.confirmPassword.length > 0;
  }

  isFormValid(): boolean {
    return this.newPassword.length > 0 && 
           this.confirmPassword.length > 0 && 
           this.isPasswordValid && 
           this.isPasswordMatch;
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

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
