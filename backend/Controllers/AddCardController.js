import axios from 'axios';
import SavedCard from '../model/SavedCardModel.js';
import VzatRecurringData from '../model/VzatRecurringDataModel.js';
import CustomerLogin from '../model/CustomerLoginModel.js';
import config from '../config.env.js';

// AFS Configuration - Registration specific credentials
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
        message: 'Customer email is required'
      });
    }

    console.log('👤 Customer Email:', customerEmail);

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found:', customerEmail);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    console.log('✅ Customer verified:', customer.email);

    // Configure AFS checkout for standalone registration
    const checkoutData = {
      entityId: AFS_CONFIG.entityId,
      paymentType: 'RG', // Registration only, no payment
      createRegistration: true, // This is the key for standalone registration
      notificationUrl: `${process.env.FRONTEND_URL}/api/webhook/afs-notification`,
      // Registration specific settings
      testMode: AFS_CONFIG.testMode
    };
    // Add shopperResultUrl for redirect after registration
    checkoutData.shopperResultUrl = `${process.env.FRONTEND_URL}/saved-card/add-card`;
    // Add shopperResultUrl for redirect after registration
    checkoutData.shopperResultUrl = `${process.env.FRONTEND_URL}/saved-card/add-card`;

    console.log('📝 Creating AFS checkout for registration...');
    console.log('🔗 AFS Endpoint:', `${AFS_CONFIG.baseUrl}/v1/checkouts`);
    console.log('🎯 Purpose: Standalone card registration (no payment)');
    console.log('💰 Amount: $0.00 (registration only)');
    console.log('🔑 Entity ID:', AFS_CONFIG.entityId);
    console.log('📧 Customer:', customerEmail);

    const response = await axios.post(`${AFS_CONFIG.baseUrl}/v1/checkouts`, checkoutData, {
      headers: {
        'Authorization': AFS_CONFIG.authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const checkoutResult = response.data;
    console.log('✅ AFS checkout created successfully');
    console.log('🆔 Checkout ID:', checkoutResult.id);
    console.log('📋 Full Response:', JSON.stringify(checkoutResult, null, 2));

    // Return checkout ID and AFS config for frontend
    res.json({
      success: true,
      checkoutId: checkoutResult.id,
      message: 'Checkout prepared successfully for card registration',
      afsConfig: {
        baseUrl: AFS_CONFIG.baseUrl,
        scriptUrl: `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutResult.id}`
      }
    });

  } catch (error) {
    console.error('❌ Error preparing checkout:', error.response?.data || error.message);
    console.error('📊 Error status:', error.response?.status);
    console.error('📋 Error headers:', error.response?.headers);
    
    if (error.response?.data?.result) {
      console.error('🔍 AFS Error details:', error.response.data.result);
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
    console.log('\n🔔 ===== AFS CARD REGISTRATION CALLBACK =====');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🎯 Process: Adding NEW card for existing subscription user');
    console.log('📖 Reference: https://afs.docs.oppwa.com/integrations/widget/registration-tokens');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Query params:', JSON.stringify(req.query, null, 2));
    
    const { checkoutId, customerEmail } = req.body;

    if (!checkoutId || !customerEmail) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing checkoutId or customerEmail'
      });
    }

    console.log('\n🔍 STEP 1: VALIDATION');
    console.log('✅ Checkout ID:', checkoutId);
    console.log('✅ Customer Email:', customerEmail);

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found:', customerEmail);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    console.log('✅ Customer verified:', customer.email);

    console.log('\n🔍 STEP 2: EXISTING CARDS CHECK');
    console.log('🎯 Purpose: Check current card setup before adding new one');

    // Check existing cards for context
    const existingCards = await SavedCard.find({ customer_email: customerEmail });
    console.log('📊 Existing cards count:', existingCards.length);
    
    if (existingCards.length > 0) {
      console.log('💳 Current cards:');
      existingCards.forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.maskedCardNumber} (${card.cardBrand}) - Default: ${card.isDefault}, AFS RegID: ${card.afs_registration_id}`);
      });
    }

    console.log('\n🔍 STEP 3: AFS REGISTRATION STATUS QUERY');
    console.log('🔗 AFS API: GET /v1/checkouts/{checkoutId}/registration');
    console.log('🆔 Checkout ID to query:', checkoutId);
    console.log('🎯 Purpose: Check if user completed card entry in AFS widget');
    
    const requestUrl = `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/registration`;
    const requestParams = { entityId: AFS_CONFIG.entityId };
    
    console.log('🌍 Full request URL:', `${requestUrl}?entityId=${requestParams.entityId}`);

    let registrationData;
    let retryCount = 0;
    const maxRetries = 5; // Increased retries for better stability
    const retryDelay = 3000; // Increased to 3 seconds between retries

    while (retryCount < maxRetries) {
      try {
        console.log(`📞 Attempt ${retryCount + 1}/${maxRetries} - Calling AFS registration endpoint...`);
        
        // According to AFS documentation, after form submission callback,
        // we need to wait longer for registration to be fully processed
        // Progressive delay: longer waits for initial attempts
        let delayTime;
        if (retryCount === 0) {
          delayTime = 5000; // 5 seconds for first attempt - AFS needs processing time
        } else if (retryCount === 1) {
          delayTime = 4000; // 4 seconds for second attempt
        } else {
          delayTime = retryDelay; // 3 seconds for subsequent attempts
        }
        
        console.log(`⏱️ Waiting ${delayTime}ms to allow AFS registration processing...`);
        console.log(`📋 AFS Note: Callback indicates form submission, not completion. Waiting for processing.`);
        await new Promise(resolve => setTimeout(resolve, delayTime));

        const registrationResponse = await axios.get(requestUrl, {
          params: requestParams,
          headers: {
            'Authorization': AFS_CONFIG.authorization
          }
        });

        registrationData = registrationResponse.data;
        
        console.log('📋 RAW AFS Response received:');
        console.log('📊 Status:', registrationResponse.status);
        console.log('💾 Full Response Data:', JSON.stringify(registrationData, null, 2));

        // Check result code in detail
        if (registrationData.result) {
          console.log('🔍 Result Analysis:');
          console.log('  🔢 Result Code:', registrationData.result.code);
          console.log('  📝 Result Description:', registrationData.result.description);
          
          // For registration tokens, successful codes are different than payment codes
          // According to AFS docs: 000.000.000 = successfully processed
          // 000.100.110 = request successfully processed
          // 000.200.000 = transaction pending
          const isSuccessCode = registrationData.result.code && 
            (registrationData.result.code === '000.000.000' || 
             registrationData.result.code === '000.100.110' ||
             registrationData.result.code.match(/^000\.000\./) ||
             registrationData.result.code.match(/^000\.100\.1/) ||
             registrationData.result.code.match(/^000\.200\./));
          
          console.log('  ✅ Is Success Code?', isSuccessCode);
          
          if (isSuccessCode) {
            console.log('✅ Registration successful on attempt', retryCount + 1);
            break; // Success, exit retry loop
          }
        }

        // Check for registration data - sometimes AFS returns the ID even with 800.900.300
        if (registrationData.id) {
          console.log('🎯 Registration ID found:', registrationData.id);
          console.log('✅ AFS has created registration token despite processing status');
          
          // If we have a registration ID, treat as success even with 800.900.300
          if (registrationData.result?.code === '800.900.300' && registrationData.id) {
            console.log('🔄 Overriding 800.900.300 error because registration ID exists');
            console.log('✅ Registration token successfully created:', registrationData.id);
            break; // Success, exit retry loop
          }
        }

        // Check if we got a valid response but registration is still being processed
        if (registrationData.result?.code === '800.900.300') {
          console.log(`⏱️ Registration still processing (attempt ${retryCount + 1}/${maxRetries})`);
          
          // If this is the last retry, return a more helpful error
          if (retryCount === maxRetries - 1) {
            return res.status(400).json({
              success: false,
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              debug_info: {
                attempts: maxRetries,
                total_wait_time_seconds: (5 + 4 + (maxRetries - 2) * 3),
                last_afs_response: registrationData,
                processing_status: 'AFS_STILL_PROCESSING'
              }
            });
          }
          
          // Otherwise, continue to next retry
          retryCount++;
          continue;
        }

        // Check for other error codes
        if (registrationData.result?.code && !registrationData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
          console.log('❌ Registration failed with code:', registrationData.result);
          return res.status(400).json({
            success: false,
            message: `Registration failed: ${registrationData.result.description}`,
            error_code: registrationData.result.code,
            debug_info: {
              afs_response: registrationData
            }
          });
        }

        // If we reach here, we got a successful response
        console.log('✅ Registration appears successful');
        break;

      } catch (error) {
        console.log(`❌ Error calling AFS registration endpoint (attempt ${retryCount + 1}):`);
        console.log('📊 Error Status:', error.response?.status);
        console.log('💾 Error Data:', JSON.stringify(error.response?.data, null, 2));

        // Handle specific error codes
        if (error.response?.data?.result?.code === '800.900.300') {
          console.log('🔍 AFS Error: Registration still processing (via exception)');
          
          // If this is the last retry, return helpful error
          if (retryCount === maxRetries - 1) {
            return res.status(400).json({
              success: false,
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              debug_info: {
                attempts: maxRetries,
                total_wait_time_seconds: (5 + 4 + (maxRetries - 2) * 3),
                last_error: error.response?.data,
                processing_status: 'AFS_STILL_PROCESSING_EXCEPTION'
              }
            });
          }
          
          // Otherwise, continue to next retry
          retryCount++;
          continue;
        }
        
        // For other errors, don't retry
        console.log('💥 Non-retryable error occurred');
        throw error;
      }
    }

    // Check if registration was successful
    if (registrationData.result?.code && registrationData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
      console.log('✅ Card registration successful');
      console.log('📋 Registration data received:', JSON.stringify(registrationData, null, 2));

      // Validate that we have registration data
      if (!registrationData.id) {
        console.error('❌ Missing registration ID in successful response');
        return res.status(400).json({
          success: false,
          message: 'Registration completed but no registration ID received',
          debug_info: { afs_response: registrationData }
        });
      }

      console.log('🔍 Extracting card details from AFS response...');

      // Extract card data from registration response
      const cardData = {
        customer_id: customer._id,
        customer_email: customerEmail,
        afs_registration_id: registrationData.id,
        afs_checkout_id: checkoutId,
        
        // Card details from AFS response
        maskedCardNumber: registrationData.card?.number || `****-****-****-${registrationData.card?.last4 || '****'}`,
        cardBrand: registrationData.card?.brand || registrationData.paymentBrand || 'UNKNOWN',
        cardholderName: registrationData.card?.holder || registrationData.card?.cardHolder || 'Not provided',
        expiryMonth: registrationData.card?.expiryMonth || '**',
        expiryYear: registrationData.card?.expiryYear || '****',
        
        // Registration metadata
        isDefault: existingCards.length === 0, // First card becomes default
        isActive: true,
        registrationDate: new Date(),
        lastUsed: new Date(),
        
        // AFS specific data
        afs_card_token: registrationData.id, // Same as registration ID for standalone registration
        afs_result_code: registrationData.result?.code,
        afs_result_description: registrationData.result?.description
      };

      console.log('💳 Card data prepared for saving:', JSON.stringify(cardData, null, 2));

      try {
        // Save card to database
        console.log('💾 Saving card to database...');
        const saveResult = await SavedCard.create(cardData);
        console.log('✅ Card saved successfully!');

        // 🔄 MIGRATE SUBSCRIPTION TOKENS TO NEW CARD
        console.log('🔄 Starting subscription token migration...');
        const migrationResult = await migrateSubscriptionTokens(customerEmail, registrationData.id, checkoutId);
        console.log('✅ Subscription token migration completed');

        res.json({
          success: true,
          message: 'Card registered and saved successfully. All subscriptions updated to use new card.',
          card: {
            id: saveResult._id,
            last4: cardData.maskedCardNumber.slice(-4),
            brand: cardData.cardBrand,
            holder: cardData.cardholderName,
            isDefault: true
          },
          registrationId: registrationData.id,
          subscriptionsUpdated: true,
          migrationResult: migrationResult,
          debug_info: {
            afs_registration_id: registrationData.id,
            checkout_id: checkoutId,
            card_saved: true
          }
        });

      } catch (saveError) {
        console.error('❌ Error saving card to database:', saveError);
        
        return res.status(500).json({
          success: false,
          message: 'Card registration successful but failed to save to database',
          error: saveError.message,
          debug_info: {
            afs_registration_id: registrationData.id,
            save_error: saveError.message
          }
        });
      }

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
 * Get all saved cards for a customer
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

    const cards = await SavedCard.find({ 
      customer_email: customerEmail,
      isActive: true 
    }).sort({ registrationDate: -1 });

    res.json({
      success: true,
      cards: cards.map(card => ({
        id: card._id,
        maskedCardNumber: card.maskedCardNumber,
        cardBrand: card.cardBrand,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: card.isDefault,
        registrationDate: card.registrationDate,
        lastUsed: card.lastUsed
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching customer cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer cards',
      error: error.message
    });
  }
};

/**
 * Set a card as default for a customer
 */
export const setDefaultCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { customerEmail } = req.body;

    if (!cardId || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Card ID and customer email are required'
      });
    }

    // Find the card to set as default
    const card = await SavedCard.findById(cardId);
    if (!card || card.customer_email !== customerEmail) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Remove default from all other cards for this customer
    await SavedCard.updateMany(
      { customer_email: customerEmail },
      { isDefault: false }
    );

    // Set this card as default
    await SavedCard.findByIdAndUpdate(cardId, { 
      isDefault: true,
      lastUsed: new Date()
    });

    res.json({
      success: true,
      message: 'Default card updated successfully'
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
 * Migrate subscription tokens to use new card registration ID
 * This function updates all active subscriptions for a customer to use the new card
 */
export const migrateSubscriptionTokens = async (customerEmail, newRegistrationId, newCheckoutId) => {
  try {
    console.log('\n🔄 ===== SUBSCRIPTION TOKEN MIGRATION =====');
    console.log('📧 Customer Email:', customerEmail);
    console.log('🆔 New Registration ID:', newRegistrationId);
    console.log('🛒 New Checkout ID:', newCheckoutId);
    console.log('🎯 Goal: Update all active subscriptions to use new card');

    // Find all active subscriptions for this customer
    // Look for subscriptions by various email field names that might be used
    const subscriptions = await VzatRecurringData.find({
      $and: [
        {
          $or: [
            { customer_email: customerEmail },
            { Customer_email: customerEmail },
            { opp_email: customerEmail },
            { email: customerEmail }
          ]
        },
        {
          $or: [
            { subscription_status: 'active' },
            { subscription_status: 'pending' },
            { status: 'active' },
            { status: 'pending' }
          ]
        }
      ]
    });

    console.log(`📊 Found ${subscriptions.length} active subscription(s) for ${customerEmail}`);

    if (subscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found for customer');
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
