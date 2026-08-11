import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    const quotepaymentId = 'a9Xav000000D6pBEAS';
    const email = 'keithrowley@optimityms.com';
    const txnId = '8acda4a49d9678b9019db991107a4fc1';

    console.log('\n--- SEARCHING SALESFORCE API LOGS ---');
    
    // Find logs that contain the key identifiers
    const query = {
      $or: [
        { quotepaymentId: quotepaymentId },
        { 'requestData.QuotePaymentId': quotepaymentId },
        { 'requestData.Transaction_Number': txnId },
        { 'requestData.Message': { $regex: quotepaymentId } }
      ]
    };

    const logs = await db.collection('salesforce_api_logs').find(query).sort({ createdAt: 1 }).toArray();
    console.log(`Found ${logs.length} logs:`);

    logs.forEach((l, index) => {
      console.log(`\n[${index + 1}] [${l.createdAt}] Endpoint: ${l.endpoint}`);
      console.log(`    Success: ${l.isSuccess}`);
      if (l.requestData) console.log(`    RequestData: ${JSON.stringify(l.requestData)}`);
      if (l.responseData) console.log(`    ResponseData: ${JSON.stringify(l.responseData)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

run();
