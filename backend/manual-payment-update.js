import mongoose from 'mongoose';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.sandbox' });

/**
 * Manual script to update payment status for a successful payment
 */
async function updatePaymentStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Transaction details from the payment
    const transactionId = '8ac7a4a198a56f6f0198a75c43943d8a';
    const quotepaymentId = 'aAWdu0000005XhhGAE'; // Correct Quote Payment ID for 210 AED
    const paymentAmount = 210.00;
    const paymentDate = new Date('2025-08-14T06:54:58Z');

    console.log('📋 Payment Details:');
    console.log(`  - Transaction ID: ${transactionId}`);
    console.log(`  - Quote Payment ID: ${quotepaymentId}`);
    console.log(`  - Amount: ${paymentAmount} AED`);
    console.log(`  - Payment Date: ${paymentDate.toISOString()}`);

    // Find the subscription
    console.log('\n🔍 Finding subscription...');
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });

    if (!subscription) {
      throw new Error(`Subscription not found for quotepaymentId: ${quotepaymentId}`);
    }

    console.log('✅ Found subscription:');
    console.log(`  - Customer: ${subscription.Customer_name}`);
    console.log(`  - Email: ${subscription.opp_email}`);
    console.log(`  - Current Status: ${subscription.subscription_status}`);
    console.log(`  - Payments Completed: ${subscription.payments_completed}`);
    console.log(`  - Payment Schedule Length: ${subscription.payment_schedule?.length || 0}`);

    // Update subscription status and payment completion
    console.log('\n🔄 Updating subscription status...');
    await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
      subscription_status: 'active',
      payments_completed: 1,
      last_payment_date: paymentDate,
      afs_registration_id: transactionId // Store transaction ID as registration ID
    });

    // Update the first payment in payment_schedule
    console.log('🔄 Updating payment schedule...');
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscription._id,
        'payment_schedule.installment_number': 1
      },
      {
        $set: {
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': transactionId,
          'payment_schedule.$.payment_date': paymentDate
        }
      },
      { new: true }
    );

    if (updateResult) {
      console.log('✅ Payment schedule updated for installment 1');
    } else {
      console.warn('⚠️ Could not update payment schedule');
    }

    // Update the next payment status to 'due'
    console.log('🔄 Updating next payment to due status...');
    await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscription._id,
        'payment_schedule.installment_number': 2,
        'payment_schedule.status': 'pending'
      },
      {
        $set: {
          'payment_schedule.$.status': 'due'
        }
      }
    );

    // Verify the updates
    console.log('\n✅ Verification - Fetching updated subscription...');
    const updatedSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    
    console.log('📊 Updated Subscription Status:');
    console.log(`  - Subscription Status: ${updatedSubscription.subscription_status}`);
    console.log(`  - Payments Completed: ${updatedSubscription.payments_completed}`);
    console.log(`  - Last Payment Date: ${updatedSubscription.last_payment_date}`);
    console.log(`  - AFS Registration ID: ${updatedSubscription.afs_registration_id}`);

    if (updatedSubscription.payment_schedule && updatedSubscription.payment_schedule.length > 0) {
      console.log('  - Payment Schedule:');
      updatedSubscription.payment_schedule.forEach((payment, index) => {
        console.log(`    ${index + 1}. Installment ${payment.installment_number}: ${payment.status} - ${payment.amount} AED on ${payment.due_date}${payment.transaction_id ? ` (TxnID: ${payment.transaction_id})` : ''}`);
      });
    }

    console.log('\n🎉 Payment status updated successfully!');
    console.log('✅ The subscription should now show the first payment as completed and the next payment as due.');

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the update
updatePaymentStatus();
