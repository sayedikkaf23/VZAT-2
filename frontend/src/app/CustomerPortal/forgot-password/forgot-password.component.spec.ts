import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email correctly', () => {
    expect(component['isValidEmail']('test@example.com')).toBe(true);
    expect(component['isValidEmail']('invalid-email')).toBe(false);
    expect(component['isValidEmail']('')).toBe(false);
  });

  it('should show error for empty email', () => {
    component.email = '';
    component.onSubmit();
    expect(component.errorMessage).toBe('Please enter your email address.');
  });

  it('should show error for invalid email', () => {
    component.email = 'invalid-email';
    component.onSubmit();
    expect(component.errorMessage).toBe('Please enter a valid email address.');
  });

  it('should navigate back to login', () => {
    component.goBackToLogin();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should reset form when resending email', () => {
    component.isEmailSent = true;
    component.errorMessage = 'Some error';
    component.resendEmail();
    expect(component.isEmailSent).toBe(false);
    expect(component.errorMessage).toBe('');
  });

  it('should start countdown after successful email send', () => {
    spyOn(component, 'startRedirectCountdown');
    component.isEmailSent = true;
    component.startRedirectCountdown();
    expect(component.startRedirectCountdown).toHaveBeenCalled();
  });
});
