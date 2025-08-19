// Debug script to check what AFS returns for a specific checkout ID
import axios from 'axios';

const AFS_CONFIG = {
  baseUrl: 'https://eu-test.oppwa.com',
  entityId: '8ac7a4c97d8d45be017d8e96389e020a',
  authorization: 'Bearer OGFjN2E0Yzk3ZDhkNDViZTAxN2Q4ZTk2Mzk3NjAyMGV8R3hQS0gyNjY5dA==',
  testMode: 'EXTERNAL'
};

// Replace this with the actual checkout ID you're testing with
const checkoutId = 'E23670C8D22B97C60233CF7E5FDCD041.uat01-vm-tx01';

async function debugAFSCheckout() {
  try {
    console.log('🔍 Debugging AFS Checkout...');
    console.log('🔑 Checkout ID:', checkoutId);
    
    // Try the payment endpoint first
    console.log('\n📞 1. Checking /payment endpoint...');
    try {
      const paymentResponse = await axios.get(
        `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/payment`,
        {
          params: { entityId: AFS_CONFIG.entityId },
          headers: { 'Authorization': AFS_CONFIG.authorization }
        }
      );
      console.log('✅ Payment endpoint success:', JSON.stringify(paymentResponse.data, null, 2));
    } catch (paymentError) {
      console.log('❌ Payment endpoint error:', paymentError.response?.status, paymentError.response?.data);
    }
    
    // Try the registration endpoint
    console.log('\n📞 2. Checking /registration endpoint...');
    try {
      const registrationResponse = await axios.get(
        `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/registration`,
        {
          params: { entityId: AFS_CONFIG.entityId },
          headers: { 'Authorization': AFS_CONFIG.authorization }
        }
      );
      console.log('✅ Registration endpoint success:', JSON.stringify(registrationResponse.data, null, 2));
    } catch (registrationError) {
      console.log('❌ Registration endpoint error:', registrationError.response?.status, JSON.stringify(registrationError.response?.data, null, 2));
    }
    
    // Try the base checkout endpoint
    console.log('\n📞 3. Checking base checkout endpoint...');
    try {
      const checkoutResponse = await axios.get(
        `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}`,
        {
          params: { entityId: AFS_CONFIG.entityId },
          headers: { 'Authorization': AFS_CONFIG.authorization }
        }
      );
      console.log('✅ Base checkout endpoint success:', JSON.stringify(checkoutResponse.data, null, 2));
    } catch (checkoutError) {
      console.log('❌ Base checkout endpoint error:', checkoutError.response?.status, JSON.stringify(checkoutError.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

debugAFSCheckout();
