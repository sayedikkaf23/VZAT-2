import express from 'express';
import { retryPayment } from '../Controllers/RetryPaymentController.js';

const router = express.Router();

// Retry payment endpoint
router.post('/retry-payment', retryPayment);

export default router;
