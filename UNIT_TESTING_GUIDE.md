# VZAT-2 Unit Testing Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Testing Strategy](#testing-strategy)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [Test Setup & Configuration](#test-setup--configuration)
6. [Test Data Management](#test-data-management)
7. [Integration Testing](#integration-testing)
8. [End-to-End Testing](#end-to-end-testing)
9. [CI/CD Integration](#cicd-integration)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## 🏗️ Project Overview

**VZAT-2** is a subscription management and payment processing system consisting of:

### Backend (Node.js/Express)
- **API**: RESTful services for subscription management
- **Database**: MongoDB with Mongoose ODM
- **Payment Processing**: AFS (Arab Financial Services) integration
- **Email Service**: Nodemailer for notifications
- **Cron Jobs**: Scheduled recurring payments
- **Authentication**: JWT-based auth system

### Frontend (Angular)
- **Customer Portal**: Active services, payment schedules, card management
- **Admin Panel**: Subscription management, analytics
- **Payment Widget**: AFS payment integration
- **State Management**: RxJS and Angular services

## 🎯 Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \     <- Few, critical user journeys
     /______\
    /        \
   / Integration \  <- Medium, API and service integration
  /______________\
 /                \
/   Unit Tests     \  <- Many, fast, isolated
/__________________\
```

### Coverage Goals
- **Unit Tests**: 85%+ coverage
- **Integration Tests**: Critical flows
- **E2E Tests**: Core user journeys
- **Performance Tests**: Payment processing

## 🔧 Backend Testing

### Test Structure
```
backend/
├── test/
│   ├── setup.js                 # Global test configuration
│   ├── teardown.js              # Test cleanup
│   ├── fixtures/                # Test data
│   ├── mocks/                   # Service mocks
│   ├── unit/                    # Unit tests
│   │   ├── controllers/         # Controller tests
│   │   ├── models/              # Model tests
│   │   ├── services/            # Service tests
│   │   └── utils/               # Utility tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
└── jest.config.js               # Jest configuration
```

### 1. Controller Testing

#### Example: SubscriptionController.test.js
```javascript
import { jest } from '@jest/globals';
import { SubscriptionController } from '../../Controllers/SubscriptionController.js';
import Vzat_Recurring_Data from '../../model/VzatRecurringDataModel.js';

// Mock dependencies
jest.mock('../../model/VzatRecurringDataModel.js');
jest.mock('../../services/emailService.js');
jest.mock('axios');

describe('SubscriptionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processRecurringPayments', () => {
    test('should process active subscriptions successfully', async () => {
      // Arrange
      const mockSubscriptions = [
        {
          _id: 'sub1',
          quotepaymentId: 'payment1',
          payments_completed: 2,
          InstallmentLeft: 4,
          Total_After_VAT_Currency: 1000,
          subscription_status: 'active'
        }
      ];
      
      Vzat_Recurring_Data.find.mockResolvedValue(mockSubscriptions);
      
      // Act
      const result = await SubscriptionController.processRecurringPayments();
      
      // Assert
      expect(result).toBeDefined();
      expect(Vzat_Recurring_Data.find).toHaveBeenCalledWith({
        is_subscription: true,
        subscription_status: 'active',
        next_charge_date: { $lte: expect.any(Date) }
      });
    });

    test('should handle payment failures with retry logic', async () => {
      // Arrange
      const mockSubscription = {
        _id: 'sub1',
        payment_retry_count: 2,
        payments_completed: 1,
        payment_schedule: [
          { installment_number: 2, status: 'due' },
          { installment_number: 3, status: 'pending' }
        ]
      };

      // Mock payment failure
      jest.doMock('../../services/paymentService.js', () => ({
        processPayment: jest.fn().mockRejectedValue(new Error('Payment failed'))
      }));

      // Act & Assert
      await expect(processSubscriptionPayment(mockSubscription))
        .rejects.toThrow('Payment failed');
    });
  });

  describe('getCustomerDefaultCard', () => {
    test('should return default active card', async () => {
      // Arrange
      const mockCustomer = { _id: 'customer1', email: 'test@example.com' };
      const mockCard = {
        _id: 'card1',
        customerId: 'customer1',
        isDefault: true,
        isActive: true,
        afs_registration_id: 'reg123'
      };

      Customer.findOne.mockResolvedValue(mockCustomer);
      SavedCard.findOne.mockResolvedValue(mockCard);

      // Act
      const result = await getCustomerDefaultCard({
        opp_email: 'test@example.com',
        quotepaymentId: 'quote1'
      });

      // Assert
      expect(result).toEqual(mockCard);
      expect(SavedCard.findOne).toHaveBeenCalledWith({
        customerId: 'customer1',
        isActive: true,
        isDefault: true
      });
    });
  });
});
```

### 2. Model Testing

#### Example: VzatRecurringDataModel.test.js
```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Vzat_Recurring_Data from '../../model/VzatRecurringDataModel.js';

describe('VzatRecurringDataModel', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Vzat_Recurring_Data.deleteMany({});
  });

  test('should create subscription with valid data', async () => {
    // Arrange
    const subscriptionData = {
      quotepaymentId: 'quote123',
      opp_email: 'test@example.com',
      Customer_name: 'John Doe',
      Total_After_VAT_Currency: 1000,
      InstallmentLeft: 4,
      is_subscription: true,
      subscription_status: 'active',
      payment_schedule: [
        {
          installment_number: 1,
          due_date: new Date(),
          amount: 250,
          status: 'completed'
        }
      ]
    };

    // Act
    const subscription = new Vzat_Recurring_Data(subscriptionData);
    const savedSubscription = await subscription.save();

    // Assert
    expect(savedSubscription._id).toBeDefined();
    expect(savedSubscription.quotepaymentId).toBe('quote123');
    expect(savedSubscription.payment_schedule).toHaveLength(1);
  });

  test('should validate required fields', async () => {
    // Arrange
    const invalidData = {
      opp_email: 'test@example.com'
      // Missing required fields
    };

    // Act & Assert
    await expect(Vzat_Recurring_Data.create(invalidData))
      .rejects.toThrow(mongoose.Error.ValidationError);
  });
});
```

### 3. Service Testing

#### Example: emailService.test.js
```javascript
import { emailService } from '../../services/emailService.js';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn()
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  test('should send payment success email', async () => {
    // Arrange
    const emailData = {
      to: 'customer@example.com',
      customerName: 'John Doe',
      amount: 250,
      installmentNumber: 2,
      transactionId: 'tx123'
    };

    mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg123' });

    // Act
    const result = await emailService.sendPaymentSuccessEmail(emailData);

    // Assert
    expect(result.success).toBe(true);
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: expect.stringContaining('Payment Successful')
      })
    );
  });
});
```

### 4. Route Testing

#### Example: SubscriptionRoute.test.js
```javascript
import request from 'supertest';
import express from 'express';
import subscriptionRoutes from '../../routes/SubscriptionRoute.js';

