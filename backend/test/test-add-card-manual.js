/**
 * Manual Testing Script for Add Card Functionality
 * Run this script to test the Add Card flow manually
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Adjust based on your backend port
const TEST_CUSTOMER_EMAIL = 'test.addcard@example.com';

class AddCardTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const coloredMessage = type ***REMOVED***= 'success' ? message.green : 
                          type ***REMOVED***= 'error' ? message.red : 
                          type ***REMOVED***= 'warning' ? message.yellow : 
                          message.blue;
    
    console.log(`[${timestamp}] ${coloredMessage}`);
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message, 
        status: error.response?.status 
      };
    }
  }

  async testPrepareRegistration() {
    this.log('🧪 Testing Card Registration Preparation...', 'info');
    
    const testCases = [
      {
        name: 'Valid preparation request',
        data: {
          customerEmail: TEST_CUSTOMER_EMAIL,
          amount: '1.00',
          currency: 'USD'
        },
        expectedStatus: 200
      },
      {
        name: 'Missing customer email',
        data: {
          amount: '1.00',
          currency: 'USD'
        },
        expectedStatus: 400
      },
      {
        name: 'Missing amount',
        data: {
          customerEmail: TEST_CUSTOMER_EMAIL,
          currency: 'USD'
        },
        expectedStatus: 400
      },
      {
        name: 'Invalid currency',
        data: {
          customerEmail: TEST_CUSTOMER_EMAIL,
          amount: '1.00',
          currency: 'INVALID'
        },
        expectedStatus: 400
      }
    ];

    for (const testCase of testCases) {
      this.log(`  Testing: ${testCase.name}`);
      
      const result = await this.makeRequest('POST', '/saved-card/prepare-registration', testCase.data);
      
      if (result.status ***REMOVED***= testCase.expectedStatus) {
        this.log(`  ✅ ${testCase.name} - PASSED`, 'success');
        if (result.success && testCase.name ***REMOVED***= 'Valid preparation request') {
          this.log(`     Registration ID: ${result.data.registrationId}`);
          this.log(`     Checkout ID: ${result.data.checkoutId}`);
          
          // Store for callback testing
          this.validRegistrationId = result.data.registrationId;
          this.validCheckoutId = result.data.checkoutId;
        }
      } else {
        this.log(`  ❌ ${testCase.name} - FAILED (Expected ${testCase.expectedStatus}, got ${result.status})`, 'error');
      }
      
      this.testResults.push({
        test: testCase.name,
        passed: result.status ***REMOVED***= testCase.expectedStatus,
        expected: testCase.expectedStatus,
        actual: result.status
      });
    }
  }

  async testRegistrationCallback() {
    this.log('🧪 Testing Registration Callback...', 'info');
    
    if (!this.validRegistrationId || !this.validCheckoutId) {
      this.log('  ⚠️ Skipping callback tests - no valid registration ID available', 'warning');
      return;
    }

    const testCases = [
      {
        name: 'Valid registration callback',
        data: {
          customerEmail: TEST_CUSTOMER_EMAIL,
          registrationId: this.validRegistrationId,
          checkoutId: this.validCheckoutId,
          resourcePath: `/v1/registrations/${this.validRegistrationId}`,
          result: {
            code: '000.100.110',
            description: 'Request successfully processed'
          }
        },
        expectedStatus: 200
      },
      {
        name: 'Invalid registration ID',
        data: {
          customerEmail: TEST_CUSTOMER_EMAIL,
          registrationId: 'invalid-reg-id',
          checkoutId: this.validCheckoutId,
          resourcePath: '/v1/registrations/invalid-reg-id'
        },
        expectedStatus: 400
      },
      {
        name: 'Missing customer email in callback',
        data: {
          registrationId: this.validRegistrationId,
          checkoutId: this.validCheckoutId,
          resourcePath: `/v1/registrations/${this.validRegistrationId}`
        },
        expectedStatus: 400
      }
    ];

    for (const testCase of testCases) {
      this.log(`  Testing: ${testCase.name}`);
      
      const result = await this.makeRequest('POST', '/saved-card/registration-callback', testCase.data);
      
      if (result.status ***REMOVED***= testCase.expectedStatus) {
        this.log(`  ✅ ${testCase.name} - PASSED`, 'success');
        if (result.success) {
          this.log(`     Response: ${result.data.message}`);
        }
      } else {
        this.log(`  ❌ ${testCase.name} - FAILED (Expected ${testCase.expectedStatus}, got ${result.status})`, 'error');
        if (result.error) {
          this.log(`     Error: ${JSON.stringify(result.error)}`, 'error');
        }
      }
      
      this.testResults.push({
        test: testCase.name,
        passed: result.status ***REMOVED***= testCase.expectedStatus,
        expected: testCase.expectedStatus,
        actual: result.status
      });
    }
  }

  async testSubscriptionMigration() {
    this.log('🧪 Testing Subscription Migration Scenarios...', 'info');
    
    // First, create some test subscriptions (you might need to implement this endpoint)
    const createSubscriptionData = {
      customerEmail: TEST_CUSTOMER_EMAIL,
      subscriptions: [
        {
          quotepaymentId: 'test-sub-1',
          subscription_status: 'active',
          afs_registration_id: 'old-reg-1',
          afs_checkout_id: 'old-checkout-1'
        },
        {
          quotepaymentId: 'test-sub-2',
          subscription_status: 'pending',
          afs_registration_id: 'old-reg-2',
          afs_checkout_id: 'old-checkout-2'
        }
      ]
    };

    this.log('  Creating test subscriptions...');
    const createResult = await this.makeRequest('POST', '/test/create-subscriptions', createSubscriptionData);
    
    if (!createResult.success) {
      this.log('  ⚠️ Could not create test subscriptions. Migration test may not be accurate.', 'warning');
    }

    // Now test the migration
    const prepareResult = await this.makeRequest('POST', '/saved-card/prepare-registration', {
      customerEmail: TEST_CUSTOMER_EMAIL,
      amount: '1.00',
      currency: 'USD'
    });

    if (prepareResult.success) {
      const { registrationId, checkoutId } = prepareResult.data;
      
      const callbackResult = await this.makeRequest('POST', '/saved-card/registration-callback', {
        customerEmail: TEST_CUSTOMER_EMAIL,
        registrationId,
        checkoutId,
        resourcePath: `/v1/registrations/${registrationId}`
      });

      if (callbackResult.success) {
        this.log('  ✅ Subscription migration completed', 'success');
        this.log(`     ${callbackResult.data.message}`);
      } else {
        this.log('  ❌ Subscription migration failed', 'error');
      }
    }
  }

  async testErrorHandling() {
    this.log('🧪 Testing Error Handling...', 'info');
    
    const errorTests = [
      {
        name: 'Malformed JSON',
        endpoint: '/saved-card/prepare-registration',
        data: '{"invalid": json}',
        expectedStatus: 400
      },
      {
        name: 'Empty request body',
        endpoint: '/saved-card/prepare-registration',
        data: {},
        expectedStatus: 400
      },
      {
        name: 'SQL injection attempt',
        endpoint: '/saved-card/prepare-registration',
        data: {
          customerEmail: "test@example.com'; DROP TABLE users; --",
          amount: '1.00',
          currency: 'USD'
        },
        expectedStatus: 400
      }
    ];

    for (const test of errorTests) {
      this.log(`  Testing: ${test.name}`);
      
      const result = await this.makeRequest('POST', test.endpoint, test.data);
      
      if (result.status ***REMOVED***= test.expectedStatus) {
        this.log(`  ✅ ${test.name} - PASSED`, 'success');
      } else {
        this.log(`  ❌ ${test.name} - FAILED`, 'error');
      }
    }
  }

  async testPerformance() {
    this.log('🧪 Testing Performance...', 'info');
    
    const iterations = 10;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      await this.makeRequest('POST', '/saved-card/prepare-registration', {
        customerEmail: `perf-test-${i}@example.com`,
        amount: '1.00',
        currency: 'USD'
      });
      
      const end = Date.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    this.log(`  Average response time: ${avgTime.toFixed(2)}ms`);
    this.log(`  Max response time: ${maxTime}ms`);
    this.log(`  Min response time: ${minTime}ms`);

    if (avgTime < 1000) {
      this.log('  ✅ Performance test PASSED', 'success');
    } else {
      this.log('  ⚠️ Performance might need optimization', 'warning');
    }
  }

  async generateTestReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    this.log('\n📊 TEST REPORT', 'info');
    this.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***', 'info');
    
    const passed = this.testResults.filter(t => t.passed).length;
    const failed = this.testResults.filter(t => !t.passed).length;
    const total = this.testResults.length;
    
    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'success');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    this.log(`Total Execution Time: ${totalTime}ms`);
    
    if (failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      this.testResults.filter(t => !t.passed).forEach(test => {
        this.log(`  - ${test.test} (Expected ${test.expected}, got ${test.actual})`, 'error');
      });
    }

    this.log('\n💡 RECOMMENDATIONS:', 'info');
    if (failed ***REMOVED***= 0) {
      this.log('  All tests passed! The Add Card functionality is working correctly.', 'success');
    } else {
      this.log('  Some tests failed. Please review the failed tests and fix the issues.', 'warning');
    }
    
    this.log('  Remember to test with real AFS credentials in staging environment.', 'warning');
    this.log('  Monitor subscription migration performance with larger datasets.', 'warning');
  }

  async runAllTests() {
    this.log('🚀 Starting Add Card Functionality Tests...', 'info');
    this.log(`Backend URL: ${BASE_URL}`, 'info');
    this.log(`Test Customer: ${TEST_CUSTOMER_EMAIL}`, 'info');
    this.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***\n', 'info');

    try {
      await this.testPrepareRegistration();
      await this.testRegistrationCallback();
      await this.testSubscriptionMigration();
      await this.testErrorHandling();
      await this.testPerformance();
      await this.generateTestReport();
    } catch (error) {
      this.log(`\n❌ Test execution failed: ${error.message}`, 'error');
    }
  }
}

// CLI interface
if (require.main ***REMOVED***= module) {
  const tester = new AddCardTester();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Add Card Manual Testing Script

Usage: node test-add-card-manual.js [options]

Options:
  --help              Show this help message
  --endpoint <url>    Set custom backend endpoint (default: http://localhost:5000)
  --email <email>     Set custom test email (default: test.addcard@example.com)
  --quick             Run only basic tests (skip performance tests)

Examples:
  node test-add-card-manual.js
  node test-add-card-manual.js --endpoint http://localhost:3000
  node test-add-card-manual.js --email custom@test.com --quick
    `);
    process.exit(0);
  }

  // Process arguments
  const endpointIndex = args.indexOf('--endpoint');
  if (endpointIndex !***REMOVED*** -1 && args[endpointIndex + 1]) {
    BASE_URL = args[endpointIndex + 1];
  }

  const emailIndex = args.indexOf('--email');
  if (emailIndex !***REMOVED*** -1 && args[emailIndex + 1]) {
    TEST_CUSTOMER_EMAIL = args[emailIndex + 1];
  }

  tester.runAllTests().catch(console.error);
}

module.exports = AddCardTester;
