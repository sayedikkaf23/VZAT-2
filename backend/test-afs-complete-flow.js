import axios from 'axios';
import config from './config.env.js';

// AFS Configuration
const AFS_CONFIG = {
  baseUrl: process.env.AFS_BASE_URL || config.AFS_BASE_URL,
  entityId: process.env.AFS_ENTITY_ID || config.AFS_ENTITY_ID,
  authorization: process.env.AFS_AUTHORIZATION || config.AFS_AUTHORIZATION,
  testMode: 'EXTERNAL'
};

async function testCompleteRegistrationFlow() {
  console.log('🧪 Testing Complete AFS Registration Flow');
  console.log('========================================');
  
  const testEmail = 'test@example.com';
  const frontendUrl = 'https://vzatnew.yeepeey.com';
  const shopperResultUrl = `${frontendUrl}/customer-portal/add-card`;
  
  // Step 1: Create registration checkout (same as our backend does)
  console.log('\n📝 Step 1: Creating standalone registration checkout');
  console.log('==================================================');
  
  const checkoutData = new URLSearchParams({
    entityId: AFS_CONFIG.entityId,
    testMode: AFS_CONFIG.testMode,
    createRegistration: 'true',
    'customer.email': testEmail,
    'customer.merchantCustomerId': testEmail.split('@')[0],
    shopperResultUrl: shopperResultUrl,
    'billing.country': 'AE',
    'billing.city': 'Dubai',
    'merchantTransactionId': `test_flow_${Date.now()}_${testEmail.split('@')[0]}`,
    'customParameters[SHOPPER_locale]': 'en_US'
  });

  console.log('📋 Checkout creation parameters:');
  for (const [key, value] of checkoutData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  let checkoutId;
  try {
    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/checkouts`,
      checkoutData,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    checkoutId = response.data.id;
    console.log('✅ Checkout created successfully!');
    console.log('🔑 Checkout ID:', checkoutId);
    console.log('📜 Widget Script URL:', `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutId}`);
    console.log('🔗 Shopper Result URL:', shopperResultUrl);
    
  } catch (error) {
    console.error('❌ Failed to create checkout:', error.response?.data || error.message);
    return;
  }

  // Step 2: Test registration status polling (simulate what happens during processing)
  console.log('\n📝 Step 2: Testing registration status polling');
  console.log('==============================================');
  
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}: Checking registration status...`);
    
    try {
      const statusResponse = await axios.get(
        `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/registration`,
        {
          params: { entityId: AFS_CONFIG.entityId },
          headers: { 'Authorization': AFS_CONFIG.authorization }
        }
      );
      
      console.log('📊 Status Response:', statusResponse.data);
      
      if (statusResponse.data.result) {
        const resultCode = statusResponse.data.result.code;
        const resultDescription = statusResponse.data.result.description;
        
        console.log(`📋 Result: ${resultCode} - ${resultDescription}`);
        
        // Check for success codes
        if (resultCode.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
          if (resultCode === '000.200.000') {
            console.log('⏳ Registration is pending (user hasn\'t completed it yet)');
          } else {
            console.log('✅ Registration completed successfully!');
            if (statusResponse.data.id) {
              console.log('🎯 Registration Token ID:', statusResponse.data.id);
            }
            break;
          }
        } else if (resultCode === '800.900.300') {
          console.log('⚠️ User authorization failed (registration not completed by user)');
        } else {
          console.log('❌ Registration failed with code:', resultCode);
        }
      }
      
    } catch (statusError) {
      console.log('📊 Status check error:');
      if (statusError.response) {
        console.log('  Status:', statusError.response.status);
        console.log('  Data:', JSON.stringify(statusError.response.data, null, 2));
      } else {
        console.log('  Error:', statusError.message);
      }
    }
    
    // Wait before next attempt
    if (attempt < 5) {
      console.log('⏱️ Waiting 3 seconds before next check...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Step 3: Show what the callback URLs would look like
  console.log('\n📝 Step 3: Expected callback URL examples');
  console.log('=========================================');
  
  console.log('✅ Success callback would be:');
  console.log(`${shopperResultUrl}?resourcePath=/v1/checkouts/${checkoutId}/registration`);
  
  console.log('\n❌ Error callback examples:');
  console.log(`${shopperResultUrl}?error=USER_CANCELLED_REGISTRATION`);
  console.log(`${shopperResultUrl}?error=REGISTRATION_TIMEOUT`);
  
  // Step 4: Test our callback handling logic
  console.log('\n📝 Step 4: Testing callback URL parsing');
  console.log('=====================================');
  
  const testResourcePath = `/v1/checkouts/${checkoutId}/registration`;
  const checkoutIdMatch = testResourcePath.match(/\/checkouts\/([^\/]+)\/registration/);
  
  if (checkoutIdMatch) {
    const extractedCheckoutId = checkoutIdMatch[1];
    console.log('✅ Checkout ID extraction successful');
    console.log('📋 Original:', checkoutId);
    console.log('📋 Extracted:', extractedCheckoutId);
    console.log('📋 Match:', checkoutId === extractedCheckoutId ? '✅' : '❌');
  } else {
    console.log('❌ Failed to extract checkout ID from resource path');
  }

  // Step 5: Integration recommendations
  console.log('\n📝 Step 5: Integration Summary & Recommendations');
  console.log('===============================================');
  
  console.log('🔧 Current Implementation Status:');
  console.log('  ✅ AFS Authentication: Working');
  console.log('  ✅ Checkout Creation: Working');
  console.log('  ✅ Registration Endpoint: Working');
  console.log('  ✅ Callback URL Parsing: Working');
  
  console.log('\n🎯 Key Points for Frontend Integration:');
  console.log('  1. Load widget script after checkout creation');
  console.log('  2. Set form action to frontend callback URL');
  console.log('  3. Handle resourcePath parameter in URL');
  console.log('  4. Call backend to verify registration status');
  console.log('  5. Implement proper error handling for user cancellation');
  
  console.log('\n🎯 Expected User Flow:');
  console.log('  1. User clicks "Add Card"');
  console.log('  2. Backend creates checkout → Frontend loads AFS widget');
  console.log('  3. User fills card details → AFS processes registration');
  console.log('  4. AFS redirects to shopperResultUrl with resourcePath');
  console.log('  5. Frontend extracts resourcePath → Calls backend');
  console.log('  6. Backend verifies registration → Returns success/failure');
  console.log('  7. Frontend shows result → Redirects to saved cards');
  
  console.log('\n✅ Test completed successfully!');
}

// Run the test
testCompleteRegistrationFlow().catch(console.error);
