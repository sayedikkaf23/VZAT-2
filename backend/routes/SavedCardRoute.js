import { Router } from "express";
import { 
    getCustomerSavedCards, 
    removeSavedCard, 
    setDefaultCard,
    testCreateCard,
    fixExistingCardNumbers
} from "../Controllers/SavedCardController.js";

const router = Router();

// Test endpoint to create a card manually
router.post('/test-create-card', testCreateCard);

// Fix existing cards with generic masking
router.post('/fix-card-numbers', fixExistingCardNumbers);

// Get all saved cards for a customer
router.get('/customer/:customerId/cards', getCustomerSavedCards);

// Remove a saved card
router.delete('/card/:cardId', removeSavedCard);

// Set default card
router.put('/card/:cardId/set-default', setDefaultCard);

export default router;
