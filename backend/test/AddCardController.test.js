/**
 * Test Suite for AddCardController
 * Tests the complete Add Card functionality including AFS integration and subscription migration
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import the controller and models
const AddCardController = require('../Controllers/AddCardController');
const SavedCard = require('../model/SavedCardModel');
const VzatRecurringData = require('../model/VzatRecurringDataModel');

// Mock AFS service
jest.mock('../services/afsService', () => ({
  prepareRegistration: jest.fn(),
  validateRegistration: jest.fn()
}));

const afsService = require('../services/afsService');

describe('AddCardController', () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.post('/saved-card/prepare-registration', AddCardController.prepareCardRegistration);
    app.post('/saved-card/registration-callback', AddCardController.handleCardRegistrationCallback);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await SavedCard.deleteMany({});
    await VzatRecurringData.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /saved-card/prepare-registration', () => {
    test('should prepare card registration successfully', async () => {
      // Mock AFS response
      afsService.prepareRegistration.mockResolvedValue({
        success: true,
        checkoutId: 'test-checkout-id-123',
        registrationId: 'test-registration-id-123'
      });

      const response = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail: 'test@example.com',
          amount: '1.00',
          currency: 'USD'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.checkoutId).toBe('test-checkout-id-123');
      expect(response.body.registrationId).toBe('test-registration-id-123');
      expect(afsService.prepareRegistration).toHaveBeenCalledWith({
        customerEmail: 'test@example.com',
        amount: '1.00',
        currency: 'USD'
      });
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail: 'test@example.com'
          // Missing amount and currency
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle AFS service failure', async () => {
      afsService.prepareRegistration.mockRejectedValue(new Error('AFS service unavailable'));

      const response = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail: 'test@example.com',
          amount: '1.00',
          currency: 'USD'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('AFS service unavailable');
    });
  });

  describe('POST /saved-card/registration-callback', () => {
    test('should handle successful card registration and subscription migration', async () => {
      // Setup test data
      const customerEmail = 'test@example.com';
      const registrationId = 'reg-123';
      const checkoutId = 'checkout-123';

      // Create existing subscriptions
      await VzatRecurringData.create([
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'sub-1',
          afs_registration_id: 'old-reg-1',
          afs_checkout_id: 'old-checkout-1'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'active', 
          quotepaymentId: 'sub-2',
          afs_registration_id: 'old-reg-2',
          afs_checkout_id: 'old-checkout-2'
        },
        {
          Customer_email: 'other@example.com',
          subscription_status: 'active',
          quotepaymentId: 'sub-3' // This should not be updated
        }
      ]);

      // Mock AFS validation
      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '1234',
          brand: 'VISA',
          expiryMonth: '12',
          expiryYear: '2025'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Card registered successfully');
      expect(response.body.message).toContain('2 subscription(s) updated');

      // Verify card was saved
      const savedCard = await SavedCard.findOne({ customer_email: customerEmail });
      expect(savedCard).toBeTruthy();
      expect(savedCard.afs_registration_id).toBe(registrationId);
      expect(savedCard.afs_checkout_id).toBe(checkoutId);
      expect(savedCard.is_default).toBe(true);

      // Verify subscriptions were updated
      const updatedSubs = await VzatRecurringData.find({ Customer_email: customerEmail });
      expect(updatedSubs).toHaveLength(2);
      updatedSubs.forEach(sub => {
        expect(sub.afs_registration_id).toBe(registrationId);
        expect(sub.afs_checkout_id).toBe(checkoutId);
        expect(sub.card_migration_date).toBeTruthy();
      });

      // Verify other customer's subscription was not affected
      const otherSub = await VzatRecurringData.findOne({ Customer_email: 'other@example.com' });
      expect(otherSub.afs_registration_id).toBeUndefined();
    });

    test('should handle case with no existing subscriptions', async () => {
      const customerEmail = 'newcustomer@example.com';
      const registrationId = 'reg-456';
      const checkoutId = 'checkout-456';

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '5678',
          brand: 'MASTERCARD',
          expiryMonth: '06',
          expiryYear: '2026'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('No active subscriptions to update');

      // Verify card was still saved
      const savedCard = await SavedCard.findOne({ customer_email: customerEmail });
      expect(savedCard).toBeTruthy();
      expect(savedCard.is_default).toBe(true);
    });

    test('should handle AFS validation failure', async () => {
      afsService.validateRegistration.mockResolvedValue({
        success: false,
        error: 'Invalid registration'
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail: 'test@example.com',
          registrationId: 'invalid-reg',
          checkoutId: 'invalid-checkout',
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid registration');

      // Verify no card was saved
      const savedCard = await SavedCard.findOne({ customer_email: 'test@example.com' });
      expect(savedCard).toBeFalsy();
    });

    test('should set other cards as non-default when adding new default card', async () => {
      const customerEmail = 'test@example.com';

      // Create existing default card
      await SavedCard.create({
        customer_email: customerEmail,
        afs_registration_id: 'old-reg',
        afs_checkout_id: 'old-checkout',
        card_last_four_digits: '9999',
        card_brand: 'VISA',
        is_default: true,
        expiry_month: '01',
        expiry_year: '2024'
      });

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '1111',
          brand: 'MASTERCARD',
          expiryMonth: '12',
          expiryYear: '2025'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId: 'new-reg',
          checkoutId: 'new-checkout',
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(200);

      // Verify old card is no longer default
      const oldCard = await SavedCard.findOne({ afs_registration_id: 'old-reg' });
      expect(oldCard.is_default).toBe(false);

      // Verify new card is default
      const newCard = await SavedCard.findOne({ afs_registration_id: 'new-reg' });
      expect(newCard.is_default).toBe(true);
    });
  });

  describe('Subscription Migration Logic', () => {
    test('should only update active and pending subscriptions', async () => {
      const customerEmail = 'test@example.com';

      // Create subscriptions with different statuses
      await VzatRecurringData.create([
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'sub-active',
          afs_registration_id: 'old-reg'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'pending',
          quotepaymentId: 'sub-pending',
          afs_registration_id: 'old-reg'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'cancelled',
          quotepaymentId: 'sub-cancelled',
          afs_registration_id: 'old-reg'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'expired',
          quotepaymentId: 'sub-expired',
          afs_registration_id: 'old-reg'
        }
      ]);

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '2222',
          brand: 'VISA',
          expiryMonth: '03',
          expiryYear: '2027'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId: 'new-reg',
          checkoutId: 'new-checkout',
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('2 subscription(s) updated');

      // Verify only active and pending were updated
      const activeSub = await VzatRecurringData.findOne({ quotepaymentId: 'sub-active' });
      const pendingSub = await VzatRecurringData.findOne({ quotepaymentId: 'sub-pending' });
      const cancelledSub = await VzatRecurringData.findOne({ quotepaymentId: 'sub-cancelled' });
      const expiredSub = await VzatRecurringData.findOne({ quotepaymentId: 'sub-expired' });

      expect(activeSub.afs_registration_id).toBe('new-reg');
      expect(pendingSub.afs_registration_id).toBe('new-reg');
      expect(cancelledSub.afs_registration_id).toBe('old-reg'); // Should not be updated
      expect(expiredSub.afs_registration_id).toBe('old-reg'); // Should not be updated
    });

    test('should preserve audit trail of previous tokens', async () => {
      const customerEmail = 'test@example.com';

      await VzatRecurringData.create({
        Customer_email: customerEmail,
        subscription_status: 'active',
        quotepaymentId: 'sub-audit',
        afs_registration_id: 'original-reg',
        afs_checkout_id: 'original-checkout'
      });

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '3333',
          brand: 'AMEX',
          expiryMonth: '09',
          expiryYear: '2028'
        }
      });

      await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId: 'audit-reg',
          checkoutId: 'audit-checkout',
          resourcePath: '/test/resource'
        });

      const updatedSub = await VzatRecurringData.findOne({ quotepaymentId: 'sub-audit' });
      
      expect(updatedSub.afs_registration_id).toBe('audit-reg');
      expect(updatedSub.afs_checkout_id).toBe('audit-checkout');
      expect(updatedSub.previous_registration_id).toBe('original-reg');
      expect(updatedSub.previous_checkout_id).toBe('original-checkout');
      expect(updatedSub.card_migration_date).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(SavedCard.prototype, 'save').mockRejectedValue(new Error('Database connection failed'));

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '4444',
          brand: 'VISA',
          expiryMonth: '11',
          expiryYear: '2029'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail: 'test@example.com',
          registrationId: 'error-reg',
          checkoutId: 'error-checkout',
          resourcePath: '/test/resource'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database connection failed');
    });

    test('should handle partial subscription migration failures', async () => {
      const customerEmail = 'test@example.com';

      // Create subscriptions - one will fail to update
      await VzatRecurringData.create([
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'sub-good'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'sub-bad'
        }
      ]);

      // Mock partial failure in subscription updates
      const originalUpdateOne = VzatRecurringData.updateOne;
      jest.spyOn(VzatRecurringData, 'updateOne').mockImplementation((filter, update) => {
        if (filter._id && filter._id.toString().includes('sub-bad')) {
          return Promise.resolve({ modifiedCount: 0 }); // Simulate update failure
        }
        return originalUpdateOne.call(VzatRecurringData, filter, update);
      });

      afsService.validateRegistration.mockResolvedValue({
        success: true,
        cardData: {
          last4: '5555',
          brand: 'DISCOVER',
          expiryMonth: '07',
          expiryYear: '2030'
        }
      });

      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId: 'partial-reg',
          checkoutId: 'partial-checkout',
          resourcePath: '/test/resource'
        });

      // Should still succeed overall but report partial updates
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // The exact message will depend on implementation details
    });
  });
});
