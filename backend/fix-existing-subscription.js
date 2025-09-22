import { connectDB, disconnectDB } from './config/db.js';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

async function fixAllSubscriptionsWithMissingInstallmentLeft() {
  await connectDB();
  
  try {
    console.log('🔧 Finding all subscriptions with missing InstallmentLeft field...');
    
    // Find all subscriptions that have payment_schedule but missing InstallmentLeft
    const subscriptionsToFix = await Vzat_Recurring_Data.find({
      payment_schedule: { $exists: true, $ne: null },
      $or: [
        { InstallmentLeft: { $exists: false } },
        { InstallmentLeft: null }
      ]
    });
    
    console.log(`📋 Found ${subscriptionsToFix.length} subscriptions to fix`);
    
    if (subscriptionsToFix.length === 0) {
      console.log('✅ No subscriptions need fixing!');
      return;
    }
    
    let fixedCount = 0;
    
    for (const subscription of subscriptionsToFix) {
      try {
        console.log(`\n🔧 Fixing subscription: ${subscription.quotepaymentId}`);
        console.log('- payments_completed:', subscription.payments_completed);
        console.log('- InstallmentLeft:', subscription.InstallmentLeft);
        console.log('- payment_schedule length:', subscription.payment_schedule?.length);
        
        // Calculate InstallmentLeft from payment_schedule
        const totalInstallments = subscription.payment_schedule?.length || 0;
        const completedPayments = subscription.payments_completed || 0;
        const installmentLeft = totalInstallments - completedPayments;
        
        console.log('📊 Calculated:');
        console.log('- Total installments:', totalInstallments);
        console.log('- Completed payments:', completedPayments);
        console.log('- InstallmentLeft should be:', installmentLeft);
        
        // Update the subscription
        const updatedSubscription = await Vzat_Recurring_Data.findOneAndUpdate(
          { _id: subscription._id },
          { 
            InstallmentLeft: installmentLeft,
            is_subscription: true,
            subscription_status: 'active'
          },
          { new: true }
        );
        
        console.log('✅ Subscription updated successfully!');
        console.log('📋 Updated data:');
        console.log('- payments_completed:', updatedSubscription.payments_completed);
        console.log('- InstallmentLeft:', updatedSubscription.InstallmentLeft);
        console.log('- is_subscription:', updatedSubscription.is_subscription);
        console.log('- subscription_status:', updatedSubscription.subscription_status);
        console.log('- Remaining payments:', updatedSubscription.InstallmentLeft - updatedSubscription.payments_completed);
        
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing subscription ${subscription.quotepaymentId}:`, error);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} out of ${subscriptionsToFix.length} subscriptions`);
    
  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
  } finally {
    await disconnectDB();
  }
}

fixAllSubscriptionsWithMissingInstallmentLeft();
