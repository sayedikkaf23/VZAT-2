import express from "express";
import { 
  handleAFSWebhook, 
  processRecurringPayments, 
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft
} from "../Controllers/SubscriptionController.js";

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

export default router;
