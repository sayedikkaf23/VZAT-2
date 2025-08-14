import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { handleAFSWebhook } from './Controllers/SubscriptionController.js';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

// Load environment variables
dotenv.config();

/**
 * Test script to simulate subscription webhook processing
 * Usage: node test-subscription-webhook.js <quotepaymentId> <paymentNumber> [success|failed]
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

async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
}

async function findSubscription(quotepaymentId) {
  try {
    console.log(`🔍 Looking for subscription with quotepaymentId: ${quotepaymentId}`);
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      console.log('📋 Available subscriptions:');
      const allSubs = await Vzat_Recurring_Data.find({}).select('quotepaymentId Customer_name opp_email subscription_status payments_completed').limit(10);
      allSubs.forEach(sub => {
        console.log(`  - QP ID: ${sub.quotepaymentId} | Customer: ${sub.Customer_name} | Status: ${sub.subscription_status} | Payments: ${sub.payments_completed || 0}`);
      });
      return null;
    }
    
    console.log('✅ Found subscription:');
    console.log(`  - ID: ${subscription._id}`);
    console.log(`  - Customer: ${subscription.Customer_name}`);
    console.log(`  - Email: ${subscription.opp_email}`);
    console.log(`  - Status: ${subscription.subscription_status}`);
    console.log(`  - Payments Completed: ${subscription.payments_completed || 0}`);
    console.log(`  - Total Installments: ${subscription.InstallmentLeft}`);
    console.log(`  - Payment Schedule Length: ${subscription.payment_schedule?.length || 0}`);
    
    if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
      console.log('📋 Current Payment Schedule:');
      subscription.payment_schedule.forEach((payment, index) => {
        console.log(`    Payment ${payment.installment_number}: ${payment.status} | Amount: ${payment.amount} AED | Due: ${payment.due_date}`);
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('❌ Error finding subscription:', error);
    return null;
  }
}

function createMockRequest(quotepaymentId, paymentNumber = 1, isSuccess = true, amount = 210) {
  const transactionId = `test_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Determine if this should be treated as first payment or recurring
  const paymentType = 'DB'; // Always DB as per the updated logic
  
  const mockWebhook = {
    body: {
      id: transactionId,
      paymentType: paymentType,
      result: {
        code: isSuccess ? '000.100.110' : '800.100.153',
        description: isSuccess ? 'Successful transaction' : 'Transaction declined'
      },
      amount: amount,
      currency: 'AED',
      merchantTransactionId: quotepaymentId,
      registrationId: isSuccess ? `reg_${Date.now()}` : null,
      timestamp: timestamp,
      descriptor: 'VZAT Payment',
      paymentBrand: 'VISA'
    }
  };
  
  console.log('🎭 Created mock webhook request:');
  console.log(`  - Transaction ID: ${transactionId}`);
  console.log(`  - Payment Type: ${paymentType}`);
  console.log(`  - Result: ${mockWebhook.body.result.code} - ${mockWebhook.body.result.description}`);
  console.log(`  - Amount: ${amount} ${mockWebhook.body.currency}`);
  console.log(`  - Merchant Transaction ID: ${quotepaymentId}`);
  console.log(`  - Registration ID: ${mockWebhook.body.registrationId || 'N/A'}`);
  
  return mockWebhook;
}

function createMockResponse() {
  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.responseData = data;
      console.log(`📤 Mock Response [${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    },
    statusCode: 200,
    responseData: null
  };
  
  return mockRes;
}

async function testSubscriptionWebhook() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('❌ Usage: node test-subscription-webhook.js <quotepaymentId> [paymentNumber] [success|failed] [amount]');
    console.log('📋 Examples:');
    console.log('  node test-subscription-webhook.js aAWdu0000005XhhGAE 1 success 210');
    console.log('  node test-subscription-webhook.js aAWdu0000005XhhGAE 2 failed 210');
    console.log('  node test-subscription-webhook.js aAWdu0000005XhhGAE 1 success');
    process.exit(1);
  }
  
  const quotepaymentId = args[0];
  const paymentNumber = parseInt(args[1]) || 1;
  const isSuccess = args[2] !== 'failed';
  const amount = parseFloat(args[3]) || 210;
  
  console.log('🚀 =============== SUBSCRIPTION WEBHOOK TEST ===============');
  console.log(`📋 Test Parameters:`);
  console.log(`  - Quote Payment ID: ${quotepaymentId}`);
  console.log(`  - Payment Number: ${paymentNumber}`);
  console.log(`  - Success: ${isSuccess}`);
  console.log(`  - Amount: ${amount} AED`);
  console.log('');
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Find the subscription
    const subscription = await findSubscription(quotepaymentId);
    if (!subscription) {
      await disconnectFromDatabase();
      return;
    }
    
    console.log('');
    console.log('🎭 =============== SIMULATING WEBHOOK ===============');
    
    // Create mock request and response
    const mockReq = createMockRequest(quotepaymentId, paymentNumber, isSuccess, amount);
    const mockRes = createMockResponse();
    
    console.log('');
    console.log('🔄 Processing webhook...');
    
    // Call the webhook handler
    await handleAFSWebhook(mockReq, mockRes);
    
    console.log('');
    console.log('✅ =============== WEBHOOK PROCESSING COMPLETE ===============');
    
    // Fetch updated subscription to show changes
    console.log('');
    console.log('📊 =============== UPDATED SUBSCRIPTION STATUS ===============');
    const updatedSubscription = await findSubscription(quotepaymentId);
    
    if (updatedSubscription) {
      console.log('');
      console.log('🔄 Changes Made:');
      
      if (subscription.subscription_status !== updatedSubscription.subscription_status) {
        console.log(`  ✅ Subscription Status: ${subscription.subscription_status} → ${updatedSubscription.subscription_status}`);
      }
      
      if ((subscription.payments_completed || 0) !== (updatedSubscription.payments_completed || 0)) {
        console.log(`  ✅ Payments Completed: ${subscription.payments_completed || 0} → ${updatedSubscription.payments_completed || 0}`);
      }
      
      if (updatedSubscription.payment_schedule && updatedSubscription.payment_schedule.length > 0) {
        console.log('  ✅ Payment Schedule Updates:');
        updatedSubscription.payment_schedule.forEach((payment, index) => {
          const oldPayment = subscription.payment_schedule?.[index];
          if (oldPayment && oldPayment.status !== payment.status) {
            console.log(`    Payment ${payment.installment_number}: ${oldPayment.status} → ${payment.status}`);
            if (payment.transaction_id) {
              console.log(`      Transaction ID: ${payment.transaction_id}`);
            }
            if (payment.payment_date) {
              console.log(`      Payment Date: ${payment.payment_date}`);
            }
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await disconnectFromDatabase();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
testSubscriptionWebhook();
