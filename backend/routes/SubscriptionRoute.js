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
import { testSalesforceConnection, updateQuotePaymentStatus } from "../services/salesforceService.js";

const router = express.Router();// Webhook endpoint for AFS notifications
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

// SALESFORCE TESTING ENDPOINTS

// Test Salesforce API connection
router.post('/test/salesforce-connection', async (req, res) => {
  try {
    const result = await testSalesforceConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing Salesforce connection:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to test Salesforce connection'
    });
  }
});

// Test Salesforce update quote payment status
router.post('/test/salesforce-update', async (req, res) => {
  try {
    const { quotepaymentId, amount, status, transactionId } = req.body;
    
    if (!quotepaymentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'quotepaymentId is required for testing' 
      });
    }

    const testPaymentData = {
      quotepaymentId: quotepaymentId,
      amount: amount || 87.50,
      transactionId: transactionId || '8ac7a49f9850271f01985044ce866aa7',
      paymentType: 'Online_payment',
      paymentStatus: status ? 'success' : 'failed',
      resultCode: status ? '000.100.110' : '800.100.162',
      resultDescription: status ? 'Transaction completed successfully' : 'Transaction failed',
      timestamp: new Date().toISOString()
    };

    const result = await updateQuotePaymentStatus(testPaymentData);
    res.json(result);
    
  } catch (error) {
    console.error('Error testing Salesforce update:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to test Salesforce update'
    });
  }
});

export default router;
