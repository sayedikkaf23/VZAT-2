import axios from 'axios';
import SavedCard from '../model/SavedCardModel.js';
import VzatRecurringData from '../model/VzatRecurringDataModel.js';
import CustomerLogin from '../model/CustomerLoginModel.js';
import config from '../config.env.js';

// A        // Check result code in detail
        if (registrationData.result) {
          console.log('🔍 Result Analysis:');
          console.log('  🔢 Result Code:', registrationData.result.code);
          console.log('  📝 Result Description:', registrationData.result.description);
          
          // For registration tokens, successful codes are different than payment codes
          // According to AFS docs: 000.000.000 = successfully processed
          // 000.100.110 = request successfully processed
          // 000.200.000 = transaction pending
          const isSuccessCode = registrationData.result.code && 
            (registrationData.result.code ***REMOVED***= '000.000.000' || 
             registrationData.result.code ***REMOVED***= '000.100.110' ||
             registrationData.result.code.match(/^000\.000\./) ||
             registrationData.result.code.match(/^000\.100\.1/) ||
             registrationData.result.code.match(/^000\.200\./));
          
          console.log('  ✅ Is Success Code?', isSuccessCode);
          console.log('  📋 Success Pattern Check:', {
            exact_000_000_000: registrationData.result.code ***REMOVED***= '000.000.000',
            exact_000_100_110: registrationData.result.code ***REMOVED***= '000.100.110',
            pattern_000_000: registrationData.result.code.match(/^000\.000\./),
            pattern_000_100_1: registrationData.result.code.match(/^000\.100\.1/),
            pattern_000_200: registrationData.result.code.match(/^000\.200\./)
          });
          
          if (isSuccessCode) {
            console.log('✅ Registration successful on attempt', retryCount + 1);
            break; // Success, exit retry loop
          }
        }
        // Handle retry or failure logic here (detailed implementation follows)
      } catch (retryError) {
        console.log('❌ Retry error:', retryError.message);
      }
    }
  } catch (error) {
    console.error('💥 Error in handleRegistrationCallback:', error);
  }
};

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

    // For card registration, AFS expects the frontend callback URL
    // AFS will redirect to this URL with ?resourcePath=/v1/checkouts/{id}/registration
    const shopperResultUrl = `${baseUrl}/saved-card/add-card`;
    
    console.log('🔗 Setting shopperResultUrl:', shopperResultUrl);
    
    const checkoutData = new URLSearchParams({
      entityId: AFS_CONFIG.entityId,
      testMode: AFS_CONFIG.testMode,
      createRegistration: 'true', // This creates a registration token only
      
      // Customer information
      'customer.email': customerEmail,
      'customer.merchantCustomerId': customerEmail.split('@')[0],
      
      // The shopperResultUrl is where the customer will be redirected after registration
      shopperResultUrl: shopperResultUrl,
      
      // Billing information (optional for registration)
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
        // Standard widget script URL for registration checkouts
        scriptUrl: `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${response.data.id}`
      },
      debug: {
        entityId: AFS_CONFIG.entityId,
        testMode: AFS_CONFIG.testMode,
        resultCode: response.data.result?.code,
        resultDescription: response.data.result?.description,
        shopperResultUrl: shopperResultUrl
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
    console.log('\n🔔 ***REMOVED******REMOVED***= AFS CARD REGISTRATION CALLBACK ***REMOVED******REMOVED***=');
    console.log('� Timestamp:', new Date().toISOString());
    console.log('🎯 Process: Adding NEW card for existing subscription user');
    console.log('📖 Reference: https://afs.docs.oppwa.com/integrations/widget/registration-tokens');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Query params:', JSON.stringify(req.query, null, 2));
    
    const { checkoutId, customerEmail } = req.body;

    console.log('\n🔍 STEP 1: PARAMETER VALIDATION');
    if (!checkoutId || !customerEmail) {
      console.error('❌ Missing required parameters');
      return res.status(400).json({
        success: false,
        message: 'Checkout ID and customer email are required'
      });
    }
    console.log('✅ Parameters valid - checkoutId:', checkoutId);
    console.log('✅ Parameters valid - customerEmail:', customerEmail);

    console.log('\n� STEP 2: CUSTOMER & EXISTING CARDS CHECK');
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    
    if (!customer) {
      console.error('❌ Customer not found');
      return res.status(400).json({
        success: false,
        message: 'Customer not found. Please ensure you are logged in correctly.',
        error_code: 'CUSTOMER_NOT_FOUND'
      });
    }
    
    console.log('✅ Customer found:', {
      id: customer._id,
      email: customer.email,
      quotepaymentId: customer.quotepaymentId
    });

    // Check existing cards for context
    const existingCards = await SavedCard.find({ customerEmail: customerEmail });
    console.log('� Existing cards count:', existingCards.length);
    
    if (existingCards.length > 0) {
      console.log('💳 Current cards:');
      existingCards.forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.maskedCardNumber} (${card.cardBrand}) - Default: ${card.isDefault}, AFS RegID: ${card.afs_registration_id}`);
      });
    }

    console.log('\n🔍 STEP 3: AFS REGISTRATION STATUS QUERY');
    console.log('� AFS API: GET /v1/checkouts/{checkoutId}/registration');
    console.log('� Checkout ID to query:', checkoutId);
    console.log('� Purpose: Check if user completed card entry in AFS widget');
    
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
        if (retryCount ***REMOVED***= 0) {
          delayTime = 5000; // 5 seconds for first attempt - AFS needs processing time
        } else if (retryCount ***REMOVED***= 1) {
          delayTime = 4000; // 4 seconds for second attempt
        } else {
          delayTime = retryDelay; // 3 seconds for subsequent attempts
        }
        
        console.log(`⏱️ Waiting ${delayTime}ms to allow AFS registration processing...`);
        console.log(`📋 AFS Note: Callback indicates form submission, not completion. Waiting for processing.`);
        await new Promise(resolve => setTimeout(resolve, delayTime));

        const requestUrl = `${AFS_CONFIG.baseUrl}/v1/checkouts/${checkoutId}/registration`;
        const requestParams = { entityId: AFS_CONFIG.entityId };
        
        console.log('🌍 Making request to:', requestUrl);
        console.log('📋 Request params:', requestParams);
        console.log('🔑 Authorization header:', AFS_CONFIG.authorization.substring(0, 20) + '...');

        // Get registration status directly from AFS (no payment involved for standalone registration)
        const registrationResponse = await axios.get(requestUrl, {
          params: requestParams,
          headers: {
            'Authorization': AFS_CONFIG.authorization
          }
        });

        registrationData = registrationResponse.data;
        console.log('📋 RAW AFS Response received:');
        console.log('📊 Status:', registrationResponse.status);
        console.log('📄 Headers:', registrationResponse.headers);
        console.log('💾 Full Response Data:', JSON.stringify(registrationData, null, 2));

        // Check result code in detail
        if (registrationData.result) {
          console.log('🔍 Result Analysis:');
          console.log('  � Result Code:', registrationData.result.code);
          console.log('  📝 Result Description:', registrationData.result.description);
          
          // Check if registration is successful
          const isSuccessCode = registrationData.result.code && registrationData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/);
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
          console.log('💡 This often happens when registration is complete but status check was too early');
          
          // If we have a registration ID, treat as success even with 800.900.300
          if (registrationData.result?.code ***REMOVED***= '800.900.300' && registrationData.id) {
            console.log('🔄 Overriding 800.900.300 error because registration ID exists');
            console.log('✅ Registration token successfully created:', registrationData.id);
            break; // Success, exit retry loop
          }
        } else {
          console.log('❌ No registration ID in response');
        }

        // Check if we got a valid response but registration is still being processed
        if (registrationData.result?.code ***REMOVED***= '800.900.300') {
          console.log(`⏱️ Registration still processing (attempt ${retryCount + 1}/${maxRetries})`);
          console.log('🔍 AFS says: User authorization failed - this often means "still processing"');
          console.log('⏳ AFS Note: Form was submitted successfully, but registration token not yet ready');
          
          // If this is the last retry, return a more helpful error
          if (retryCount ***REMOVED***= maxRetries - 1) {
            console.log('❌ All retries exhausted. Registration may still be processing.');
            console.log('💡 Suggestion: This might be a timing issue. AFS may need more time to process.');
            return res.status(400).json({
              success: false,
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              user_guidance: {
                likely_cause: 'AFS payment gateway is still processing your card registration',
                what_happened: 'You completed the form correctly, but the payment system needs more time to process',
                next_steps: [
                  'Wait 30-60 seconds and try adding your card again',
                  'Check if your card was actually saved in your account',
                  'Try during off-peak hours if problem persists',
                  'Contact support with this error code if issues continue'
                ],
                technical_note: 'Error 800.900.300 during registration token processing'
              },
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
        console.log('📋 Error Headers:', error.response?.headers);
        console.log('💾 Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('🔍 Error Message:', error.message);
        
        // Handle specific error codes
        if (error.response?.data?.result?.code ***REMOVED***= '800.900.300') {
          console.log('🔍 AFS Error: Registration still processing (via exception)');
          console.log('⏳ This usually means AFS needs more time to generate the registration token');
          
          // If this is the last retry, return helpful error
          if (retryCount ***REMOVED***= maxRetries - 1) {
            console.log('❌ All retries exhausted due to processing timeout.');
            return res.status(400).json({
              success: false,
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              user_guidance: {
                likely_cause: 'AFS payment gateway is still processing your card registration',
                what_happened: 'You completed the form correctly, but the payment system needs more time to process',
                next_steps: [
                  'Wait 30-60 seconds and try adding your card again',
                  'Check if your card was actually saved in your account',
                  'Try during off-peak hours if problem persists',
                  'Contact support with this error code if issues continue'
                ],
                technical_note: 'Error 800.900.300 during registration token processing (exception path)'
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

      // First, look up the customer to get their ID
      console.log('👤 Looking up customer by email:', customerEmail);
      const customer = await CustomerLogin.findOne({ email: customerEmail });
      
      if (!customer) {
        console.error('❌ Customer not found for email:', customerEmail);
        return res.status(400).json({
          success: false,
          message: 'Customer not found. Please ensure you are logged in correctly.',
          error_code: 'CUSTOMER_NOT_FOUND'
        });
      }
      
      console.log('✅ Customer found:', customer._id);

      // Extract card details - mapping to correct SavedCard model fields
      const cardData = {
        customerEmail: customerEmail,
        customerId: customer._id,
        quotepaymentId: customer.quotepaymentId || checkoutId, // Use customer's payment ID or checkout ID as fallback
        afs_registration_id: registrationData.id,
        afs_checkout_id: checkoutId,
        cardholderName: registrationData.card?.holder || 'N/A',
        maskedCardNumber: registrationData.card?.last4Digits ? `**** **** **** ${registrationData.card.last4Digits}` : '**** **** **** ****',
        cardBrand: (registrationData.paymentBrand || 'OTHER').toUpperCase(),
        expiryMonth: registrationData.card?.expiryMonth || '12',
        expiryYear: registrationData.card?.expiryYear ? registrationData.card.expiryYear.slice(-2) : '99', // Last 2 digits
        isDefault: false, // Will be set to true below
        isActive: true,
        cardAddedDate: new Date()
      };

      console.log('💳 Card data to be saved:', JSON.stringify(cardData, null, 2));

      try {
        console.log('🔄 Setting all existing cards as non-default for customer:', customerEmail);
        
        // Set all existing cards as non-default for this customer
        const updateResult = await SavedCard.updateMany(
          { customerEmail: customerEmail },
          { $set: { isDefault: false } }
        );
        
        console.log('📊 Update result for existing cards:', updateResult);

        // Save the new card as default
        cardData.isDefault = true;
        console.log('💾 Creating new SavedCard document...');
        
        const savedCard = new SavedCard(cardData);
        const saveResult = await savedCard.save();
        
        console.log('✅ Card saved successfully!');
        console.log('📋 Saved card details:', JSON.stringify(saveResult.toObject(), null, 2));

        // 🔄 MIGRATE SUBSCRIPTION TOKENS TO NEW CARD
        console.log('🔄 Starting subscription token migration...');
        await migrateSubscriptionTokens(customerEmail, registrationData.id, checkoutId);
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
          debug_info: {
            afs_registration_id: registrationData.id,
            checkout_id: checkoutId,
            card_saved: true
          }
        });

      } catch (saveError) {
        console.error('❌ Error saving card to database:', saveError);
        console.error('📋 Save error details:', saveError.message);
        console.error('📋 Card data that failed to save:', cardData);
        
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

    // Get customer data to find quotepaymentId
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found for subscription migration');
      return { updated: 0, message: 'Customer not found' };
    }

    console.log('👤 Customer quotepaymentId:', customer.quotepaymentId);

    // Find all active subscriptions for this customer using multiple search criteria
    const subscriptions = await VzatRecurringData.find({
      $and: [
        {
          $or: [
            { Customer_email: customerEmail },
            { opp_email: customerEmail },
            { quotepaymentId: customer.quotepaymentId }
          ]
        },
        { subscription_status: { $in: ['active', 'pending'] } }
      ]
    });

    console.log(`📊 Found ${subscriptions.length} active subscriptions to update`);

    if (subscriptions.length ***REMOVED***= 0) {
      console.log('ℹ️ No active subscriptions found for this customer');
      console.log('🔍 Searched by:', {
        Customer_email: customerEmail,
        opp_email: customerEmail,
        quotepaymentId: customer.quotepaymentId
      });
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

// Also export the migration function for testing
export { migrateSubscriptionTokens };
