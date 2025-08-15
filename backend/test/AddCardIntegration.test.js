/**
 * Integration Test for Complete Add Card Flow
 * Tests the entire process from frontend to backend
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const SavedCard = require('../model/SavedCardModel');
const VzatRecurringData = require('../model/VzatRecurringDataModel');

describe('Add Card Integration Tests', () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    
    // Import and setup routes
    const savedCardRoutes = require('../routes/SavedCardRoute');
    app.use('/saved-card', savedCardRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await SavedCard.deleteMany({});
    await VzatRecurringData.deleteMany({});
  });

  describe('Complete Add Card Flow', () => {
    test('should handle complete customer journey: prepare → register → migrate', async () => {
      const customerEmail = 'integration@example.com';
      
      // Step 1: Create existing customer data
      await SavedCard.create({
        customer_email: customerEmail,
        afs_registration_id: 'existing-reg',
        afs_checkout_id: 'existing-checkout',
        card_last_four_digits: '1234',
        card_brand: 'VISA',
        is_default: true,
        expiry_month: '12',
        expiry_year: '2024'
      });

      await VzatRecurringData.create([
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'monthly-subscription',
          afs_registration_id: 'existing-reg',
          afs_checkout_id: 'existing-checkout',
          Total_After_VAT_Currency: 100.00,
          subscription_frequency: 'monthly'
        },
        {
          Customer_email: customerEmail,
          subscription_status: 'active',
          quotepaymentId: 'yearly-subscription',
          afs_registration_id: 'existing-reg',
          afs_checkout_id: 'existing-checkout',
          Total_After_VAT_Currency: 500.00,
          subscription_frequency: 'yearly'
        }
      ]);

      // Step 2: Prepare registration (simulate frontend request)
      const prepareResponse = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail,
          amount: '1.00',
          currency: 'USD'
        });

      expect(prepareResponse.status).toBe(200);
      const { checkoutId, registrationId } = prepareResponse.body;

      // Step 3: Simulate successful card registration callback
      const callbackResponse = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/v1/registrations/' + registrationId,
          // Simulate AFS callback data
          result: {
            code: '000.100.110',
            description: 'Request successfully processed'
          }
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.success).toBe(true);

      // Step 4: Verify complete state after migration
      
      // Check that old card is no longer default
      const oldCard = await SavedCard.findOne({ afs_registration_id: 'existing-reg' });
      expect(oldCard.is_default).toBe(false);

      // Check that new card exists and is default
      const newCard = await SavedCard.findOne({ afs_registration_id: registrationId });
      expect(newCard).toBeTruthy();
      expect(newCard.is_default).toBe(true);
      expect(newCard.customer_email).toBe(customerEmail);

      // Check that all subscriptions were migrated
      const subscriptions = await VzatRecurringData.find({ Customer_email: customerEmail });
      expect(subscriptions).toHaveLength(2);
      
      subscriptions.forEach(sub => {
        expect(sub.afs_registration_id).toBe(registrationId);
        expect(sub.afs_checkout_id).toBe(checkoutId);
        expect(sub.previous_registration_id).toBe('existing-reg');
        expect(sub.card_migration_date).toBeTruthy();
      });

      // Verify audit trail
      const monthlySubscription = await VzatRecurringData.findOne({ quotepaymentId: 'monthly-subscription' });
      expect(monthlySubscription.previous_registration_id).toBe('existing-reg');
      expect(monthlySubscription.previous_checkout_id).toBe('existing-checkout');
    });

    test('should handle new customer with no existing cards or subscriptions', async () => {
      const newCustomerEmail = 'newcustomer@example.com';

      // Step 1: Prepare registration for new customer
      const prepareResponse = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail: newCustomerEmail,
          amount: '1.00',
          currency: 'EUR'
        });

      expect(prepareResponse.status).toBe(200);
      const { checkoutId, registrationId } = prepareResponse.body;

      // Step 2: Complete registration
      const callbackResponse = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail: newCustomerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/v1/registrations/' + registrationId
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.message).toContain('No active subscriptions to update');

      // Step 3: Verify new customer state
      const cards = await SavedCard.find({ customer_email: newCustomerEmail });
      expect(cards).toHaveLength(1);
      expect(cards[0].is_default).toBe(true);
      expect(cards[0].afs_registration_id).toBe(registrationId);

      const subscriptions = await VzatRecurringData.find({ Customer_email: newCustomerEmail });
      expect(subscriptions).toHaveLength(0);
    });

    test('should handle customer with multiple existing cards', async () => {
      const customerEmail = 'multicard@example.com';

      // Create multiple existing cards
      await SavedCard.create([
        {
          customer_email: customerEmail,
          afs_registration_id: 'card-1-reg',
          afs_checkout_id: 'card-1-checkout',
          card_last_four_digits: '1111',
          card_brand: 'VISA',
          is_default: true,
          expiry_month: '01',
          expiry_year: '2025'
        },
        {
          customer_email: customerEmail,
          afs_registration_id: 'card-2-reg',
          afs_checkout_id: 'card-2-checkout',
          card_last_four_digits: '2222',
          card_brand: 'MASTERCARD',
          is_default: false,
          expiry_month: '02',
          expiry_year: '2026'
        }
      ]);

      // Create subscription using first card
      await VzatRecurringData.create({
        Customer_email: customerEmail,
        subscription_status: 'active',
        quotepaymentId: 'multi-card-sub',
        afs_registration_id: 'card-1-reg',
        afs_checkout_id: 'card-1-checkout'
      });

      // Add new card
      const prepareResponse = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail,
          amount: '1.00',
          currency: 'GBP'
        });

      const { checkoutId, registrationId } = prepareResponse.body;

      const callbackResponse = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/v1/registrations/' + registrationId
        });

      expect(callbackResponse.status).toBe(200);

      // Verify card states
      const allCards = await SavedCard.find({ customer_email: customerEmail });
      expect(allCards).toHaveLength(3);

      // Only new card should be default
      const defaultCards = allCards.filter(card => card.is_default);
      expect(defaultCards).toHaveLength(1);
      expect(defaultCards[0].afs_registration_id).toBe(registrationId);

      // Verify subscription migration
      const subscription = await VzatRecurringData.findOne({ quotepaymentId: 'multi-card-sub' });
      expect(subscription.afs_registration_id).toBe(registrationId);
      expect(subscription.previous_registration_id).toBe('card-1-reg');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle AFS service errors gracefully', async () => {
      // This test would require mocking the actual AFS service
      // For now, we'll test the error handling path
      
      const response = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail: 'error@example.com',
          registrationId: 'invalid-reg',
          checkoutId: 'invalid-checkout',
          resourcePath: '/v1/registrations/invalid-reg',
          result: {
            code: '100.400.020',
            description: 'Transaction declined'
          }
        });

      // Should handle the error appropriately
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle concurrent card additions', async () => {
      const customerEmail = 'concurrent@example.com';

      // Simulate concurrent requests
      const promises = Array.from({ length: 3 }, (_, i) => 
        request(app)
          .post('/saved-card/prepare-registration')
          .send({
            customerEmail,
            amount: '1.00',
            currency: 'USD'
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (prepare registration is idempotent)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Each should have unique identifiers
      const checkoutIds = responses.map(r => r.body.checkoutId);
      const uniqueCheckoutIds = new Set(checkoutIds);
      expect(uniqueCheckoutIds.size).toBe(3);
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk subscription migration efficiently', async () => {
      const customerEmail = 'bulk@example.com';
      const subscriptionCount = 50;

      // Create many subscriptions
      const subscriptions = Array.from({ length: subscriptionCount }, (_, i) => ({
        Customer_email: customerEmail,
        subscription_status: 'active',
        quotepaymentId: `bulk-sub-${i}`,
        afs_registration_id: 'old-bulk-reg',
        afs_checkout_id: 'old-bulk-checkout'
      }));

      await VzatRecurringData.insertMany(subscriptions);

      const startTime = Date.now();

      // Prepare and complete registration
      const prepareResponse = await request(app)
        .post('/saved-card/prepare-registration')
        .send({
          customerEmail,
          amount: '1.00',
          currency: 'USD'
        });

      const { checkoutId, registrationId } = prepareResponse.body;

      const callbackResponse = await request(app)
        .post('/saved-card/registration-callback')
        .send({
          customerEmail,
          registrationId,
          checkoutId,
          resourcePath: '/v1/registrations/' + registrationId
        });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.message).toContain(`${subscriptionCount} subscription(s) updated`);

      // Should complete within reasonable time (less than 5 seconds for 50 subscriptions)
      expect(executionTime).toBeLessThan(5000);

      // Verify all subscriptions were updated
      const updatedSubscriptions = await VzatRecurringData.find({ 
        Customer_email: customerEmail,
        afs_registration_id: registrationId 
      });
      expect(updatedSubscriptions).toHaveLength(subscriptionCount);
    });
  });
});
