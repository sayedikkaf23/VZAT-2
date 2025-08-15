/**
 * Test Setup and Configuration
 * Global setup for all test files
 */

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods for cleaner test output
const originalConsole = console;

beforeAll(() => {
  // Only show errors and important logs during tests
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep console.error for debugging
});

afterAll(() => {
  // Restore console after tests
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
});

// Global test helpers
global.testHelpers = {
  /**
   * Create a test customer with sample data
   */
  createTestCustomer: (overrides = {}) => ({
    email: 'test@example.com',
    registrationId: 'test-reg-' + Date.now(),
    checkoutId: 'test-checkout-' + Date.now(),
    ...overrides
  }),

  /**
   * Create a test subscription with sample data
   */
  createTestSubscription: (overrides = {}) => ({
    Customer_email: 'test@example.com',
    subscription_status: 'active',
    quotepaymentId: 'test-sub-' + Date.now(),
    afs_registration_id: 'test-reg-' + Date.now(),
    afs_checkout_id: 'test-checkout-' + Date.now(),
    Total_After_VAT_Currency: 99.99,
    ...overrides
  }),

  /**
   * Create a test saved card with sample data
   */
  createTestSavedCard: (overrides = {}) => ({
    customer_email: 'test@example.com',
    afs_registration_id: 'test-reg-' + Date.now(),
    afs_checkout_id: 'test-checkout-' + Date.now(),
    card_last_four_digits: '1234',
    card_brand: 'VISA',
    is_default: false,
    expiry_month: '12',
    expiry_year: '2025',
    ...overrides
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random email for testing
   */
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,

  /**
   * Validate response structure
   */
  validateApiResponse: (response, expectedStructure) => {
    for (const key in expectedStructure) {
      expect(response).toHaveProperty(key);
      if (typeof expectedStructure[key] ***REMOVED***= 'string') {
        expect(typeof response[key]).toBe(expectedStructure[key]);
      }
    }
  }
};

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'vzat_test';
process.env.AFS_TEST_MODE = 'true';

// Mock external services for testing
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup function for tests
global.cleanup = async () => {
  // Add any global cleanup logic here
  // This can be called in afterEach blocks
};
