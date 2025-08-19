import axios from 'axios';
import config from './config.env.js';

// AFS Configuration
const AFS_CONFIG = {
  baseUrl: process.env.AFS_BASE_URL || config.AFS_BASE_URL,
  entityId: process.env.AFS_ENTITY_ID || config.AFS_ENTITY_ID,
  authorization: process.env.AFS_AUTHORIZATION || config.AFS_AUTHORIZATION,
  testMode: 'EXTERNAL'
};

async function testAfsRegistration() {
  console.log('🧪 Testing AFS Registration Configuration');
  console.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***');
  
  console.log('🔧 Configuration:');
  console.log('  Base URL:', AFS_CONFIG.baseUrl);
  console.log('  Entity ID:', AFS_CONFIG.entityId);
  console.log('  Test Mode:', AFS_CONFIG.testMode);
  console.log('  Auth Token:', AFS_CONFIG.authorization ? `${AFS_CONFIG.authorization.substring(0, 20)}...` : 'NOT SET');
  
  if (!AFS_CONFIG.baseUrl || !AFS_CONFIG.entityId || !AFS_CONFIG.authorization) {
    console.error('❌ AFS configuration is incomplete');
    return;
  }

  // Test 1: Create a standalone registration checkout
  console.log('\n📝 Test 1: Creating standalone registration checkout');
  console.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***');
  
  const testEmail = 'test@example.com';
  const shopperResultUrl = 'https://vzatnew.yeepeey.com/saved-card/add-card';
  
  const checkoutData = new URLSearchParams({
    entityId: AFS_CONFIG.entityId,
    testMode: AFS_CONFIG.testMode,
    createRegistration: 'true', // Key parameter for standalone registration
    
    // Customer information
    'customer.email': testEmail,
    'customer.merchantCustomerId': testEmail.split('@')[0],
    
    // Redirect URL
    shopperResultUrl: shopperResultUrl,
    
    // Billing information (optional for registration)
    'billing.country': 'AE',
    'billing.city': 'Dubai',
    
    // Transaction identifier
    'merchantTransactionId': `test_card_reg_${Date.now()}_${testEmail.split('@')[0]}`,
    
    // UI and locale settings
    'customParameters[SHOPPER_locale]': 'en_US'
  });

  console.log('📋 Request Parameters:');
  for (const [key, value] of checkoutData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  try {
    console.log('\n📞 Making request to AFS...');
    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/checkouts`,
      checkoutData,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      }
    );

    console.log('✅ Registration checkout created successfully!');
    console.log('📊 Status:', response.status);
    console.log('📋 Response Headers:', response.headers);
    console.log('📄 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.id) {
      console.log(`\n🔑 Checkout ID: ${response.data.id}`);
      console.log(`📜 Standard Widget Script URL: ${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${response.data.id}`);
      console.log(`📜 Registration Widget Script URL: ${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${response.data.id}/registration`);
      
      // Test 2: Try to get registration status (this would normally fail because no registration was completed)
      console.log('\n📝 Test 2: Testing registration status endpoint');
      console.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***');
      
      try {
        const statusResponse = await axios.get(
          `${AFS_CONFIG.baseUrl}/v1/checkouts/${response.data.id}/registration`,
          {
            params: { entityId: AFS_CONFIG.entityId },
            headers: { 'Authorization': AFS_CONFIG.authorization }
          }
        );
        
        console.log('📊 Status check successful:', statusResponse.data);
      } catch (statusError) {
        console.log('📊 Status check result (expected to fail until user completes registration):');
        if (statusError.response) {
          console.log('  Status:', statusError.response.status);
          console.log('  Data:', JSON.stringify(statusError.response.data, null, 2));
          
          // Check if this is the expected 800.900.300 error
          if (statusError.response.data?.result?.code ***REMOVED***= '800.900.300') {
            console.log('✅ This is the expected "user authorization failed" error - user hasn\'t completed registration yet');
          }
        } else {
          console.log('  Error:', statusError.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error creating registration checkout:');
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Headers:', error.response.headers);
      console.error('📄 Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data?.result?.code) {
        console.error('🔍 Error Code Analysis:');
        console.error(`  Code: ${error.response.data.result.code}`);
        console.error(`  Description: ${error.response.data.result.description}`);
        
        // Provide specific guidance based on error code
        switch (error.response.data.result.code) {
          case '800.900.300':
            console.error('  🛠️ This is an authentication issue - check your authorization token and entity ID');
            break;
          case '600.200.201':
            console.error('  🛠️ Entity not configured for this payment method - check your AFS configuration');
            break;
          case '600.300.101':
            console.error('  🛠️ Merchant key not found - check your authorization token');
            break;
          default:
            console.error('  🛠️ Check AFS documentation for this error code');
        }
      }
    } else {
      console.error('📄 Error:', error.message);
    }
  }

  // Test 3: Validate AFS credentials
  console.log('\n📝 Test 3: Testing AFS connectivity and credentials');
  console.log('***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
  
  try {
    // Try a simple GET request to test connectivity and auth
    const healthCheck = await axios.get(
      `${AFS_CONFIG.baseUrl}/v1/resultcodes`,
      {
        headers: { 'Authorization': AFS_CONFIG.authorization },
        timeout: 5000
      }
    );
    
    console.log('✅ AFS connectivity and credentials appear to be working');
    console.log('📊 Health check status:', healthCheck.status);
  } catch (healthError) {
    console.error('❌ AFS connectivity or credentials issue:');
    if (healthError.response) {
      console.error('📊 Status:', healthError.response.status);
      if (healthError.response.status ***REMOVED***= 401) {
        console.error('🔐 Authentication failed - check your authorization token');
      } else if (healthError.response.status ***REMOVED***= 403) {
        console.error('🚫 Access forbidden - check your permissions');
      }
    } else {
      console.error('🌐 Network error:', healthError.message);
    }
  }
}

// Run the test
testAfsRegistration().catch(console.error);
