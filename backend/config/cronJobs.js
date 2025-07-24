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
      console.log('Daily recurring payments processing completed');
    } catch (error) {
      console.error('Daily recurring payments processing failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Dubai" // UAE timezone
  });
  
  // Optional: Run every hour during business hours (9 AM - 6 PM) as backup
  cron.schedule('0 9-18 * * *', async () => {
    console.log('🔄 Hourly check for pending recurring payments...');
    try {
      // Only process if there are any pending payments due today
      const result = await processRecurringPayments();
      if (result && result.total_processed > 0) {
        console.log(`Hourly check processed ${result.total_processed} payments`);
      }
    } catch (error) {
      console.error('Hourly recurring payments check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Dubai"
  });
  
  console.log('Cron jobs initialized successfully');
  console.log('📅 Daily processing: Every day at 9:00 AM (Asia/Dubai)');
  console.log('🔄 Hourly checks: Every hour from 9 AM to 6 PM (Asia/Dubai)');
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
