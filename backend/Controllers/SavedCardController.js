import SavedCard from '../model/SavedCardModel.js';
import CustomerLoginModel from '../model/CustomerLoginModel.js';

// Get all saved cards for a customer
export const getCustomerSavedCards = async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // Verify customer exists
        const customer = await CustomerLoginModel.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        // Get all active cards for this customer
        const savedCards = await SavedCard.find({ 
            customerId: customerId,
            isActive: true 
        }).sort({ isDefault: -1, cardAddedDate: -1 });

        res.status(200).json({
            success: true,
            cards: savedCards,
            message: `Found ${savedCards.length} saved cards`
        });

    } catch (error) {
        console.error('Error fetching saved cards:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch saved cards' });
    }
};

// Add a new card after successful payment
export const addSavedCard = async (cardData) => {
    try {
        const {
            customerId,
            customerEmail,
            quotepaymentId,
            afs_registration_id,
            afs_checkout_id,
            cardholderName,
            maskedCardNumber,
            cardBrand,
            expiryMonth,
            expiryYear
        } = cardData;

        // Check if this registration ID already exists
        const existingCard = await SavedCard.findOne({ afs_registration_id });
        if (existingCard) {
            console.log('Card already saved:', afs_registration_id);
            return existingCard;
        }

        // If this is the customer's first card, make it default
        const existingCards = await SavedCard.find({ customerId, isActive: true });
        const isFirstCard = existingCards.length === 0;

        const newCard = new SavedCard({
            customerId,
            customerEmail,
            quotepaymentId,
            afs_registration_id,
            afs_checkout_id,
            cardholderName,
            maskedCardNumber,
            cardBrand,
            expiryMonth,
            expiryYear,
            isDefault: isFirstCard, // First card becomes default
            lastUsedDate: new Date()
        });

        const savedCard = await newCard.save();
        console.log('New card saved successfully:', savedCard._id);
        return savedCard;

    } catch (error) {
        console.error('Error saving card:', error);
        throw error;
    }
};

// Remove a saved card
export const removeSavedCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const { customerId } = req.body;

        // Find and verify card belongs to customer
        const card = await SavedCard.findOne({ 
            _id: cardId, 
            customerId: customerId,
            isActive: true 
        });

        if (!card) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }

        // Soft delete - mark as inactive
        card.isActive = false;
        await card.save();

        // If this was the default card, make another card default
        if (card.isDefault) {
            const nextCard = await SavedCard.findOne({ 
                customerId: customerId, 
                isActive: true,
                _id: { $ne: cardId }
            }).sort({ cardAddedDate: -1 });

            if (nextCard) {
                nextCard.isDefault = true;
                await nextCard.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Card removed successfully'
        });

    } catch (error) {
        console.error('Error removing card:', error);
        res.status(500).json({ success: false, message: 'Failed to remove card' });
    }
};

// Set default card
export const setDefaultCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const { customerId } = req.body;

        // Verify card belongs to customer
        const card = await SavedCard.findOne({ 
            _id: cardId, 
            customerId: customerId,
            isActive: true 
        });

        if (!card) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }

        // Remove default from all other cards
        await SavedCard.updateMany(
            { customerId: customerId, isActive: true },
            { isDefault: false }
        );

        // Set this card as default
        card.isDefault = true;
        await card.save();

        res.status(200).json({
            success: true,
            message: 'Default card updated successfully'
        });

    } catch (error) {
        console.error('Error setting default card:', error);
        res.status(500).json({ success: false, message: 'Failed to set default card' });
    }
};

// Update last used date when card is used for payment
export const updateCardUsage = async (afs_registration_id) => {
    try {
        await SavedCard.findOneAndUpdate(
            { afs_registration_id, isActive: true },
            { lastUsedDate: new Date() }
        );
    } catch (error) {
        console.error('Error updating card usage:', error);
    }
};
