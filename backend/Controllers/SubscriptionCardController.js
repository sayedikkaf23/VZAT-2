import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import SavedCard from "../model/SavedCardModel.js";
import Customer from "../model/CustomerLoginModel.js";
import { addSavedCard } from "./SavedCardController.js";
import { saveCustomerCard } from "./CustomerRegistration.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Create a new card registration for subscription payment method update
 * This generates a new payment form for the customer to enter their new card details
 */
export const createCardChangePaymentForm = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    const { customerEmail } = req.body;

    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }

    // Verify customer access
    const customer = await Customer.findOne({ email: customerEmail });
    if (!customer || customer.quotepaymentId !== quotepaymentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access to subscription' 
      });
    }

    // Calculate next installment amount for the card registration
    const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2));

    // Create AFS checkout for new card registration
    const afsUrl = `${process.env.AFS_DOMAIN}/v1/checkouts`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;

    const afsData = new URLSearchParams();
    afsData.append('entityId', entityId);
    afsData.append('amount', '1.00'); // Minimal amount for card registration
    afsData.append('currency', 'AED');
    afsData.append('paymentType', 'PA'); // Pre-authorization for registration
    afsData.append('createRegistration', 'true'); // Key: Create registration for future payments
    afsData.append('merchantTransactionId', `card_change_${quotepaymentId}_${Date.now()}`);
    
    // Add customer information
    afsData.append('customer.email', customerEmail);
    if (subscription.Customer_name) {
      afsData.append('customer.givenName', subscription.Customer_name.split(' ')[0] || '');
      afsData.append('customer.surname', subscription.Customer_name.split(' ').slice(1).join(' ') || '');
    }

    // Set notification URLs for card change process
    const notificationUrl = `${process.env.BACKEND_URL}/api/subscription/webhook/card-change`;
    afsData.append('notificationUrl', notificationUrl);
    
    // Set return URLs after card registration
    const successUrl = `${process.env.FRONTEND_URL}/customer/payment-schedule?card_updated=success&quotepaymentId=${encodeURIComponent(quotepaymentId)}`;
    const failureUrl = `${process.env.FRONTEND_URL}/customer/payment-schedule?card_updated=failed&quotepaymentId=${encodeURIComponent(quotepaymentId)}`;
    
    afsData.append('shopperResultUrl', successUrl);
    afsData.append('defaultPaymentMethod', 'CARD');
    afsData.append('forceDefaultMethod', 'true');

    const afsHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };

    const afsResponse = await axios.post(afsUrl, afsData, { 
      headers: afsHeaders,
      proxy: false,
      timeout: 30000
    });

    if (afsResponse.data && afsResponse.data.id) {
      const checkoutId = afsResponse.data.id;
      const paymentFormUrl = `${process.env.FRONTEND_URL}/payment/${encodeURIComponent(checkoutId)}`;

  

      res.json({
        success: true,
        message: 'Card change payment form created successfully',
        checkoutId: checkoutId,
        paymentFormUrl: paymentFormUrl,
        subscriptionInfo: {
          quotepaymentId: subscription.quotepaymentId,
          nextPaymentAmount: installmentAmount,
          paymentsRemaining: subscription.InstallmentLeft - (subscription.payments_completed || 0),
          nextChargeDate: subscription.next_charge_date
        }
      });

    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create payment form for card change'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create card change form',
      error: error.message
    });
  }
};

/**
 * Handle AFS webhook for card change registration
 * This processes the new card registration and updates the subscription
 */
export const handleCardChangeWebhook = async (req, res) => {
  try {
    const { 
      id, 
      paymentType, 
      result, 
      amount, 
      currency,
      merchantTransactionId,
      registrationId,
      timestamp 
    } = req.body;

    // Extract quotepaymentId from merchantTransactionId
    const quotepaymentIdMatch = merchantTransactionId.match(/card_change_(.+)_\d+$/);
    if (!quotepaymentIdMatch) {
      return res.status(400).json({ message: 'Invalid merchant transaction ID' });
    }

    const quotepaymentId = quotepaymentIdMatch[1];

    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (paymentType === 'PA' && result.code.startsWith('000.') && registrationId) {
      // Store the old registration ID for reference
      const oldRegistrationId = subscription.afs_registration_id;

      // Update subscription with new registration ID
      await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
        afs_registration_id: registrationId,
        card_updated_date: new Date(timestamp),
        old_registration_id: oldRegistrationId // Keep track of old ID
      });

      // Save the new card details
      try {
        // Create card data from the webhook information
        const cardData = {
          quotepaymentId: quotepaymentId,
          opp_email: subscription.opp_email,
          Customer_name: subscription.Customer_name,
          afs_registration_id: registrationId,
          afs_checkout_id: id,
          result: req.body // Pass the full webhook data for card extraction
        };

        const cardSaveResult = await saveCustomerCard(cardData);
        
        if (cardSaveResult.success) {
          
          // Mark old cards as inactive for this customer
          const customer = await Customer.findOne({ quotepaymentId: quotepaymentId });
          if (customer) {
            await SavedCard.updateMany(
              { 
                customerId: customer._id, 
                afs_registration_id: oldRegistrationId,
                isActive: true 
              },
              { 
                isActive: false,
                deactivated_date: new Date(),
                deactivation_reason: 'Card changed for subscription'
              }
            );
          }

        }

      } catch (cardError) {
        // Card saving error handled silently
      }

      res.json({ 
        message: 'Card change processed successfully',
        quotepaymentId: quotepaymentId,
        newRegistrationId: registrationId
      });

    } else {
      res.status(400).json({ 
        message: 'Card registration failed',
        result: result
      });
    }

  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to process card change',
      error: error.message 
    });
  }
};

