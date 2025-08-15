# Add Card Testing Guide

This document provides comprehensive testing strategies for the Add Card functionality.

## 🧪 Testing Types Implemented

### 1. **Unit Tests** (`AddCardController.test.js`)
- **Controller Logic**: Tests all AddCardController methods in isolation
- **Database Operations**: Tests card saving and subscription migration
- **Error Handling**: Validates error responses and edge cases
- **Input Validation**: Ensures proper validation of request parameters

**Run with:**
```bash
npm test AddCardController.test.js
```

### 2. **Integration Tests** (`AddCardIntegration.test.js`)
- **Complete Flows**: Tests end-to-end card registration process
- **Database Integration**: Tests with real database operations
- **Multiple Scenarios**: New customers, existing customers, bulk operations
- **Performance Tests**: Validates response times and bulk processing

**Run with:**
```bash
npm test AddCardIntegration.test.js
```

### 3. **Manual Testing Script** (`test-add-card-manual.js`)
- **Live API Testing**: Tests against running backend server
- **Real Network Calls**: Validates actual HTTP requests/responses
- **Performance Monitoring**: Measures real response times
- **Error Simulation**: Tests various error conditions

**Run with:**
```bash
node test/test-add-card-manual.js
```

### 4. **Frontend Component Tests** (`add-card.component.spec.ts`)
- **Angular Component**: Tests UI component behavior
- **Service Integration**: Tests AddCardService integration
- **User Interactions**: Tests button clicks and form submissions
- **State Management**: Tests loading states and error handling

**Run with:**
```bash
ng test --include="**/add-card.component.spec.ts"
```

## 🚀 Quick Start Testing

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev jest supertest mongodb-memory-server

# For frontend tests
npm install --save-dev @angular/testing jasmine
```

### Backend Testing
```bash
# Run all backend tests
cd backend
npm test

# Run specific test suites
npm test -- --testNamePattern="AddCard"

# Run with coverage
npm test -- --coverage
```

### Frontend Testing
```bash
# Run Angular tests
cd frontend
ng test

# Run specific component tests
ng test --include="**/add-card/**"

# Run in headless mode
ng test --browsers=ChromeHeadless --watch=false
```

### Manual Testing
```bash
# Start your backend server first
cd backend
npm start

# In another terminal, run manual tests
cd backend
node test/test-add-card-manual.js

# With custom settings
node test/test-add-card-manual.js --endpoint http://localhost:3000 --email custom@test.com
```

## 📋 Test Scenarios Covered

### 🔐 **Security Testing**
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Sensitive data handling
- ✅ Authentication checks

### 💳 **Payment Flow Testing**
- ✅ Card registration preparation
- ✅ AFS widget integration
- ✅ Registration callback handling
- ✅ Token validation
- ✅ Card data storage

### 🔄 **Subscription Migration**
- ✅ Active subscription updates
- ✅ Bulk subscription processing
- ✅ Token migration accuracy
- ✅ Audit trail creation
- ✅ Rollback scenarios

### ⚡ **Performance Testing**
- ✅ Response time validation
- ✅ Bulk operation efficiency
- ✅ Memory usage monitoring
- ✅ Concurrent request handling
- ✅ Database query optimization

### 🛡️ **Error Handling**
- ✅ Network failures
- ✅ Database errors
- ✅ AFS service failures
- ✅ Invalid input handling
- ✅ Timeout scenarios

## 🎯 Test Data Requirements

### **Test Customer Data**
```json
{
  "customerEmail": "test.addcard@example.com",
  "existingCards": [
    {
      "registrationId": "existing-reg-123",
      "last4": "1234",
      "brand": "VISA",
      "isDefault": true
    }
  ],
  "subscriptions": [
    {
      "quotepaymentId": "sub-monthly-001",
      "status": "active",
      "amount": 99.99
    }
  ]
}
```

### **Test Card Information**
For AFS testing, use these test cards:
```
VISA: 4200000000000000
Mastercard: 5454545454545454
AMEX: 377777777777770
Expiry: Any future date
CVV: Any 3-4 digits
```

## 📊 Test Coverage Expectations

### **Backend Coverage Goals**
- Controllers: **90%+**
- Services: **85%+**
- Models: **80%+**
- Routes: **85%+**

### **Frontend Coverage Goals**
- Components: **85%+**
- Services: **90%+**
- Guards: **80%+**
- Pipes: **75%+**

## 🔧 Testing Best Practices

### **1. Test Isolation**
- Each test should be independent
- Use beforeEach/afterEach for cleanup
- Mock external dependencies
- Use in-memory databases for unit tests

### **2. Descriptive Test Names**
```javascript
// Good
test('should update all active subscriptions when new card becomes default')

// Bad
test('subscription test')
```

### **3. Arrange-Act-Assert Pattern**
```javascript
test('should prepare card registration successfully', async () => {
  // Arrange
  const customerData = { email: 'test@example.com' };
  
  // Act
  const result = await prepareRegistration(customerData);
  
  // Assert
  expect(result.success).toBe(true);
  expect(result.registrationId).toBeTruthy();
});
```

### **4. Error Testing**
Always test both success and failure scenarios:
```javascript
describe('Card Registration', () => {
  test('should succeed with valid data', async () => { /* ... */ });
  test('should fail with invalid email', async () => { /* ... */ });
  test('should handle network errors', async () => { /* ... */ });
});
```

## 🐛 Debugging Test Failures

### **Common Issues & Solutions**

1. **Database Connection Issues**
   ```bash
   # Check MongoDB connection
   sudo systemctl status mongod
   
   # Reset test database
   npm run test:db:reset
   ```

2. **AFS Service Mocking**
   ```javascript
   // Ensure AFS service is properly mocked
   jest.mock('../services/afsService', () => ({
     prepareRegistration: jest.fn(),
     validateRegistration: jest.fn()
   }));
   ```

3. **Async Test Failures**
   ```javascript
   // Always await async operations
   await expect(asyncFunction()).rejects.toThrow('Expected error');
   ```

4. **Frontend Component Testing**
   ```javascript
   // Ensure proper TestBed configuration
   await TestBed.configureTestingModule({
     declarations: [AddCardComponent],
     imports: [HttpClientTestingModule],
     providers: [/* all required services */]
   }).compileComponents();
   ```

## 📈 Continuous Integration

### **GitHub Actions Example**
```yaml
name: Add Card Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
      
      - name: Run backend tests
        run: cd backend && npm test
      
      - name: Run frontend tests
        run: cd frontend && ng test --browsers=ChromeHeadless --watch=false
      
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## 🎉 Success Criteria

Your Add Card functionality is well-tested when:

- ✅ All unit tests pass with 85%+ coverage
- ✅ Integration tests validate complete user flows
- ✅ Manual tests confirm real-world functionality
- ✅ Performance tests show acceptable response times
- ✅ Security tests prevent common vulnerabilities
- ✅ Error handling gracefully manages all failure scenarios

## 🆘 Need Help?

If tests are failing or you need assistance:

1. **Check the logs** for detailed error messages
2. **Review test data** to ensure it matches expectations
3. **Verify environment** setup (database, services)
4. **Run tests individually** to isolate issues
5. **Check mock configurations** for external services

Remember: Good tests are an investment in code quality and developer confidence! 🚀
