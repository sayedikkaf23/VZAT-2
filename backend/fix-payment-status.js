/**
 * Manual script to fix payment status for completed payments
 */

import mongoose from 'mongoose';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixPaymentStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // Specific transaction details
    const transactionId = '8ac7a4a198a56f6f0198a75c43943d8a';
    const quotepaymentId = 'aAWdu0000005XbFGAU';
    const customerEmail = 'sayed222@yeepeey.com';

    console.log(`🔄 Fixing payment status for transaction: ${transactionId}`);
    console.log(`📋 Quote Payment ID: ${quotepaymentId}`);
    console.log(`📧 Customer Email: ${customerEmail}`);

    // Find the subscription record
    const subscription = await Vzat_Recurring_Data.findOne({
      quotepaymentId: quotepaymentId,
      opp_email: customerEmail
    });

    if (!subscription) {
      console.error('❌ Subscription not found');
      return;
    }

    console.log(`📋 Found subscription: ${subscription._id}`);
    console.log(`📊 Current payments_completed: ${subscription.payments_completed}`);
    console.log(`📊 Payment schedule length: ${subscription.payment_schedule?.length || 0}`);

    // Update payments_completed
    const updatedSubscription = await Vzat_Recurring_Data.findByIdAndUpdate(
      subscription._id,
      {
        $inc: { payments_completed: 1 },
        last_payment_date: new Date('2025-08-14T06:54:58.000Z'),
        subscription_status: 'active'
      },
      { new: true }
    );

    console.log(`✅ Updated payments_completed to: ${updatedSubscription.payments_completed}`);

    // Update payment schedule if it exists
    if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
      // Find the first payment that's not completed
      const paymentToUpdate = subscription.payment_schedule.find(
        payment => payment.status !***REMOVED*** 'completed' && payment.status !***REMOVED*** 'paid'
      );

      if (paymentToUpdate) {
        console.log(`🔄 Updating payment schedule for installment: ${paymentToUpdate.installment_number}`);
        
        // Update the specific payment status
        await Vzat_Recurring_Data.findOneAndUpdate(
          { 
            _id: subscription._id,
            'payment_schedule.installment_number': paymentToUpdate.installment_number
          },
          {
            $set: {
              'payment_schedule.$.status': 'completed',
              'payment_schedule.$.transaction_id': transactionId,
              'payment_schedule.$.payment_date': new Date('2025-08-14T06:54:58.000Z')
            }
          }
        );

        // Update next payment to 'due' if it exists
        const nextPayment = subscription.payment_schedule.find(
          payment => payment.installment_number ***REMOVED***= paymentToUpdate.installment_number + 1
        );

        if (nextPayment) {
          await Vzat_Recurring_Data.findOneAndUpdate(
            { 
              _id: subscription._id,
              'payment_schedule.installment_number': nextPayment.installment_number
            },
            {
              $set: {
                'payment_schedule.$.status': 'due'
              }
            }
          );
          console.log(`✅ Next payment (${nextPayment.installment_number}) set to 'due'`);
        }

        console.log(`✅ Payment schedule updated for installment ${paymentToUpdate.installment_number}`);
      } else {
        console.log('⚠️ No pending payments found in payment schedule');
      }
    } else {
      console.log('⚠️ No payment schedule found - this is using legacy payment tracking');
    }

    // Display final status
    const finalSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    console.log('\n📊 Final Status:');
    console.log(`   payments_completed: ${finalSubscription.payments_completed}`);
    console.log(`   subscription_status: ${finalSubscription.subscription_status}`);
    console.log(`   last_payment_date: ${finalSubscription.last_payment_date}`);
    
    if (finalSubscription.payment_schedule) {
      console.log('\n💳 Payment Schedule:');
      finalSubscription.payment_schedule.forEach(payment => {
        console.log(`   Installment ${payment.installment_number}: ${payment.status} - ${payment.amount} (${payment.due_date})`);
      });
    }

    console.log('\n✅ Payment status fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing payment status:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the fix
fixPaymentStatus();
