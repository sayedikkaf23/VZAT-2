import axios from 'axios';
import config from './config.env.js';

// Test configuration
const TEST_CONFIG = {
  // Backend URL
  backendUrl: 'http://localhost:3000',
  
  // Test customer email
  customerEmail: 'test@virtuzone.com',
  
  // Frontend URL for testing - using production URL
  frontendUrl: 'https://vzatnew.yeepeey.com'
};

console.log('🧪 Starting Add Card Debug Test');
console.log('📋 Test Configuration:', TEST_CONFIG);
console.log('🔧 Environment Config:', {
  AFS_BASE_URL: config.AFS_BASE_URL,
  AFS_ENTITY_ID: config.AFS_ENTITY_ID,
  FRONTEND_URL: config.FRONTEND_URL
});

/**
 * Test Step 1: Prepare card registration
 */
async function testPrepareCardRegistration() {
  try {
    console.log('\n🔄 Step 1: Testing card registration preparation...');
    
    const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/add-card/prepare`, {
      customerEmail: TEST_CONFIG.customerEmail
    });
    
    console.log('✅ Preparation successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.checkoutId) {
      console.log('🔑 Checkout ID generated:', response.data.checkoutId);
      
      // Test AFS checkout status
      await testAfsCheckoutStatus(response.data.checkoutId);
      
      return response.data;
    } else {
      console.error('❌ Preparation failed: No checkout ID received');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error in preparation step:', error.response?.data || error.message);
    console.error('📋 Full error:', error);
    return null;
  }
}

/**
 * Test Step 2: Check AFS checkout status directly
 */
async function testAfsCheckoutStatus(checkoutId) {
  try {
    console.log('\n🔄 Step 2: Testing AFS checkout status...');
    console.log('🔑 Checking status for checkout ID:', checkoutId);
    
    const afsConfig = {
      baseUrl: config.AFS_BASE_URL,
      entityId: config.AFS_ENTITY_ID,
      authorization: config.AFS_AUTHORIZATION
    };
    
    const response = await axios.get(
      `${afsConfig.baseUrl}/v1/checkouts/${checkoutId}`,
      {
        params: {
          entityId: afsConfig.entityId
        },
        headers: {
          'Authorization': afsConfig.authorization
        }
      }
    );
    
    console.log('✅ AFS Checkout Status Retrieved!');
    console.log('📋 Status Response:', JSON.stringify(response.data, null, 2));
    
    // Check for redirect URLs in the response
    if (response.data.shopperResultUrl) {
      console.log('🌐 Shopper Result URL found:', response.data.shopperResultUrl);
    } else {
      console.log('⚠️ No shopperResultUrl found in checkout');
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error checking AFS status:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test Step 3: Simulate registration callback
 */
async function testRegistrationCallback(checkoutId) {
  try {
    console.log('\n🔄 Step 3: Testing registration callback simulation...');
    
    const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/add-card/callback`, {
      checkoutId: checkoutId,
      customerEmail: TEST_CONFIG.customerEmail
    });
    
    console.log('✅ Callback test successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error in callback test:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runDebugTest() {
  console.log('=' * 50);
  console.log('🚀 Starting comprehensive add card debug test');
  console.log('=' * 50);
  
  // Step 1: Test preparation
  const prepareResult = await testPrepareCardRegistration();
  
  if (prepareResult && prepareResult.checkoutId) {
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Test callback (Skip step 2 as it requires actual card input)
    await testRegistrationCallback(prepareResult.checkoutId);
  }
  
  console.log('\n🏁 Debug test completed!');
  console.log('📋 Check the logs above for any issues.');
  console.log('\n💡 Tips for troubleshooting:');
  console.log('   1. Ensure backend is running on port 3000');
  console.log('   2. Check AFS credentials are valid');
  console.log('   3. Verify frontend URL is accessible');
  console.log('   4. Check network connectivity to AFS');
  
  process.exit(0);
}

// Run the test
runDebugTest().catch(error => {
  console.error('💥 Fatal error in debug test:', error);
  process.exit(1);
});