const app = express();
app.use(express.json());
app.use('/api/subscriptions', subscriptionRoutes);

describe('Subscription Routes', () => {
  test('GET /api/subscriptions should return active subscriptions', async () => {
    // Act
    const response = await request(app)
      .get('/api/subscriptions')
      .query({ status: 'active' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.subscriptions)).toBe(true);
  });

  test('POST /api/subscriptions/retry should retry failed payment', async () => {
    // Arrange
    const retryData = {
      quotepaymentId: 'quote123',
      installmentNumber: 2
    };

    // Act
    const response = await request(app)
      .post('/api/subscriptions/retry')
      .send(retryData);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 🅰️ Frontend Testing

### Test Structure
```
frontend/src/
├── app/
│   ├── services/
│   │   └── *.service.spec.ts    # Service tests
│   ├── components/
│   │   └── */
│   │       └── *.component.spec.ts  # Component tests
│   ├── guards/
│   │   └── *.guard.spec.ts      # Guard tests
│   └── pipes/
│       └── *.pipe.spec.ts       # Pipe tests
├── test-utils/                  # Test utilities
└── karma.conf.js                # Karma configuration
```

### 1. Service Testing

#### Example: SubscriptionService.spec.ts
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SubscriptionService]
    });

    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch active subscriptions', () => {
    // Arrange
    const mockSubscriptions = [
      { id: '1', status: 'active', amount: 100 },
      { id: '2', status: 'active', amount: 200 }
    ];

    // Act
    service.getActiveSubscriptions().subscribe(subscriptions => {
      // Assert
      expect(subscriptions).toEqual(mockSubscriptions);
    });

    // Assert HTTP call
    const req = httpMock.expectOne(`${service.apiUrl}/subscriptions?status=active`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, subscriptions: mockSubscriptions });
  });

  it('should retry failed payment', () => {
    // Arrange
    const quotepaymentId = 'quote123';
    const installmentNumber = 2;
    const mockResponse = { success: true, message: 'Payment retried' };

    // Act
    service.retryPayment(quotepaymentId, installmentNumber).subscribe(response => {
      // Assert
      expect(response).toEqual(mockResponse);
    });

    // Assert HTTP call
    const req = httpMock.expectOne(`${service.apiUrl}/subscriptions/retry`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quotepaymentId, installmentNumber });
    req.flush(mockResponse);
  });
});
```

### 2. Component Testing

#### Example: ActiveServicesComponent.spec.ts
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ActiveServicesComponent } from './active-services.component';
import { SubscriptionService } from '../../services/subscription.service';

describe('ActiveServicesComponent', () => {
  let component: ActiveServicesComponent;
  let fixture: ComponentFixture<ActiveServicesComponent>;
  let mockSubscriptionService: jasmine.SpyObj<SubscriptionService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('SubscriptionService', [
      'getActiveSubscriptions',
      'retryPayment',
      'getPaymentSchedule'
    ]);

    await TestBed.configureTestingModule({
      declarations: [ActiveServicesComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: SubscriptionService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveServicesComponent);
    component = fixture.componentInstance;
    mockSubscriptionService = TestBed.inject(SubscriptionService) as jasmine.SpyObj<SubscriptionService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load active subscriptions on init', () => {
    // Arrange
    const mockSubscriptions = [
      { quotepaymentId: 'quote1', status: 'active' },
      { quotepaymentId: 'quote2', status: 'active' }
    ];
    mockSubscriptionService.getActiveSubscriptions.and.returnValue(of({
      success: true,
      services: mockSubscriptions
    }));

    // Act
    component.ngOnInit();

    // Assert
    expect(mockSubscriptionService.getActiveSubscriptions).toHaveBeenCalled();
    expect(component.activeServices).toEqual(mockSubscriptions);
    expect(component.loading).toBe(false);
  });

  it('should handle retry payment success', () => {
    // Arrange
    const quotepaymentId = 'quote123';
    const installmentNumber = 2;
    mockSubscriptionService.retryPayment.and.returnValue(of({
      success: true,
      message: 'Payment retried successfully'
    }));

    // Act
    component.retryPayment(quotepaymentId, installmentNumber);

    // Assert
    expect(mockSubscriptionService.retryPayment).toHaveBeenCalledWith(
      quotepaymentId,
      installmentNumber
    );
    expect(component.retryLoading).toBe(false);
  });

  it('should handle retry payment error', () => {
    // Arrange
    const quotepaymentId = 'quote123';
    const installmentNumber = 2;
    const errorResponse = { error: { message: 'Payment retry failed' } };
    mockSubscriptionService.retryPayment.and.returnValue(throwError(errorResponse));

    spyOn(console, 'error');

    // Act
    component.retryPayment(quotepaymentId, installmentNumber);

    // Assert
    expect(mockSubscriptionService.retryPayment).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(component.retryLoading).toBe(false);
  });

  it('should open payment schedule modal', () => {
    // Arrange
    const mockService = { quotepaymentId: 'quote123' };
    const mockPayments = [
      { installment_number: 1, status: 'completed' },
      { installment_number: 2, status: 'failed' }
    ];
    mockSubscriptionService.getPaymentSchedule.and.returnValue(of(mockPayments));

    // Act
    component.openPaymentScheduleModal(mockService);

    // Assert
    expect(component.selectedService).toBe(mockService);
    expect(component.showModal).toBe(true);
    expect(mockSubscriptionService.getPaymentSchedule).toHaveBeenCalledWith('quote123');
  });
});
```

