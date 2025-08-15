/**
 * Frontend Component Tests for Add Card
 * Tests the Angular component and service integration
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AddCardComponent } from './add-card.component';
import { AddCardService } from './add-card.service';

describe('AddCardComponent', () => {
  let component: AddCardComponent;
  let fixture: ComponentFixture<AddCardComponent>;
  let service: AddCardService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [AddCardComponent],
      imports: [HttpClientTestingModule],
      providers: [
        AddCardService,
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddCardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(AddCardService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct default values', () => {
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.customerEmail).toBe('');
      expect(component.checkoutId).toBe('');
      expect(component.registrationId).toBe('');
    });

    it('should get customer email from localStorage on init', () => {
      spyOn(localStorage, 'getItem').and.returnValue('test@example.com');
      
      component.ngOnInit();
      
      expect(component.customerEmail).toBe('test@example.com');
    });

    it('should handle missing customer email gracefully', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      
      component.ngOnInit();
      
      expect(component.customerEmail).toBe('');
      expect(component.errorMessage).toContain('Customer email not found');
    });
  });

  describe('AFS Script Loading', () => {
    it('should load AFS script dynamically', async () => {
      const mockScript = document.createElement('script');
      spyOn(document, 'createElement').and.returnValue(mockScript);
      spyOn(document.head, 'appendChild');

      await component.loadAFSScript();

      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toContain('oppwa.js');
      expect(document.head.appendChild).toHaveBeenCalledWith(mockScript);
    });

    it('should handle script loading errors', async () => {
      const mockScript = document.createElement('script');
      spyOn(document, 'createElement').and.returnValue(mockScript);
      spyOn(document.head, 'appendChild').and.callFake(() => {
        setTimeout(() => mockScript.onerror && mockScript.onerror({} as Event), 0);
      });

      try {
        await component.loadAFSScript();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Card Registration Process', () => {
    beforeEach(() => {
      component.customerEmail = 'test@example.com';
    });

    it('should prepare registration successfully', async () => {
      const mockResponse = {
        success: true,
        checkoutId: 'test-checkout-id',
        registrationId: 'test-registration-id'
      };

      spyOn(service, 'prepareRegistration').and.returnValue(of(mockResponse));

      await component.prepareRegistration();

      expect(component.checkoutId).toBe('test-checkout-id');
      expect(component.registrationId).toBe('test-registration-id');
      expect(component.errorMessage).toBe('');
    });

    it('should handle registration preparation errors', async () => {
      const mockError = { error: { message: 'Registration failed' } };
      
      spyOn(service, 'prepareRegistration').and.returnValue(throwError(mockError));

      await component.prepareRegistration();

      expect(component.errorMessage).toContain('Registration failed');
      expect(component.checkoutId).toBe('');
      expect(component.registrationId).toBe('');
    });

    it('should show loading state during registration', async () => {
      spyOn(service, 'prepareRegistration').and.returnValue(of({ success: true }));

      const preparePromise = component.prepareRegistration();
      
      expect(component.isLoading).toBe(true);
      
      await preparePromise;
      
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Payment Form Integration', () => {
    beforeEach(() => {
      component.checkoutId = 'test-checkout-id';
      component.registrationId = 'test-registration-id';
      
      // Mock wpwlOptions global
      (window as any).wpwlOptions = {};
    });

    it('should initialize payment form with correct options', () => {
      component.initializePaymentForm();

      expect((window as any).wpwlOptions.onReady).toBeDefined();
      expect((window as any).wpwlOptions.onError).toBeDefined();
      expect((window as any).wpwlOptions.style).toBeDefined();
    });

    it('should handle form ready event', () => {
      spyOn(component, 'onFormReady');
      
      component.initializePaymentForm();
      (window as any).wpwlOptions.onReady();

      expect(component.onFormReady).toHaveBeenCalled();
    });

    it('should handle form error event', () => {
      spyOn(component, 'onFormError');
      const mockError = { message: 'Form validation failed' };
      
      component.initializePaymentForm();
      (window as any).wpwlOptions.onError(mockError);

      expect(component.onFormError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('Registration Callback Handling', () => {
    beforeEach(() => {
      component.customerEmail = 'test@example.com';
      component.registrationId = 'test-registration-id';
      component.checkoutId = 'test-checkout-id';
    });

    it('should handle successful registration callback', async () => {
      const mockResponse = {
        success: true,
        message: 'Card registered successfully and 2 subscription(s) updated to use new card'
      };

      spyOn(service, 'handleRegistrationCallback').and.returnValue(of(mockResponse));

      await component.handleRegistrationCallback('/test/resource/path');

      expect(component.errorMessage).toBe('');
      expect(router.navigate).toHaveBeenCalledWith(['/customer/saved-cards']);
    });

    it('should handle registration callback errors', async () => {
      const mockError = { error: { message: 'Invalid registration' } };
      
      spyOn(service, 'handleRegistrationCallback').and.returnValue(throwError(mockError));

      await component.handleRegistrationCallback('/test/resource/path');

      expect(component.errorMessage).toContain('Invalid registration');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show loading state during callback processing', async () => {
      spyOn(service, 'handleRegistrationCallback').and.returnValue(of({ success: true }));

      const callbackPromise = component.handleRegistrationCallback('/test/resource/path');
      
      expect(component.isLoading).toBe(true);
      
      await callbackPromise;
      
      expect(component.isLoading).toBe(false);
    });
  });

  describe('User Interactions', () => {
    it('should navigate back when cancel button clicked', () => {
      component.goBack();
      
      expect(router.navigate).toHaveBeenCalledWith(['/customer/saved-cards']);
    });

    it('should clear error message when user starts new action', async () => {
      component.errorMessage = 'Previous error';
      component.customerEmail = 'test@example.com';
      
      spyOn(service, 'prepareRegistration').and.returnValue(of({ success: true }));

      await component.prepareRegistration();

      expect(component.errorMessage).toBe('');
    });

    it('should disable submit button during loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(submitButton?.disabled).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should validate customer email before registration', async () => {
      component.customerEmail = '';
      
      await component.prepareRegistration();

      expect(component.errorMessage).toContain('Customer email not found');
      expect(service.prepareRegistration).not.toHaveBeenCalled();
    });

    it('should validate required fields before callback', async () => {
      component.customerEmail = 'test@example.com';
      component.registrationId = '';
      
      await component.handleRegistrationCallback('/test/resource/path');

      expect(component.errorMessage).toContain('Registration ID is required');
      expect(service.handleRegistrationCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display user-friendly error messages', async () => {
      const mockError = { 
        error: { 
          message: 'Network error occurred',
          details: 'Connection timeout' 
        } 
      };
      
      spyOn(service, 'prepareRegistration').and.returnValue(throwError(mockError));
      component.customerEmail = 'test@example.com';

      await component.prepareRegistration();

      expect(component.errorMessage).toContain('Network error occurred');
      expect(component.isLoading).toBe(false);
    });

    it('should handle unknown errors gracefully', async () => {
      spyOn(service, 'prepareRegistration').and.returnValue(throwError('Unknown error'));
      component.customerEmail = 'test@example.com';

      await component.prepareRegistration();

      expect(component.errorMessage).toContain('An unexpected error occurred');
    });
  });

  describe('Security Features', () => {
    it('should not expose sensitive data in error messages', async () => {
      const mockError = { 
        error: { 
          message: 'Database connection failed',
          query: 'SELECT * FROM credit_cards WHERE...',
          apiKey: 'secret-key-123'
        } 
      };
      
      spyOn(service, 'prepareRegistration').and.returnValue(throwError(mockError));
      component.customerEmail = 'test@example.com';

      await component.prepareRegistration();

      expect(component.errorMessage).not.toContain('secret-key');
      expect(component.errorMessage).not.toContain('SELECT');
    });

    it('should clear sensitive data on component destroy', () => {
      component.checkoutId = 'sensitive-checkout-id';
      component.registrationId = 'sensitive-registration-id';

      component.ngOnDestroy();

      expect(component.checkoutId).toBe('');
      expect(component.registrationId).toBe('');
    });
  });
});
