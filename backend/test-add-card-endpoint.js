// Test the actual add card endpoint
import axios from 'axios';

async function testAddCardEndpoint() {
  try {
    console.log('🔄 Testing add card endpoint...');
    
    const testData = {
      customerEmail: 'test@example.com'
    };
    
    const response = await axios.post(
      'http://localhost:3000/api/add-card/prepare-registration',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success! Response:', response.data);
    
    if (response.data.success && response.data.checkoutId) {
      console.log('🔗 Widget URL:', `https://eu-test.oppwa.com/v1/checkouts/${response.data.checkoutId}?entityId=8ac7a4c97d8d45be017d8e96389e020a`);
    }
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testAddCardEndpoint();