### 3. Guard Testing

#### Example: AuthGuard.spec.ts
```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access when user is authenticated', () => {
    // Arrange
    mockAuthService.isAuthenticated.and.returnValue(true);

    // Act
    const result = guard.canActivate();

    // Assert
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    // Arrange
    mockAuthService.isAuthenticated.and.returnValue(false);

    // Act
    const result = guard.canActivate();

    // Assert
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
```

## ⚙️ Test Setup & Configuration

### Backend Jest Configuration (jest.config.js)
```javascript
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'Controllers/**/*.js',
    'services/**/*.js',
    'model/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  globalTeardown: '<rootDir>/test/teardown.js',
  transform: {},
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
```

### Backend Test Setup (test/setup.js)
```javascript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.AFS_DOMAIN = 'https://test.afs.com';
  process.env.AFS_ENTITY_ID = 'test-entity';
  process.env.AFS_ACCESS_TOKEN = 'test-token';
});

// Global test teardown
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Mock external services
jest.mock('axios');
jest.mock('nodemailer');
```

### Frontend Karma Configuration (karma.conf.js)
```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        random: true,
        seed: '4321'
      },
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' }
      ],
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
```

## 📊 Test Data Management

### Test Fixtures (test/fixtures/index.js)
```javascript
export const testCustomers = {
  validCustomer: {
    email: 'test@example.com',
    Customer_name: 'John Doe',
    quotepaymentId: 'quote123'
  },
  customerWithCards: {
    email: 'customer.cards@example.com',
    Customer_name: 'Jane Smith',
    quotepaymentId: 'quote456',
    savedCards: [
      {
        afs_registration_id: 'reg123',
        maskedCardNumber: '**** **** **** 1234',
        cardBrand: 'VISA',
        isDefault: true
      }
    ]
  }
};

export const testSubscriptions = {
  activeSubscription: {
    quotepaymentId: 'quote123',
    opp_email: 'test@example.com',
    Customer_name: 'John Doe',
    Total_After_VAT_Currency: 1000,
    InstallmentLeft: 4,
    payments_completed: 2,
    subscription_status: 'active',
    payment_schedule: [
      {
        installment_number: 1,
        due_date: new Date('2024-01-01'),
        amount: 250,
        status: 'completed',
        payment_date: new Date('2024-01-01'),
        transaction_id: 'tx001'
      },
      {
        installment_number: 2,
        due_date: new Date('2024-02-01'),
        amount: 250,
        status: 'completed',
        payment_date: new Date('2024-02-01'),
        transaction_id: 'tx002'
      },
      {
        installment_number: 3,
        due_date: new Date('2024-03-01'),
        amount: 250,
        status: 'failed'
      },
      {
        installment_number: 4,
        due_date: new Date('2024-04-01'),
        amount: 250,
        status: 'pending'
      }
    ]
  }
};

export const testPaymentResponses = {
  successfulPayment: {
    id: 'tx123',
    result: {
      code: '000.100.110',
      description: 'Request successfully processed'
    },
    amount: '250.00',
    currency: 'AED',
    registrationId: 'reg123'
  },
  failedPayment: {
    id: 'tx456',
    result: {
      code: '100.150.204',
      description: 'account registration reference pointed to no registration transaction'
    }
  }
};
```

