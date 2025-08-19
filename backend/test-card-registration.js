import axios from 'axios';

// Test the card registration process
async function testCardRegistration() {
  try {
    console.log('🧪 Testing Card Registration Process...');
    
    const baseUrl = 'http://localhost:3001';
    
    // Test 1: Health check
    console.log('\n1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Prepare card registration
    console.log('\n2️⃣ Testing card registration preparation...');
    const prepareResponse = await axios.post(`${baseUrl}/api/cards/prepare-registration`, {
      customerEmail: 'test@example.com'
    });
    
    console.log('✅ Card preparation successful!');
    console.log('📋 Response:', JSON.stringify(prepareResponse.data, null, 2));
    
    const checkoutId = prepareResponse.data.checkoutId;
    console.log('🔑 Checkout ID:', checkoutId);
    
    // Test 3: Simulate successful callback (this would normally come from AFS)
    console.log('\n3️⃣ Testing registration callback simulation...');
    
    // Note: In real scenario, we would:
    // 1. Open the AFS widget with the checkout ID
    // 2. User enters card details
    // 3. AFS calls our callback URL with the resourcePath
    // 4. We query AFS to get the registration result
    
    // For testing, we'll simulate the callback with a resourcePath that would come from AFS
    const simulatedResourcePath = checkoutId; // In real scenario, this would be different
    
    console.log('📝 Simulating callback with resourcePath:', simulatedResourcePath);
    console.log('⚠️ Note: This will likely fail as we need real AFS registration data');
    console.log('   In production, AFS would provide the actual resourcePath after user completes registration');
    
    try {
      const callbackResponse = await axios.post(`${baseUrl}/api/cards/registration-callback`, {
        customerEmail: 'test@example.com',
        checkoutId: simulatedResourcePath  // Use checkoutId instead of resourcePath
      });
      
      console.log('✅ Callback test successful!');
      console.log('📋 Response:', JSON.stringify(callbackResponse.data, null, 2));
      
    } catch (callbackError) {
      console.log('⚠️ Expected callback test failure (need real AFS data):');
      console.log('📊 Status:', callbackError.response?.status);
      console.log('📋 Error:', callbackError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the test
testCardRegistration();
