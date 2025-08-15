import express from 'express';
import {
  prepareCardRegistration,
  handleCardRegistrationCallback,
  getCustomerCards,
  setDefaultCard
} from '../Controllers/AddCardController.js';

const router = express.Router();

// POST /api/cards/prepare-registration
// Prepare AFS checkout for card registration
router.post('/prepare-registration', prepareCardRegistration);

// POST /api/cards/registration-callback
// Handle successful card registration callback
router.post('/registration-callback', handleCardRegistrationCallback);

// GET /api/cards/:customerEmail
// Get customer's saved cards
router.get('/:customerEmail', getCustomerCards);

// POST /api/cards/set-default
// Set a card as default
router.post('/set-default', setDefaultCard);

export default router;