/**
 * Get card change history for a subscription
 */
export const getCardChangeHistory = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    const { customerEmail } = req.query;

    // Verify customer access
    const customer = await Customer.findOne({ email: customerEmail });
    if (!customer || customer.quotepaymentId !== quotepaymentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    // Get current and historical cards for this customer
    const cards = await SavedCard.find({ 
      customerId: customer._id 
    }).sort({ createdAt: -1 });

    // Get subscription details
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });

    const cardHistory = cards.map(card => ({
      cardId: card._id,
      maskedCardNumber: card.maskedCardNumber,
      cardBrand: card.cardBrand,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      isActive: card.isActive,
      isCurrentSubscriptionCard: card.afs_registration_id === subscription?.afs_registration_id,
      addedDate: card.createdAt,
      deactivatedDate: card.deactivated_date,
      deactivationReason: card.deactivation_reason
    }));

    res.json({
      success: true,
      quotepaymentId: quotepaymentId,
      cardHistory: cardHistory,
      currentRegistrationId: subscription?.afs_registration_id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch card history',
      error: error.message
    });
  }
};

/**
 * Get available payment methods for a customer
 */
export const getCustomerPaymentMethods = async (req, res) => {
  try {
    const { customerEmail } = req.query;

    const customer = await Customer.findOne({ email: customerEmail });
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    // Get all active cards for the customer
    const cards = await SavedCard.find({ 
      customerId: customer._id,
      isActive: true 
    }).sort({ isDefault: -1, lastUsed: -1 });

    const paymentMethods = cards.map(card => ({
      cardId: card._id,
      maskedCardNumber: card.maskedCardNumber,
      cardBrand: card.cardBrand,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      isDefault: card.isDefault,
      lastUsed: card.lastUsed,
      registrationId: card.afs_registration_id
    }));

    res.json({
      success: true,
      customerEmail: customerEmail,
      paymentMethods: paymentMethods
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
};

/**
 * Update subscription to use an existing saved card
 * This allows customers to switch between their saved cards for subscription payments
 */
export const updateSubscriptionCard = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    const { cardId, customerEmail } = req.body;

    // Verify customer access
    const customer = await Customer.findOne({ email: customerEmail });
    if (!customer || customer.quotepaymentId !== quotepaymentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }

    // Find the selected card
    const selectedCard = await SavedCard.findOne({ 
      _id: cardId,
      customerId: customer._id,
      isActive: true 
    });

    if (!selectedCard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Card not found or inactive' 
      });
    }

    // Store the old registration ID
    const oldRegistrationId = subscription.afs_registration_id;

    // Update subscription with the selected card's registration ID
    await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
      afs_registration_id: selectedCard.afs_registration_id,
      card_updated_date: new Date(),
      old_registration_id: oldRegistrationId
    });

    // Update card usage
    await SavedCard.findByIdAndUpdate(cardId, {
      lastUsed: new Date()
    });

    res.json({
      success: true,
      message: 'Subscription payment method updated successfully',
      quotepaymentId: quotepaymentId,
      newCard: {
        cardId: selectedCard._id,
        maskedCardNumber: selectedCard.maskedCardNumber,
        cardBrand: selectedCard.cardBrand,
        registrationId: selectedCard.afs_registration_id
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription payment method',
      error: error.message
    });
  }
};

export default {
  createCardChangePaymentForm,
  handleCardChangeWebhook,
  getCardChangeHistory,
  getCustomerPaymentMethods,
  updateSubscriptionCard
};