### Test Utilities (test/utils/index.js)
```javascript
import Vzat_Recurring_Data from '../../model/VzatRecurringDataModel.js';
import CustomerLogin from '../../model/CustomerLoginModel.js';
import SavedCard from '../../model/SavedCardModel.js';

export class TestDataBuilder {
  static async createCustomer(customerData = {}) {
    const defaultData = {
      email: 'test@example.com',
      Customer_name: 'Test Customer',
      quotepaymentId: `quote_${Date.now()}`
    };
    
    const customer = new CustomerLogin({ ...defaultData, ...customerData });
    return await customer.save();
  }

  static async createSubscription(subscriptionData = {}) {
    const defaultData = {
      quotepaymentId: `quote_${Date.now()}`,
      opp_email: 'test@example.com',
      Customer_name: 'Test Customer',
      Total_After_VAT_Currency: 1000,
      InstallmentLeft: 4,
      is_subscription: true,
      subscription_status: 'active'
    };

    const subscription = new Vzat_Recurring_Data({ ...defaultData, ...subscriptionData });
    return await subscription.save();
  }

  static async createSavedCard(cardData = {}) {
    const defaultData = {
      afs_registration_id: `reg_${Date.now()}`,
      maskedCardNumber: '**** **** **** 1234',
      cardBrand: 'VISA',
      isDefault: true,
      isActive: true
    };

    const card = new SavedCard({ ...defaultData, ...cardData });
    return await card.save();
  }
}

export const mockAfsResponse = (success = true) => {
  if (success) {
    return {
      id: 'tx123',
      result: { code: '000.100.110', description: 'Success' },
      registrationId: 'reg123'
    };
  } else {
    return {
      id: 'tx456',
      result: { code: '100.150.204', description: 'Registration not found' }
    };
  }
};
```

