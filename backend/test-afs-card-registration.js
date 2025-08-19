// Debug script for testing AFS card registration API
import axios from 'axios';

const AFS_CONFIG = {
  baseUrl: 'https://eu-test.oppwa.com',
  entityId: '8ac7a4c97d8d45be017d8e96389e020a',
  authorization: 'Bearer OGFjN2E0Yzk3ZDhkNDViZTAxN2Q4ZTk2Mzk3NjAyMGV8R3hQS0gyNjY5dA==',
  testMode: 'EXTERNAL'
};

async function testAFSCardRegistration() {
  try {
    console.log('🔄 Testing AFS card registration...');
    
    const customerEmail = 'test@example.com';
    const baseUrl = 'https://vzatnew.yeepeey.com';
    const shopperResultUrl = `${baseUrl}/saved-card/add-card`;
    
    const checkoutData = new URLSearchParams({
      entityId: AFS_CONFIG.entityId,
      testMode: AFS_CONFIG.testMode,
      createRegistration: 'true',
      'customer.email': customerEmail,
      'customer.merchantCustomerId': customerEmail.split('@')[0],
      shopperResultUrl: shopperResultUrl,
      'paymentType': 'PA',
      'amount': '1.00',
      'currency': 'AED',
      'billing.country': 'AE',
      'billing.city': 'Dubai',
      'merchantTransactionId': `card_reg_${Date.now()}_${customerEmail.split('@')[0]}`,
      'customParameters[SHOPPER_locale]': 'en_US'
    });

    console.log('📋 Request data:', Object.fromEntries(checkoutData.entries()));

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

    console.log('✅ Success! Response:', response.data);
    console.log('🔗 Checkout URL would be:', `${AFS_CONFIG.baseUrl}/v1/checkouts/${response.data.id}`);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    
    // Show parameter errors specifically
    if (error.response?.data?.result?.parameterErrors) {
      console.error('❌ Parameter Errors:');
      error.response.data.result.parameterErrors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${JSON.stringify(err)}`);
      });
    }
    console.error('Full error:', error.message);
  }
}

testAFSCardRegistration();
