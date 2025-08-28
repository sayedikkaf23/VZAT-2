import { Router } from "express";
import { 
    initializeCardPayment,
    processCardPayment,
    refundCardPayment,
    saveCardDetails,
    paymentResult,
    handlePaymentResult,
    testOppwaConfig
} from "../Controllers/AddCardPaymentController.js";

const router = Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  console.log('🔧 AddCardPaymentRoute: test route called');
  res.json({ success: true, message: 'AddCardPaymentRoute is working!' });
});

// Test OPPWA configuration
router.get('/test-oppwa', testOppwaConfig);

// Test configuration values
router.get('/test-config', (req, res) => {
  console.log('🔧 Test config endpoint called');
  res.json({
    success: true,
    message: 'Configuration test',
    config: {
      baseUrl: process.env.AFS_BASE_URL || 'undefined',
      entityId: process.env.AFS_ENTITY_ID || 'undefined',
      authorization: process.env.AFS_AUTHORIZATION ? process.env.AFS_AUTHORIZATION.substring(0, 20) + '...' : 'undefined',
      nodeEnv: process.env.NODE_ENV || 'undefined'
    }
  });
});

// Initialize payment for card addition
router.post('/initialize-payment', initializeCardPayment);

// Process card payment with AFS
router.post('/process-payment', processCardPayment);

// Refund the 1 AED charge
router.post('/refund-payment', refundCardPayment);

// Save card details to database
router.post('/save-card', saveCardDetails);

// Payment result callback from AFS (legacy)
router.get('/payment-result', paymentResult);

// Handle AFS payment result for card registration
router.post('/payment-result', handlePaymentResult);
router.get('/payment-result', handlePaymentResult);

export default router;
