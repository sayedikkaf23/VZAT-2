// Test script to verify the add card API endpoint
import axios from 'axios';

async function testAddCardAPI() {
  try {
    console.log('🔄 Testing /api/cards/prepare-registration endpoint...');
    
    const response = await axios.post('http://localhost:3000/api/cards/prepare-registration', {
      customerEmail: 'sayed1223@yeepeey.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testAddCardAPI();
