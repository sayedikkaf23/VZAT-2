import cron from 'node-cron';
import { processRecurringPayments } from '../Controllers/SubscriptionController.js';

/**
 * Set up cron jobs for subscription management
 */
export function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...');
  
  // Run daily at 9:30 AM
  // This checks for payments due today based on the 10th/25th logic
  cron.schedule('30 9 * * *', async () => {
    console.log('🔄 Starting recurring payments processing (Daily at 9:30 AM)...');
    try {
      await processRecurringPayments();
      console.log('✅ Recurring payments processing completed');
    } catch (error) {
      console.error('❌ Recurring payments processing failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Dubai" // UAE timezone
  });
  
  console.log('✅ Cron jobs initialized successfully');
  console.log('📅 Scheduled: Processing daily at 9:30 AM (Asia/Dubai)');
}

/**
 * Stop all cron jobs (useful for testing or shutdown)
 */
export function stopCronJobs() {
  console.log('🛑 Stopping all cron jobs...');
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log('All cron jobs stopped');
}

export default {
  initializeCronJobs,
  stopCronJobs
};