## 🔗 Integration Testing

### API Integration Tests
```javascript
import request from 'supertest';
import app from '../../app.js';
import { TestDataBuilder } from '../utils/index.js';

describe('Subscription API Integration', () => {
  let customer;
  let subscription;

  beforeEach(async () => {
    customer = await TestDataBuilder.createCustomer();
    subscription = await TestDataBuilder.createSubscription({
      opp_email: customer.email,
      quotepaymentId: customer.quotepaymentId
    });
  });

  describe('GET /api/subscriptions/active/:email', () => {
    test('should return active subscriptions for customer', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/active/${customer.email}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveLength(1);
      expect(response.body.services[0].quotepaymentId).toBe(subscription.quotepaymentId);
    });
  });

  describe('POST /api/subscriptions/retry', () => {
    test('should retry failed payment successfully', async () => {
      // Arrange - update subscription to have failed payment
      await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
        'payment_schedule.2.status': 'failed',
        payment_retry_count: 1
      });

      // Act
      const response = await request(app)
        .post('/api/subscriptions/retry')
        .send({
          quotepaymentId: subscription.quotepaymentId,
          installmentNumber: 3
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });
  });
});
```

### Database Integration Tests
```javascript
describe('Database Operations', () => {
  test('should handle concurrent subscription updates', async () => {
    // Arrange
    const subscription = await TestDataBuilder.createSubscription();
    
    // Act - Simulate concurrent updates
    const updates = await Promise.allSettled([
      Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, { payments_completed: 3 }),
      Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, { payment_retry_count: 1 }),
      Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, { 'payment_schedule.2.status': 'completed' })
    ]);
    
    // Assert
    updates.forEach(update => {
      expect(update.status).toBe('fulfilled');
    });
    
    const updatedSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    expect(updatedSubscription).toBeDefined();
  });
});
```

## 🎭 End-to-End Testing

### Playwright Configuration (e2e/playwright.config.js)
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: {
    command: 'npm run start',
    port: 4200,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  }
});
```

### E2E Test Example
```javascript
import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/active-services');
  });

  test('should complete payment retry flow', async ({ page }) => {
    // Navigate to active services
    await page.goto('/active-services');
    
    // Find failed payment and retry
    await page.click('[data-testid=payment-schedule-button]');
    await expect(page.locator('[data-testid=payment-modal]')).toBeVisible();
    
    await page.click('[data-testid=retry-payment-button]');
    
    // Wait for success message
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('[data-testid=success-message]'))
      .toContainText('Payment retried successfully');
  });

  test('should display payment schedule correctly', async ({ page }) => {
    await page.goto('/active-services');
    
    // Open payment schedule modal
    await page.click('[data-testid=payment-schedule-button]');
    
    // Verify payment order
    const payments = page.locator('[data-testid=payment-item]');
    await expect(payments).toHaveCount(4);
    
    // Check payment sequence
    await expect(payments.nth(0)).toContainText('Payment 1');
    await expect(payments.nth(1)).toContainText('Payment 2');
    await expect(payments.nth(2)).toContainText('Payment 3');
    await expect(payments.nth(3)).toContainText('Payment 4');
  });
});
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow (.github/workflows/test.yml)
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:4.4
        ports:
          - 27017:27017
        
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
          
      - name: Install backend dependencies
        run: |
          cd backend
          npm ci
          
      - name: Run backend tests
        run: |
          cd backend
          npm test -- --coverage --watchAll=false
        env:
          NODE_ENV: test
          
      - name: Upload backend coverage
        uses: codecov/codecov-action@v3
        with:
          directory: backend/coverage
          flags: backend

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run frontend tests
        run: |
          cd frontend
          npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage
          
      - name: Upload frontend coverage
        uses: codecov/codecov-action@v3
        with:
          directory: frontend/coverage
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
          
      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps
          
      - name: Start services
        run: |
          cd backend && npm start &
          cd frontend && npm start &
          sleep 30
          
      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test
          
      - name: Upload E2E results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## 📋 Best Practices

