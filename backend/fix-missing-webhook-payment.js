import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

// Load environment variables
dotenv.config();

/**
 * Manual payment fix for aAWdu0000005XkvGAE - Payment completed but webhook not received
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

async function fixPayment() {
  const quotepaymentId = 'aAWdu0000005XkvGAE';
  const realTransactionId = '820234D9A928E51B5A68DD0CC58B5781'; // From the AFS checkout ID
  const registrationId = '820234D9A928E51B5A68DD0CC58B5781.uat01-vm-tx04'; // From logs
  
  console.log('🔧 =============== MANUAL PAYMENT FIX ===============');
  console.log(`📋 Quote Payment ID: ${quotepaymentId}`);
  console.log(`📋 Transaction ID: ${realTransactionId}`);
  console.log(`📋 Registration ID: ${registrationId}`);
  console.log('');
  
  try {
    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('✅ Found subscription:');
    console.log(`  - Current Status: ${subscription.subscription_status}`);
    console.log(`  - Payments Completed: ${subscription.payments_completed || 0}`);
    console.log('');
    
    // Update subscription status to active and mark first payment as completed
    console.log('🔄 Updating subscription status and payment schedule...');
    
    const updateResult = await Vzat_Recurring_Data.findByIdAndUpdate(
      subscription._id,
      {
        subscription_status: 'active',
        afs_registration_id: registrationId,
        payments_completed: 1,
        last_payment_date: new Date()
      },
      { new: true }
    );
    
    console.log('✅ Subscription updated:');
    console.log(`  - Status: ${updateResult.subscription_status}`);
    console.log(`  - Payments Completed: ${updateResult.payments_completed}`);
    console.log(`  - Registration ID: ${updateResult.afs_registration_id}`);
    console.log('');
    
    // Update payment schedule: mark payment 1 as completed, payment 2 as due
    console.log('🔄 Updating payment schedule...');
    
    // Mark payment 1 as completed
    const payment1Update = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscription._id,
        'payment_schedule.installment_number': 1
      },
      {
        $set: {
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': realTransactionId,
          'payment_schedule.$.payment_date': new Date()
        }
      },
      { new: true }
    );
    
    if (payment1Update) {
      console.log('✅ Payment #1 marked as completed');
    }
    
    // Mark payment 2 as due
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
    console.log('📊 =============== UPDATED PAYMENT SCHEDULE ===============');
    
    // Fetch updated subscription to show final state
    const finalSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    
    if (finalSubscription && finalSubscription.payment_schedule) {
      finalSubscription.payment_schedule.forEach((payment, index) => {
        const statusIcon = payment.status === 'completed' ? '✅' : 
                          payment.status === 'due' ? '🔔' : '⏳';
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
    
    console.log('🎉 =============== PAYMENT FIX COMPLETED ===============');
    console.log('✅ Subscription is now active');
    console.log('✅ First payment marked as completed');
    console.log('✅ Second payment is now due');
    
  } catch (error) {
    console.error('❌ Error fixing payment:', error);
  }
}

async function main() {
  try {
    await connectToDatabase();
    await fixPayment();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
main();
