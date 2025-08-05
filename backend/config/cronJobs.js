import cron from 'node-cron';
import { processRecurringPayments } from '../Controllers/SubscriptionController.js';

/**
 * Set up cron jobs for subscription management
 */
export function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...');
  
  // Run daily at 9:00 AM to process recurring payments
  // This checks for payments due today based on the 10th/25th logic
  cron.schedule('0 9 * * *', async () => {
    console.log('🔄 Starting daily recurring payments processing...');
    try {
      await processRecurringPayments();
      console.log('✅ Daily recurring payments processing completed');
    } catch (error) {
      console.error('❌ Daily recurring payments processing failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Dubai" // UAE timezone
  });
  
  // REMOVED: Hourly backup processing to prevent duplicate emails
  // The single daily run at 9 AM is sufficient for processing payments
  
  console.log('✅ Cron jobs initialized successfully');
  console.log('📅 Daily processing: Every day at 9:00 AM (Asia/Dubai)');
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