### 1. Test Organization
- **Descriptive Names**: Use clear, descriptive test names
- **Arrange-Act-Assert**: Follow the AAA pattern consistently
- **Single Responsibility**: Each test should verify one behavior
- **Test Isolation**: Tests should not depend on each other

### 2. Mocking Strategy
```javascript
// Good - Mock external dependencies
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn()
}));

// Good - Mock only what you need
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true })
};

// Avoid - Don't mock too much internal logic
```

### 3. Test Data Management
```javascript
// Good - Use builders for complex data
const subscription = new SubscriptionBuilder()
  .withStatus('active')
  .withPayments(3)
  .withFailedPayment(2)
  .build();

// Good - Use realistic test data
const testCard = {
  number: '4200000000000000', // Valid test card
  expiry: '12/25',
  cvv: '123'
};
```

### 4. Async Testing
```javascript
// Good - Properly handle async operations
test('should process payment successfully', async () => {
  const result = await paymentService.processPayment(paymentData);
  expect(result.success).toBe(true);
});

// Good - Test error scenarios
test('should handle payment failures', async () => {
  mockPaymentGateway.processPayment.mockRejectedValue(new Error('Payment failed'));
  
  await expect(paymentService.processPayment(paymentData))
    .rejects.toThrow('Payment failed');
});
```

### 5. Frontend Testing Best Practices
```typescript
// Good - Test user interactions
it('should open modal when button clicked', () => {
  const button = fixture.debugElement.query(By.css('[data-testid=open-modal]'));
  button.nativeElement.click();
  
  expect(component.showModal).toBe(true);
});

// Good - Test component outputs
it('should emit event when form submitted', () => {
  spyOn(component.formSubmit, 'emit');
  
  component.onSubmit();
  
  expect(component.formSubmit.emit).toHaveBeenCalledWith(expectedData);
});
```

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```javascript
// Problem: Tests hanging on database operations
// Solution: Ensure proper setup/teardown
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI_TEST);
});

afterAll(async () => {
  await mongoose.connection.close();
});
```

#### 2. Mock Conflicts
```javascript
// Problem: Mocks not working correctly
// Solution: Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 3. Async Test Failures
```javascript
// Problem: Tests failing intermittently
// Solution: Properly wait for async operations
test('should update data', async () => {
  await act(async () => {
    await component.updateData();
  });
  
  expect(component.data).toEqual(expectedData);
});
```

#### 4. Memory Leaks in Tests
```javascript
// Problem: Tests consuming too much memory
// Solution: Clean up resources
afterEach(async () => {
  // Clear database
  await TestDatabase.clearAll();
  
  // Clear timers
  jest.clearAllTimers();
  
  // Clear HTTP mocks
  httpMock.clear();
});
```

### Debug Tips

1. **Use console.log sparingly** in tests
2. **Check test isolation** - run tests individually
3. **Verify mock setup** - ensure mocks are configured correctly
4. **Check async handling** - use proper async/await patterns
5. **Review test data** - ensure test data matches expectations

## 📊 Running Tests

### Backend Tests
```bash
# Install dependencies
cd backend
npm install --save-dev jest supertest mongodb-memory-server

# Run all tests
npm test

# Run specific test file
npm test -- SubscriptionController.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run tests matching pattern
npm test -- --testNamePattern="payment"
```

### Frontend Tests
```bash
# Install dependencies
cd frontend
npm install

# Run all tests
ng test

# Run in headless mode
ng test --browsers=ChromeHeadless --watch=false

# Run with coverage
ng test --code-coverage

# Run specific test
ng test --include="**/subscription.service.spec.ts"
```

### E2E Tests
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test payment-flow.spec.js
```

## 📈 Test Metrics

Track these key metrics:

- **Coverage**: Aim for 85%+ line coverage
- **Performance**: API responses < 200ms
- **Reliability**: <1% test flakiness
- **Maintainability**: Tests updated with code changes

## 🎯 Success Criteria

Your testing is successful when:

- ✅ All tests pass consistently
- ✅ Coverage meets minimum thresholds
- ✅ Tests run in reasonable time (<5 minutes)
- ✅ Critical user journeys are covered
- ✅ Error scenarios are tested
- ✅ Performance requirements are met

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

Remember: **Good tests are an investment in code quality and developer confidence!** 🚀
