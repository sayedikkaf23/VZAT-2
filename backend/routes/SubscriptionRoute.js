import express from "express";
import {
  handleAFSWebhook,
  processRecurringPayments,
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft,
  testSubscriptionCompletionEmail,
  testPaymentFailureEmail,
  testServerToServerPayment,
  checkSubscriptionCompletion,
  refundPayment
} from "../Controllers/SubscriptionController.js";
import { testEmailConfiguration } from "../services/emailService.js";
import { testSalesforceConnection, updateQuotePaymentStatus, clearTokenCache, getPaymentStatusAndUpdateSchedule } from "../services/salesforceService.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";

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

// Check and trigger completion email for a specific subscription
router.post('/check-completion/:quotepaymentId', checkSubscriptionCompletion);


// Test server-to-server payment logic
router.post('/test/server-to-server/:quotepaymentId', testServerToServerPayment);

// Refund a payment
router.post('/refund', refundPayment);

// EMAIL TESTING ENDPOINTS
// Test basic email configuration
router.post('/test/email-config', async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    
    // Log test to database
    Post_Common_DB_Log_Data('/api/subscription/test/email-config', req.body, result);
    
    res.json(result);
  } catch (error) {
    const errorData = { success: false, error: error.message };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/subscription/test/email-config', req.body, errorData);
    
    res.status(500).json(errorData);
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
    
    // Log test to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-connection', req.body, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing Salesforce connection:', error);
    const errorData = { 
      success: false, 
      error: error.message,
      message: 'Failed to test Salesforce connection'
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-connection', req.body, errorData);
    
    res.status(500).json(errorData);
  }
});

// Test Salesforce update quote payment status
router.post('/test/salesforce-update', async (req, res) => {
  try {
    const { quotepaymentId, amount, status, transactionId } = req.body;
    
    if (!quotepaymentId) {
      const errorData = { 
        success: false, 
        message: 'quotepaymentId is required for testing' 
      };
      
      // Log validation error to database
      Post_Common_DB_Log_Data('/api/subscription/test/salesforce-update', req.body, errorData);
      
      return res.status(400).json(errorData);
    }

    const testPaymentData = {
      quotepaymentId: quotepaymentId,
      amount: amount || 87.50,
      transactionId: transactionId || '8ac7a49f9850271f01985044ce866aa7',
      paymentType: 'Online_payment',
      paymentStatus: status ? 'success' : 'failed',
      resultCode: status ? '000.100.110' : '800.100.162',
      resultDescription: status ? 'Transaction completed successfully' : 'Transaction failed',
      timestamp: new Date().toISOString(),
      Qp_number: req.body.Qp_number || 'QP- No-TEST123' // Add QP number for testing
    };

    const result = await updateQuotePaymentStatus(testPaymentData);
    
    // Log successful test to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-update', req.body, {
      testPaymentData: testPaymentData,
      result: result
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error testing Salesforce update:', error);
    const errorData = { 
      success: false, 
      error: error.message,
      message: 'Failed to test Salesforce update'
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-update', req.body, errorData);
    
    res.status(500).json(errorData);
  }
});

// Clear Salesforce token cache
router.post('/test/salesforce-clear-cache', async (req, res) => {
  try {
    clearTokenCache();
    
    const responseData = {
      success: true,
      message: 'Salesforce access token cache cleared successfully'
    };
    
    // Log cache clear to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-clear-cache', req.body, responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error('Error clearing Salesforce cache:', error);
    const errorData = { 
      success: false, 
      error: error.message,
      message: 'Failed to clear Salesforce cache'
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-clear-cache', req.body, errorData);
    
    res.status(500).json(errorData);
  }
});

// Test Salesforce payment status API
router.post('/test/salesforce-payment-status', async (req, res) => {
  try {
    const { QuotePaymentId } = req.body;
    
    if (!QuotePaymentId) {
      return res.status(400).json({
        success: false,
        message: 'QuotePaymentId is required'
      });
    }
    
    console.log('🧪 Testing Salesforce payment status API with QuotePaymentId:', QuotePaymentId);
    
    const result = await getPaymentStatusAndUpdateSchedule({ QuotePaymentId });
    
    const responseData = {
      success: result.success,
      message: result.message,
      data: result.data,
      paymentSchedule: result.paymentSchedule,
      error: result.error || null
    };
    
    // Log test to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-payment-status', req.body, responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error('Error testing Salesforce payment status:', error);
    const errorData = { 
      success: false, 
      error: error.message,
      message: 'Failed to test Salesforce payment status API'
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/subscription/test/salesforce-payment-status', req.body, errorData);
    
    res.status(500).json(errorData);
  }
});

export default router;
