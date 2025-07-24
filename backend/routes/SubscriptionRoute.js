import express from "express";
import { 
  handleAFSWebhook, 
  processRecurringPayments, 
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft,
  testSubscriptionCompletionEmail,
  testPaymentFailureEmail
} from "../Controllers/SubscriptionController.js";
import { testEmailConfiguration } from "../services/emailService.js";

const router = express.Router();

// Webhook endpoint for AFS notifications
router.post('/webhook/afs', handleAFSWebhook);

// Cron job endpoint for processing recurring payments
router.post('/process-recurring', processRecurringPayments);

// Get subscription status
router.get('/status/:quotepaymentId', getSubscriptionStatus);

// Cancel subscription
router.put('/cancel/:quotepaymentId', cancelSubscription);

// Update next charge date (for testing)
router.put('/update-next-charge/:quotepaymentId', updateNextChargeDate);

// Fix missing InstallmentLeft field (for testing)
router.put('/fix-installment-left/:quotepaymentId', fixInstallmentLeft);

// EMAIL TESTING ENDPOINTS
// Test basic email configuration
router.post('/test/email-config', async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test subscription completion email
router.post('/test/completion-email', testSubscriptionCompletionEmail);

// Test payment failure email
router.post('/test/failure-email', testPaymentFailureEmail);

export default router;
