import express from "express";
import { testPaymentCompletion, testPaymentReset } from "../Controllers/TestPaymentController.js";

const router = express.Router();

// Test endpoint to simulate payment completion
router.post('/complete-payment', testPaymentCompletion);

// Test endpoint to reset payment status
router.post('/reset-payment', testPaymentReset);

export default router;
