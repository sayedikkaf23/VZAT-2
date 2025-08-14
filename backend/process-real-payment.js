import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

// Load environment variables
dotenv.config();

/**
 * Process the actual successful payment from AFS
 * Transaction ID: 8ac7a4a098a5753f0198a7a227273910
 * Quote Payment ID: aAWdu0000005XkvGAE
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

async function processRealPayment() {
  const quotepaymentId = 'aAWdu0000005XkvGAE';
  const realTransactionId = '8ac7a4a098a5753f0198a7a227273910';
  const registrationId = '820234D9A928E51B5A68DD0CC58B5781.uat01-vm-tx04';
  const paymentTimestamp = new Date('2025-08-14T08:11:19.000Z');
  
  console.log('💳 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= PROCESSING REAL PAYMENT ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
  console.log(`📋 Quote Payment ID: ${quotepaymentId}`);
  console.log(`📋 Transaction ID: ${realTransactionId}`);
  console.log(`📋 Registration ID: ${registrationId}`);
  console.log(`📋 Payment Amount: 210 AED`);
  console.log(`📋 Payment Time: ${paymentTimestamp.toISOString()}`);
  console.log('');
  
  try {
    // Find the subscription
    console.log('🔍 Finding subscription...');
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('✅ Found subscription:');
    console.log(`  - ID: ${subscription._id}`);
    console.log(`  - Customer: ${subscription.Customer_name}`);
    console.log(`  - Current Status: ${subscription.subscription_status}`);
    console.log(`  - Payments Completed: ${subscription.payments_completed || 0}`);
    console.log('');
    
    // Check if this is the first payment (subscription status = pending)
    const isFirstPayment = subscription.subscription_status ***REMOVED***= 'pending' && 
                          (subscription.payments_completed || 0) ***REMOVED***= 0;
    
    if (isFirstPayment) {
      console.log('🎉 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= PROCESSING FIRST PAYMENT ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
      
      // 1. Update subscription status to active
      console.log('🔄 Activating subscription...');
      const subscriptionUpdate = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscription._id,
        {
          subscription_status: 'active',
          afs_registration_id: registrationId,
          payments_completed: 1,
          last_payment_date: paymentTimestamp
        },
        { new: true }
      );
      
      console.log('✅ Subscription activated:');
      console.log(`  - Status: ${subscriptionUpdate.subscription_status}`);
      console.log(`  - Payments Completed: ${subscriptionUpdate.payments_completed}`);
      console.log(`  - Registration ID: ${subscriptionUpdate.afs_registration_id}`);
      console.log(`  - Last Payment: ${subscriptionUpdate.last_payment_date}`);
      console.log('');
      
      // 2. Mark payment #1 as completed
      console.log('🔄 Updating payment schedule...');
      const payment1Update = await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          _id: subscription._id,
          'payment_schedule.installment_number': 1
        },
        {
          $set: {
            'payment_schedule.$.status': 'completed',
            'payment_schedule.$.transaction_id': realTransactionId,
            'payment_schedule.$.payment_date': paymentTimestamp
          }
        },
        { new: true }
      );
      
      if (payment1Update) {
        console.log('✅ Payment #1 marked as completed');
        
        // Find the updated payment details
        const updatedPayment = payment1Update.payment_schedule.find(p => p.installment_number ***REMOVED***= 1);
        if (updatedPayment) {
          console.log(`  - Transaction ID: ${updatedPayment.transaction_id}`);
          console.log(`  - Payment Date: ${updatedPayment.payment_date}`);
          console.log(`  - Status: ${updatedPayment.status}`);
        }
      }
      
      // 3. Mark payment #2 as due
      const payment2Update = await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          _id: subscription._id,
          'payment_schedule.installment_number': 2
        },
        {
          $set: {
            'payment_schedule.$.status': 'due'
          }
        },
        { new: true }
      );
      
      if (payment2Update) {
        console.log('✅ Payment #2 marked as due');
      }
      
      console.log('');
      console.log('📊 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= FINAL PAYMENT SCHEDULE ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
      
      // Show final payment schedule
      const finalSubscription = await Vzat_Recurring_Data.findById(subscription._id);
      if (finalSubscription && finalSubscription.payment_schedule) {
        finalSubscription.payment_schedule.forEach((payment, index) => {
          const statusIcon = payment.status ***REMOVED***= 'completed' ? '✅' : 
                            payment.status ***REMOVED***= 'due' ? '🔔' : '⏳';
          console.log(`${statusIcon} Payment ${payment.installment_number}: ${payment.status.toUpperCase()}`);
          console.log(`   Amount: ${payment.amount} AED`);
          console.log(`   Due Date: ${payment.due_date}`);
          if (payment.transaction_id) {
            console.log(`   Transaction ID: ${payment.transaction_id}`);
          }
          if (payment.payment_date) {
            console.log(`   Payment Date: ${payment.payment_date}`);
          }
          console.log('');
        });
      }
      
      console.log('🎉 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= PAYMENT PROCESSING COMPLETE ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
      console.log('✅ First payment successfully processed');
      console.log('✅ Subscription is now ACTIVE');
      console.log('✅ Customer can now access their portal');
      console.log('✅ Next payment will be automatically processed on due date');
      
    } else {
      console.log('ℹ️ This appears to be a recurring payment or subscription already active');
      console.log(`   Current status: ${subscription.subscription_status}`);
      console.log(`   Payments completed: ${subscription.payments_completed || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error processing payment:', error);
  }
}

async function main() {
  try {
    await connectToDatabase();
    await processRealPayment();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the payment processing
main();
