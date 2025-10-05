import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ResetPasswordComponent } from './reset-password.component';
import { CustomerLoginService } from '../../services/customer-login.service';
import { ToastrService } from 'ngx-toastr';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockCustomerLoginService: jasmine.SpyObj<CustomerLoginService>;
  let mockToastr: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      queryParams: of({ token: 'test-token', email: 'test@example.com' })
    };
    mockCustomerLoginService = jasmine.createSpyObj('CustomerLoginService', ['resetPassword']);
    mockToastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: CustomerLoginService, useValue: mockCustomerLoginService },
        { provide: ToastrService, useValue: mockToastr }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with token and email from query params', () => {
    expect(component.token).toBe('test-token');
    expect(component.email).toBe('test@example.com');
  });

  it('should show error for empty passwords', () => {
    component.newPassword = '';
    component.confirmPassword = '';
    component.onSubmit();
    expect(component.errorMessage).toBe('Please fill in all password fields.');
  });

  it('should show error for invalid password pattern', () => {
    component.newPassword = 'weak';
    component.confirmPassword = 'weak';
    component.onSubmit();
    expect(component.errorMessage).toBe('Password must contain at least 8 characters with uppercase, lowercase, number, and special character.');
  });

  it('should show error for mismatched passwords', () => {
    component.newPassword = 'ValidPass123!';
    component.confirmPassword = 'DifferentPass123!';
    component.onSubmit();
    expect(component.errorMessage).toBe('Passwords do not match.');
  });

  it('should navigate to login on success', () => {
    component.isSuccess = true;
    component.goToLogin();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should validate password pattern correctly', () => {
    component.newPassword = 'weak';
    component.validatePassword();
    expect(component.isPasswordValid).toBeFalse();

    component.newPassword = 'ValidPass123!';
    component.validatePassword();
    expect(component.isPasswordValid).toBeTrue();
  });

  it('should validate password matching correctly', () => {
    component.newPassword = 'ValidPass123!';
    component.confirmPassword = 'DifferentPass123!';
    component.validatePasswordMatch();
    expect(component.isPasswordMatch).toBeFalse();

    component.confirmPassword = 'ValidPass123!';
    component.validatePasswordMatch();
    expect(component.isPasswordMatch).toBeTrue();
  });

  it('should validate form correctly', () => {
    component.newPassword = '';
    component.confirmPassword = '';
    expect(component.isFormValid()).toBeFalse();

    component.newPassword = 'ValidPass123!';
    component.confirmPassword = 'ValidPass123!';
    component.validatePassword();
    expect(component.isFormValid()).toBeTrue();
  });

  it('should toggle password visibility', () => {
    expect(component.showNewPassword).toBeFalse();
    expect(component.showConfirmPassword).toBeFalse();
    
    component.toggleNewPasswordVisibility();
    expect(component.showNewPassword).toBeTrue();
    
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword).toBeTrue();
  });
});
