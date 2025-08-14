import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

// Load environment variables
dotenv.config();

/**
 * Simple subscription checker and tester
 * Usage: 
 *   node test-subscription-simple.js list
 *   node test-subscription-simple.js check <quotepaymentId>
 *   node test-subscription-simple.js pay <quotepaymentId> [amount]
 *   node test-subscription-simple.js fail <quotepaymentId>
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
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

async function listSubscriptions() {
  console.log('📋 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= ALL SUBSCRIPTIONS ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
  
  try {
    const subscriptions = await Vzat_Recurring_Data.find({})
      .select('quotepaymentId Customer_name opp_email subscription_status payments_completed InstallmentLeft Total_After_VAT_Currency CreatedDate')
      .sort({ CreatedDate: -1 })
      .limit(20);
    
    if (subscriptions.length ***REMOVED***= 0) {
      console.log('❌ No subscriptions found');
      return;
    }
    
    console.log(`Found ${subscriptions.length} subscription(s):\n`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Quote Payment ID: ${sub.quotepaymentId}`);
      console.log(`   Customer: ${sub.Customer_name || 'N/A'}`);
      console.log(`   Email: ${sub.opp_email || 'N/A'}`);
      console.log(`   Status: ${sub.subscription_status || 'N/A'}`);
      console.log(`   Payments: ${sub.payments_completed || 0}/${sub.InstallmentLeft || 0}`);
      console.log(`   Amount: ${sub.Total_After_VAT_Currency || 0} AED`);
      console.log(`   Created: ${sub.CreatedDate || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing subscriptions:', error);
  }
}

async function checkSubscription(quotepaymentId) {
  console.log(`🔍 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= CHECKING SUBSCRIPTION: ${quotepaymentId} ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=`);
  
  try {
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      return null;
    }
    
    console.log('✅ Subscription Details:');
    console.log(`📋 Basic Info:`);
    console.log(`   ID: ${subscription._id}`);
    console.log(`   Quote Payment ID: ${subscription.quotepaymentId}`);
    console.log(`   Customer: ${subscription.Customer_name || 'N/A'}`);
    console.log(`   Email: ${subscription.opp_email || 'N/A'}`);
    console.log(`   Phone: ${subscription.opp_phone || 'N/A'}`);
    console.log('');
    
    console.log(`💰 Payment Info:`);
    console.log(`   Total Amount: ${subscription.Total_After_VAT_Currency || 0} AED`);
    console.log(`   Installment Type: ${subscription.InstallmentType || 'N/A'}`);
    console.log(`   Total Installments: ${subscription.InstallmentLeft || 0}`);
    console.log(`   Payments Completed: ${subscription.payments_completed || 0}`);
    console.log(`   Subscription Status: ${subscription.subscription_status || 'N/A'}`);
    console.log('');
    
    console.log(`🔗 AFS Info:`);
    console.log(`   Checkout ID: ${subscription.afs_checkout_id || 'N/A'}`);
    console.log(`   Registration ID: ${subscription.afs_registration_id || 'N/A'}`);
    console.log(`   Last Payment: ${subscription.last_payment_date || 'N/A'}`);
    console.log('');
    
    if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
      console.log(`📅 Payment Schedule (${subscription.payment_schedule.length} payments):`);
      subscription.payment_schedule.forEach((payment, index) => {
        const statusIcon = payment.status ***REMOVED***= 'completed' ? '✅' : 
                          payment.status ***REMOVED***= 'due' ? '🔔' : 
                          payment.status ***REMOVED***= 'overdue' ? '⚠️' : '⏳';
        
        console.log(`   ${statusIcon} Payment ${payment.installment_number}: ${payment.status.toUpperCase()}`);
        console.log(`      Amount: ${payment.amount} AED`);
        console.log(`      Due Date: ${payment.due_date}`);
        if (payment.transaction_id) {
          console.log(`      Transaction ID: ${payment.transaction_id}`);
        }
        if (payment.payment_date) {
          console.log(`      Payment Date: ${payment.payment_date}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No payment schedule found');
    }
    
    return subscription;
    
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return null;
  }
}

async function simulatePayment(quotepaymentId, amount, isSuccess = true) {
  console.log(`💳 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= SIMULATING ${isSuccess ? 'SUCCESSFUL' : 'FAILED'} PAYMENT ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=`);
  console.log(`Quote Payment ID: ${quotepaymentId}`);
  console.log(`Amount: ${amount} AED`);
  console.log(`Expected Result: ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);
  console.log('');
  
  try {
    // First check the current state
    const subscription = await checkSubscription(quotepaymentId);
    if (!subscription) return;
    
    console.log('🎭 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= SIMULATING WEBHOOK CALL ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
    
    // Import the webhook handler
    const { handleAFSWebhook } = await import('./Controllers/SubscriptionController.js');
    
    // Create mock webhook data
    const transactionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockReq = {
      body: {
        id: transactionId,
        paymentType: 'DB',
        result: {
          code: isSuccess ? '000.100.110' : '800.100.153',
          description: isSuccess ? 'Successful transaction' : 'Transaction declined'
        },
        amount: amount,
        currency: 'AED',
        merchantTransactionId: quotepaymentId,
        registrationId: isSuccess ? `reg_${Date.now()}` : null,
        timestamp: new Date().toISOString()
      }
    };
    
    const mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; },
      statusCode: 200,
      responseData: null
    };
    
    console.log(`📤 Sending webhook with transaction ID: ${transactionId}`);
    
    // Process the webhook
    await handleAFSWebhook(mockReq, mockRes);
    
    console.log(`✅ Webhook processed with status: ${mockRes.statusCode}`);
    console.log('');
    
    // Show updated state
    console.log('📊 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= UPDATED STATE ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
    await checkSubscription(quotepaymentId);
    
  } catch (error) {
    console.error('❌ Error simulating payment:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length ***REMOVED***= 0) {
    console.log('❌ Usage:');
    console.log('  node test-subscription-simple.js list');
    console.log('  node test-subscription-simple.js check <quotepaymentId>');
    console.log('  node test-subscription-simple.js pay <quotepaymentId> [amount]');
    console.log('  node test-subscription-simple.js fail <quotepaymentId>');
    console.log('');
    console.log('📋 Examples:');
    console.log('  node test-subscription-simple.js list');
    console.log('  node test-subscription-simple.js check aAWdu0000005XhhGAE');
    console.log('  node test-subscription-simple.js pay aAWdu0000005XhhGAE 210');
    console.log('  node test-subscription-simple.js fail aAWdu0000005XhhGAE');
    process.exit(1);
  }
  
  const command = args[0];
  
  try {
    await connectToDatabase();
    
    switch (command) {
      case 'list':
        await listSubscriptions();
        break;
        
      case 'check':
        if (args.length < 2) {
          console.log('❌ Usage: node test-subscription-simple.js check <quotepaymentId>');
          break;
        }
        await checkSubscription(args[1]);
        break;
        
      case 'pay':
        if (args.length < 2) {
          console.log('❌ Usage: node test-subscription-simple.js pay <quotepaymentId> [amount]');
          break;
        }
        const amount = parseFloat(args[2]) || 210;
        await simulatePayment(args[1], amount, true);
        break;
        
      case 'fail':
        if (args.length < 2) {
          console.log('❌ Usage: node test-subscription-simple.js fail <quotepaymentId>');
          break;
        }
        await simulatePayment(args[1], 210, false);
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Available commands: list, check, pay, fail');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the script
main();
