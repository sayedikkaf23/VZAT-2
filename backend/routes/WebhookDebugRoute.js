import express from "express";
import { handleAFSWebhook } from "../Controllers/SubscriptionController.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";

const router = express.Router();

/**
 * Debug endpoint to test webhook functionality
 */
router.post('/webhook/test', async (req, res) => {
  console.log('🧪 =============== WEBHOOK TEST ENDPOINT ===============');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.originalUrl);
  
  // Log to database
  Post_Common_DB_Log_Data('/debug/webhook/test', req.body, { 
    message: 'Webhook test endpoint called',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  
  res.status(200).json({ 
    message: 'Webhook test endpoint working',
    timestamp: new Date().toISOString(),
    receivedData: req.body
  });
});

/**
 * Enhanced AFS webhook endpoint with detailed logging
 */
router.post('/webhook/afs-debug', async (req, res) => {
  console.log('🔔 =============== AFS WEBHOOK DEBUG ===============');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 Request IP:', req.ip);
  console.log('🌐 User Agent:', req.get('User-Agent'));
  console.log('📋 All Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Query Parameters:', JSON.stringify(req.query, null, 2));
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Content Type:', req.get('Content-Type'));
  console.log('📋 Content Length:', req.get('Content-Length'));
  
  // Log everything to database
  Post_Common_DB_Log_Data('/debug/webhook/afs', {
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  }, { 
    message: 'AFS webhook debug call received',
    timestamp: new Date().toISOString()
  });
  
  try {
    // Call the actual webhook handler
    await handleAFSWebhook(req, res);
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    Post_Common_DB_Log_Data('/debug/webhook/afs-error', req.body, { 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Check if webhook endpoint is accessible
 */
router.get('/webhook/health', (req, res) => {
  console.log('🏥 Webhook health check called');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'AFS webhook endpoint is accessible',
    server: 'VZAT Backend Server'
  });
});

/**
 * Manual webhook trigger for testing
 */
router.post('/webhook/manual-trigger', async (req, res) => {
  console.log('🔧 =============== MANUAL WEBHOOK TRIGGER ===============');
  
  const { quotepaymentId, transactionId, amount } = req.body;
  
  if (!quotepaymentId) {
    return res.status(400).json({ error: 'quotepaymentId is required' });
  }
  
  // Create mock webhook data
  const mockWebhookData = {
    id: transactionId || `manual_${Date.now()}`,
    paymentType: 'DB',
    result: {
      code: '000.100.110',
      description: 'Successful transaction (Manual trigger)'
    },
    amount: amount || 210,
    currency: 'AED',
    merchantTransactionId: quotepaymentId,
    registrationId: `manual_reg_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  
  console.log('📋 Mock webhook data:', JSON.stringify(mockWebhookData, null, 2));
  
  // Create mock request object
  const mockReq = {
    body: mockWebhookData,
    ip: req.ip,
    get: (header) => req.get(header),
    headers: req.headers,
    query: {},
    originalUrl: '/debug/webhook/manual-trigger'
  };
  
  try {
    // Call webhook handler
    await handleAFSWebhook(mockReq, res);
  } catch (error) {
    console.error('❌ Manual webhook trigger error:', error);
    res.status(500).json({ 
      error: 'Manual webhook trigger failed',
      details: error.message
    });
  }
});

export default router;
