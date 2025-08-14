import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { handleAFSWebhook } from './Controllers/SubscriptionController.js';

// Load environment variables
dotenv.config();

/**
 * Manual webhook trigger for real payment transaction
 * This simulates the webhook that AFS should have sent but didn't
 */

async function connectToDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vzat_sandbox');
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function triggerRealWebhook() {
  // Real payment data from the screenshot and URL
  const realPaymentData = {
    quotepaymentId: 'aAWdu0000005XkvGAE',
    transactionId: '8ac7a4a098a5753f0198a7a227273910', // From screenshot
    checkoutId: '820234D9A928E51B5A68DD0CC58B5781.uat01-vm-tx04', // From URL
    amount: 210.00,
    timestamp: '2025-08-14T08:11:19.000Z' // From screenshot
  };
  
  console.log('🔄 =============== REAL WEBHOOK TRIGGER ===============');
  console.log('📋 Real Payment Data:');
  console.log(`  - Quote Payment ID: ${realPaymentData.quotepaymentId}`);
  console.log(`  - Transaction ID: ${realPaymentData.transactionId}`);
  console.log(`  - Checkout ID: ${realPaymentData.checkoutId}`);
  console.log(`  - Amount: ${realPaymentData.amount} AED`);
  console.log(`  - Timestamp: ${realPaymentData.timestamp}`);
  console.log('');
  
  // Create webhook payload as AFS would send it
  const webhookPayload = {
    id: realPaymentData.transactionId,
    paymentType: 'DB', // Direct Debit
    result: {
      code: '000.100.110',
      description: 'Successful transaction'
    },
    amount: realPaymentData.amount,
    currency: 'AED',
    merchantTransactionId: realPaymentData.quotepaymentId,
    registrationId: realPaymentData.checkoutId,
    timestamp: realPaymentData.timestamp,
    paymentBrand: 'VISA',
    descriptor: 'VZAT Payment'
  };
  
  console.log('📋 Webhook Payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log('');
  
  // Create mock request and response objects
  const mockReq = {
    body: webhookPayload,
    ip: '127.0.0.1',
    get: (header) => header === 'User-Agent' ? 'Manual-Webhook-Trigger/1.0' : 'application/json',
    headers: { 
      'user-agent': 'Manual-Webhook-Trigger/1.0',
      'content-type': 'application/json'
    },
    query: {},
    originalUrl: '/api/subscription/webhook/afs'
  };
  
  const mockRes = {
    status: function(code) { 
      this.statusCode = code; 
      console.log(`📤 Response Status: ${code}`);
      return this; 
    },
    json: function(data) { 
      this.responseData = data; 
      console.log(`📤 Response Data:`, JSON.stringify(data, null, 2));
      return this; 
    },
    statusCode: 200,
    responseData: null
  };
  
  try {
    console.log('🚀 Calling webhook handler...');
    console.log('');
    
    // Call the actual webhook handler
    await handleAFSWebhook(mockReq, mockRes);
    
    console.log('');
    console.log('✅ =============== WEBHOOK PROCESSING COMPLETE ===============');
    console.log(`📊 Final Status Code: ${mockRes.statusCode}`);
    console.log(`📊 Success: ${mockRes.statusCode === 200 ? 'YES' : 'NO'}`);
    
    if (mockRes.statusCode === 200) {
      console.log('🎉 Real payment webhook triggered successfully!');
      console.log('✅ Database should now be updated with correct payment status');
    } else {
      console.log('❌ Webhook processing failed');
      console.log('📋 Response:', mockRes.responseData);
    }
    
  } catch (error) {
    console.error('❌ Error triggering webhook:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

async function main() {
  try {
    await connectToDatabase();
    await triggerRealWebhook();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the webhook trigger
main();
