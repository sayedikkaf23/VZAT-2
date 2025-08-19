import axios from 'axios';
import SavedCard from '../model/SavedCardModel.js';
import VzatRecurringData from '../model/VzatRecurringDataModel.js';
import config from '../config.env.js';

// AFS Configuration (move to env file in production)
const AFS_CONFIG = {
  baseUrl: process.env.AFS_BASE_URL || config.AFS_BASE_URL,
  entityId: process.env.AFS_ENTITY_ID || config.AFS_ENTITY_ID,
  authorization: process.env.AFS_AUTHORIZATION || config.AFS_AUTHORIZATION,
  testMode: 'EXTERNAL'
};

/**
 * Step 1: Prepare AFS checkout for card registration
 * Based on AFS Server-to-Server integration: https://afs.docs.oppwa.com/integrations/server-to-server
 */
export const prepareCardRegistration = async (req, res) => {
  try {
    console.log('🔄 prepareCardRegistration called');
    console.log('📋 Request body:', req.body);
    
    const { customerEmail } = req.body;

    if (!customerEmail) {
      console.log('❌ No customer email provided');
      return res.status(400).json({
        success: false,
        message: 'Customer email is required',
        error: 'MISSING_EMAIL'
      });
    }

    console.log('🔄 Preparing AFS checkout for card registration...');
    console.log('📧 Customer email:', customerEmail);

    // Validate AFS configuration
    if (!AFS_CONFIG.baseUrl || !AFS_CONFIG.entityId || !AFS_CONFIG.authorization) {
      console.error('❌ AFS configuration is incomplete');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway configuration error',
        error: 'INVALID_AFS_CONFIG'
      });
    }

    // Get the base URL from the request or environment
    const baseUrl = process.env.FRONTEND_URL || config.FRONTEND_URL || req.get('origin') || 'https://vzatnew.yeepeey.com';
    console.log('🌐 Base URL for redirects:', baseUrl);

    // For card registration, AFS expects specific redirect URL format
    // The resourcePath will be appended by AFS automatically
    const shopperResultUrl = `${baseUrl}/saved-card/add-card`;
    
    console.log('🔗 Setting shopperResultUrl:', shopperResultUrl);
    
    const checkoutData = new URLSearchParams({
      entityId: AFS_CONFIG.entityId,
      testMode: AFS_CONFIG.testMode,
      createRegistration: 'true', // This creates a registration
      
      // Customer information
      'customer.email': customerEmail,
      'customer.merchantCustomerId': customerEmail.split('@')[0],
      
      // The shopperResultUrl is where the customer will be redirected after registration
      shopperResultUrl: shopperResultUrl,
      
      // Payment details (minimal amount for registration)
      'paymentType': 'DB', // Debit transaction
      'amount': '1.00', // Minimum amount required
      'currency': 'AED',
      
      // Billing information
      'billing.country': 'AE',
      'billing.city': 'Dubai',
      
      // Transaction identifier
      'merchantTransactionId': `card_reg_${Date.now()}_${customerEmail.split('@')[0]}`,
      
      // UI and locale settings
      'customParameters[SHOPPER_locale]': 'en_US'
    });

    console.log('📋 Checkout data being sent to AFS:', Object.fromEntries(checkoutData.entries()));
    
    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/checkouts`,
      checkoutData,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('✅ AFS checkout prepared successfully');
    console.log('🔑 Checkout ID:', response.data.id);
    console.log('📊 AFS Response code:', response.data.result?.code);
    console.log('📄 Full AFS response:', JSON.stringify(response.data, null, 2));

    // Validate AFS response
    if (!response.data.id) {
      console.error('❌ AFS response missing checkout ID');
      return res.status(500).json({
        success: false,
        message: 'Invalid response from payment gateway',
        error: 'MISSING_CHECKOUT_ID'
      });
    }

    res.json({
      success: true,
      checkoutId: response.data.id,
      message: 'Checkout prepared successfully',
      afsConfig: {
        baseUrl: AFS_CONFIG.baseUrl,
        scriptUrl: `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${response.data.id}`
      },
      debug: {
        entityId: AFS_CONFIG.entityId,
        testMode: AFS_CONFIG.testMode,
        resultCode: response.data.result?.code,
        resultDescription: response.data.result?.description
      }
    });

  } catch (error) {
    console.error('❌ Error preparing AFS checkout:', error.response?.data || error.message);
    
    // Detailed error logging
    if (error.response) {
      console.error('📊 Response Status:', error.response.status);
      console.error('📊 Response Headers:', error.response.headers);
      console.error('📊 Response Data:', error.response.data);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to prepare checkout',
      error: error.response?.data || error.message,
      errorType: error.response ? 'AFS_API_ERROR' : 'NETWORK_ERROR',
      statusCode: error.response?.status
    });
  }
};

/**
 * Step 2: Handle successful card registration callback
 */
export const handleCardRegistrationCallback = async (req, res) => {
  try {
    const { checkoutId, customerEmail } = req.body;

    if (!checkoutId || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Checkout ID and customer email are required'
      });
    }

    console.log('🔄 Getting payment status from AFS...');
    console.log('🔑 Checkout ID:', checkoutId);

    // First, get payment status from AFS
    const paymentResponse = await axios.get(
      `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/payment`,
      {
        params: {
          entityId: AFS_CONFIG.entityId
        },
        headers: {
          'Authorization': AFS_CONFIG.authorization
        }
      }
    );

    const paymentData = paymentResponse.data;
    console.log('📋 Payment data received:', paymentData);

    // Check if payment was successful
    if (!paymentData.result?.code || !paymentData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
      console.log('❌ Payment not successful:', paymentData.result);
      return res.status(400).json({
        success: false,
        message: 'Payment was not completed successfully',
        error: paymentData.result
      });
    }

    console.log('✅ Payment successful, getting registration details...');

    // Now get registration details from AFS
    const registrationResponse = await axios.get(
      `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/registration`,
      {
        params: {
          entityId: AFS_CONFIG.entityId
        },
        headers: {
          'Authorization': AFS_CONFIG.authorization
        }
      }
    );

    const registrationData = registrationResponse.data;
    console.log('📋 Registration data received:', registrationData);

    // Check if registration was successful
    if (registrationData.result?.code && registrationData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
      console.log('✅ Card registration successful');

      // Extract card details
      const cardData = {
        customerEmail: customerEmail,
        afs_registration_id: registrationData.id,
        afs_checkout_id: checkoutId,
        card_brand: registrationData.paymentBrand,
        card_last_four: registrationData.card?.last4Digits || '****',
        card_holder_name: registrationData.card?.holder || 'N/A',
        card_expiry_month: registrationData.card?.expiryMonth || '',
        card_expiry_year: registrationData.card?.expiryYear || '',
        isDefault: false, // Will be set to true below
        createdAt: new Date(),
        status: 'active'
      };

      // Set all existing cards as non-default for this customer
      await SavedCard.updateMany(
        { customerEmail: customerEmail },
        { $set: { isDefault: false } }
      );

      // Save the new card as default
      cardData.isDefault = true;
      const savedCard = new SavedCard(cardData);
      await savedCard.save();

      console.log('💾 Card saved successfully as default');

      // 🔄 MIGRATE SUBSCRIPTION TOKENS TO NEW CARD
      await migrateSubscriptionTokens(customerEmail, registrationData.id, checkoutId);

      res.json({
        success: true,
        message: 'Card registered and saved successfully. All subscriptions updated to use new card.',
        card: {
          id: savedCard._id,
          last4: cardData.card_last_four,
          brand: cardData.card_brand,
          holder: cardData.card_holder_name,
          isDefault: true
        },
        registrationId: registrationData.id,
        subscriptionsUpdated: true
      });

    } else {
      console.error('❌ Card registration failed:', registrationData.result);
      res.status(400).json({
        success: false,
        message: 'Card registration failed',
        error: registrationData.result?.description || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Error handling card registration:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process card registration',
      error: error.response?.data || error.message
    });
  }
};

/**
 * Get customer's saved cards
 */
export const getCustomerCards = async (req, res) => {
  try {
    const { customerEmail } = req.params;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    const cards = await SavedCard.find({ customerEmail }).sort({ createdAt: -1 });

    res.json({
      success: true,
      cards: cards.map(card => ({
        id: card._id,
        last4: card.card_last_four,
        brand: card.card_brand,
        holder: card.card_holder_name,
        expiryMonth: card.card_expiry_month,
        expiryYear: card.card_expiry_year,
        isDefault: card.isDefault,
        createdAt: card.createdAt,
        hasRegistrationId: !!card.afs_registration_id
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching customer cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cards',
      error: error.message
    });
  }
};

/**
 * Set a card as default
 */
export const setDefaultCard = async (req, res) => {
  try {
    const { cardId, customerEmail } = req.body;

    if (!cardId || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Card ID and customer email are required'
      });
    }

    // Set all cards as non-default
    await SavedCard.updateMany(
      { customerEmail: customerEmail },
      { $set: { isDefault: false } }
    );

    // Set the selected card as default
    const updatedCard = await SavedCard.findByIdAndUpdate(
      cardId,
      { $set: { isDefault: true } },
      { new: true }
    );

    if (!updatedCard) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    console.log('✅ Default card updated successfully');

    res.json({
      success: true,
      message: 'Default card updated successfully',
      card: {
        id: updatedCard._id,
        last4: updatedCard.card_last_four,
        brand: updatedCard.card_brand,
        isDefault: true
      }
    });

  } catch (error) {
    console.error('❌ Error setting default card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default card',
      error: error.message
    });
  }
};

/**
 * Migrate subscription tokens to new card
 */
const migrateSubscriptionTokens = async (customerEmail, newRegistrationId, newCheckoutId) => {
  try {
    console.log('🔄 Starting subscription token migration for customer:', customerEmail);
    console.log('📝 New registration ID:', newRegistrationId);
    console.log('📝 New checkout ID:', newCheckoutId);

    // Find all active subscriptions for this customer
    const subscriptions = await VzatRecurringData.find({
      Customer_email: customerEmail,
      subscription_status: { $in: ['active', 'pending'] }
    });

    console.log(`📊 Found ${subscriptions.length} active subscriptions to update`);

    if (subscriptions.length === 0) {
      console.log('ℹ️ No active subscriptions found for this customer');
      return { updated: 0, message: 'No active subscriptions to update' };
    }

    let updatedCount = 0;
    const updatePromises = subscriptions.map(async (subscription) => {
      try {
        console.log(`🔄 Updating subscription: ${subscription.quotepaymentId || subscription._id}`);
        
        // Store old token info for logging
        const oldRegistrationId = subscription.afs_registration_id;
        const oldCheckoutId = subscription.afs_checkout_id;
        
        // Update subscription with new card tokens
        const updateResult = await VzatRecurringData.updateOne(
          { _id: subscription._id },
          {
            $set: {
              afs_registration_id: newRegistrationId,
              afs_checkout_id: newCheckoutId,
              card_migration_date: new Date(),
              previous_registration_id: oldRegistrationId, // Keep track of old token
              previous_checkout_id: oldCheckoutId
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          updatedCount++;
          console.log(`✅ Updated subscription ${subscription.quotepaymentId || subscription._id}`);
          console.log(`   Old registration ID: ${oldRegistrationId || 'None'}`);
          console.log(`   New registration ID: ${newRegistrationId}`);
        } else {
          console.log(`⚠️ Failed to update subscription ${subscription.quotepaymentId || subscription._id}`);
        }

      } catch (error) {
        console.error(`❌ Error updating subscription ${subscription.quotepaymentId || subscription._id}:`, error);
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    console.log(`✅ Subscription token migration completed. Updated ${updatedCount}/${subscriptions.length} subscriptions`);
    
    return {
      updated: updatedCount,
      total: subscriptions.length,
      message: `Successfully updated ${updatedCount} subscription(s) to use new card`
    };

  } catch (error) {
    console.error('❌ Error during subscription token migration:', error);
    throw new Error('Failed to migrate subscription tokens: ' + error.message);
  }
};

export default {
  prepareCardRegistration,
  handleCardRegistrationCallback,
  getCustomerCards,
  setDefaultCard
};
