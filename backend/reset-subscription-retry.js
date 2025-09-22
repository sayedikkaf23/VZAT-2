import { connectDB, disconnectDB } from './config/db.js';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

async function resetSubscriptionRetry() {
  await connectDB();
  
  try {
    console.log('🔧 Resetting retry status for subscription aAWdu00000074ogGAA...');
    
    // Reset retry count and remove last_processed_date to allow retry
    const updatedSubscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId: 'aAWdu00000074ogGAA' },
      { 
        $unset: { 
          last_processed_date: 1,
          payment_retry_count: 1
        }
      },
      { new: true }
    );
    
    if (!updatedSubscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('✅ Retry status reset successfully!');
    console.log('📋 Updated data:');
    console.log('- payments_completed:', updatedSubscription.payments_completed);
    console.log('- InstallmentLeft:', updatedSubscription.InstallmentLeft);
    console.log('- last_processed_date:', updatedSubscription.last_processed_date);
    console.log('- payment_retry_count:', updatedSubscription.payment_retry_count);
    console.log('- next_charge_date:', updatedSubscription.next_charge_date);
    
    console.log('\n🎉 The subscription will now be picked up by the next cron job run!');
    
  } catch (error) {
    console.error('❌ Error resetting retry status:', error);
  } finally {
    await disconnectDB();
  }
}

resetSubscriptionRetry();
