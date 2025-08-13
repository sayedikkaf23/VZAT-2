import express from 'express';
import {
  createCardChangePaymentForm,
  handleCardChangeWebhook,
  getCardChangeHistory,
  getCustomerPaymentMethods,
  updateSubscriptionCard
} from '../Controllers/SubscriptionCardController.js';

const router = express.Router();

/**
 * @route   POST /api/subscription/:quotepaymentId/change-card
 * @desc    Create a payment form for changing subscription card
 * @access  Customer (with email verification)
 * @body    { customerEmail: string }
 */
router.post('/:quotepaymentId/change-card', createCardChangePaymentForm);

/**
 * @route   POST /api/subscription/webhook/card-change
 * @desc    Handle AFS webhook for card change registration
 * @access  AFS webhook (internal)
 */
router.post('/webhook/card-change', handleCardChangeWebhook);

/**
 * @route   GET /api/subscription/:quotepaymentId/card-history
 * @desc    Get card change history for a subscription
 * @access  Customer (with email verification)
 * @query   { customerEmail: string }
 */
router.get('/:quotepaymentId/card-history', getCardChangeHistory);

/**
 * @route   GET /api/subscription/payment-methods
 * @desc    Get all available payment methods for a customer
 * @access  Customer (with email verification)
 * @query   { customerEmail: string }
 */
router.get('/payment-methods', getCustomerPaymentMethods);

/**
 * @route   PUT /api/subscription/:quotepaymentId/update-card
 * @desc    Update subscription to use a different existing saved card
 * @access  Customer (with email verification)
 * @body    { cardId: string, customerEmail: string }
 */
router.put('/:quotepaymentId/update-card', updateSubscriptionCard);

export default router;
