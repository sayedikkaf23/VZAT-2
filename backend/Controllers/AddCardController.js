import axios from 'axios';
import SavedCard from '../model/SavedCardModel.js';
import VzatRecurringData from '../model/VzatRecurringDataModel.js';
import CustomerLogin from '../model/CustomerLoginModel.js';
// import config from '../config.env.js';
import { connectDB } from '../config/db.js';
import Post_Common_DB_Log_Data from './PostCommonDBLogData.js';
import qs from 'qs';   // CommonJS
// AFS Configuration - Registration specific credentials
const AFS_CONFIG = {
  baseUrl: process.env.AFS_BASE_URL ||  'https://eu-test.oppwa.com',
  entityId: process.env.AFS_ENTITY_ID,
  accessToken: process.env.AFS_ACCESS_TOKEN ,
  authorization: process.env.AFS_AUTHORIZATION ,
  currency: process.env.AFS_CURRENCY || 'AED',
  testMode: 'EXTERNAL'
};

/**
 * Step 1: Prepare AFS checkout for card registration with payment
 * Based on AFS Server-to-Server integration: https://afs.docs.oppwa.com/integrations/server-to-server
 */
export const prepareCardRegistrationWithPayment = async (req, res) => {
  await connectDB();

  try {
    console.log('🔧 AddCardController: prepareCardRegistrationWithPayment called');
    console.log('📋 Request body:', req.body);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      const data = { message: "Body is empty" };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration-with-payment", {}, data);
      return res.status(400).json(data);
    }

    const { customerEmail, amount = 1.00, currency = 'AED' } = req.body;

    if (!customerEmail) {
      console.log('❌ No customer email provided');
      const data = { message: 'Customer email is required' };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration-with-payment", req.body, data);
      return res.status(400).json(data);
    }

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found:', customerEmail);
      const data = { message: 'Customer not found' };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration-with-payment", req.body, data);
      return res.status(404).json(data);
    }

    // Configure AFS checkout for registration with payment
    const checkoutData = {
      merchantTransactionId:`${Date.now()}`, // ← usually the same as Pay-by-Link quote ID
      entityId: AFS_CONFIG.entityId,        // ← usually DIFFERENT from Pay-by-Link entity
      amount:  1.00,
      currency: AFS_CONFIG.currency,
      paymentType: "DB",
      integrity: "true",
      createRegistration: true  // ← ADDED: Create registration for new cards
    };
    
    // Convert to x-www-form-urlencoded string
    const urlEncodedCheckoutData = Object.entries(checkoutData)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    console.log('📝 Creating AFS checkout for registration with payment...');
    console.log('🔗 AFS Endpoint:', `${AFS_CONFIG.baseUrl}/v1/checkouts`);
    console.log('🔑 Entity ID:', AFS_CONFIG.entityId);
    console.log('📧 Customer:', customerEmail);
    console.log('💰 Amount:', amount, currency);

    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/checkouts`,
      qs.stringify(checkoutData),
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
         "Content-Type": "application/x-www-form-urlencoded",
        }
      }
    );

    const checkoutResult = response.data;
    console.log('✅ AFS checkout created successfully');
    console.log('🆔 Checkout ID:', checkoutResult.id);
    console.log('📋 Full Response:', JSON.stringify(checkoutResult, null, 2));

    // Generate payment widget URL and page URL similar to payment flow
    let paymentWidgetUrl = null;
    let paymentPageUrl = null;
    let finalShopperResultUrl = null;
    
    if (checkoutResult && checkoutResult.id) {
      paymentWidgetUrl = `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutResult.id}`;
      // paymentPageUrl = `${process.env.FRONTEND_URL}/add-card/${encodeURIComponent(checkoutResult.id)}`;
      
      // Generate shopper result URL with parameters
      const id = encodeURIComponent(checkoutResult.id);
      const resourcePath = encodeURIComponent(`/v1/checkouts/${checkoutResult.id}/payment`);
      // finalShopperResultUrl = `${process.env.BACKEND_URL}/api/cards/payment-callback?id=${id}&resourcePath=${resourcePath}&customerEmail=${encodeURIComponent(customerEmail)}`;
    }

    // Return response in format similar to payment flow
    const data = {
      status: true,
      message: "Card registration with payment checkout created successfully",
      customerEmail,
      checkoutResult,
      afs_checkout_id: checkoutResult.id,
      payment_widget_url: paymentWidgetUrl,
      // payment_page_url: paymentPageUrl,
      shopper_result_url: finalShopperResultUrl,
      afs_config: {
        baseUrl: AFS_CONFIG.baseUrl,
        entityId: AFS_CONFIG.entityId,
        testMode: AFS_CONFIG.testMode
      },
      registration_type: "card_registration_with_payment",
      payment_required: true,
      amount: amount,
      currency: currency
    };

    Post_Common_DB_Log_Data("/api/cards/prepare-registration-with-payment", req.body, data);
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Error preparing checkout with payment:', error.response?.data || error.message);
    console.error('📊 Error status:', error.response?.status);
    console.error('📋 Error headers:', error.response?.headers);
    
    if (error.response?.data?.result) {
      console.error('🔍 AFS Error details:', error.response.data.result);
    }
    
    const data = {
      status: false,
      message: 'Failed to prepare card registration with payment checkout',
      error: error.response?.data || error.message,
      errorType: error.response ? 'AFS_API_ERROR' : 'NETWORK_ERROR',
      statusCode: error.response?.status
    };
    
    Post_Common_DB_Log_Data("/api/cards/prepare-registration-with-payment", req.body, data);
    return res.status(500).json(data);
  }
};

/**
 * Step 1: Prepare AFS checkout for card registration
 * Based on AFS Server-to-Server integration: https://afs.docs.oppwa.com/integrations/server-to-server
 */
export const prepareCardRegistration = async (req, res) => {
  await connectDB();

  try {
    console.log('🔄 prepareCardRegistration called');
    console.log('📋 Request body:', req.body);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      const data = { message: "Body is empty" };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration", {}, data);
      return res.status(400).json(data);
    }

    const { customerEmail } = req.body;

    if (!customerEmail) {
      console.log('❌ No customer email provided');
      const data = { message: 'Customer email is required' };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration", req.body, data);
      return res.status(400).json(data);
    }

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found:', customerEmail);
      const data = { message: 'Customer not found' };
      Post_Common_DB_Log_Data("/api/cards/prepare-registration", req.body, data);
      return res.status(404).json(data);
    }

    // Configure AFS checkout for standalone registration
    const checkoutData = {
      entityId: AFS_CONFIG.entityId,
      createRegistration: true,
      shopperResultUrl: `${process.env.FRONTEND_URL}/saved-card/add-card`,
      testMode: AFS_CONFIG.testMode
    };
    
    // Convert to x-www-form-urlencoded string
    const urlEncodedCheckoutData = Object.entries(checkoutData)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    console.log('📝 Creating AFS checkout for registration...');
    console.log('🔗 AFS Endpoint:', `${AFS_CONFIG.baseUrl}/v1/checkouts`);
    console.log('🔑 Entity ID:', AFS_CONFIG.entityId);
    console.log('📧 Customer:', customerEmail);

    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/checkouts`,
      urlEncodedCheckoutData,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const checkoutResult = response.data;
    console.log('✅ AFS checkout created successfully');
    console.log('🆔 Checkout ID:', checkoutResult.id);
    console.log('📋 Full Response:', JSON.stringify(checkoutResult, null, 2));

    // Generate payment widget URL and page URL similar to payment flow
    let paymentWidgetUrl = null;
    let paymentPageUrl = null;
    let finalShopperResultUrl = null;
    
    if (checkoutResult && checkoutResult.id) {
      paymentWidgetUrl = `${AFS_CONFIG.baseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutResult.id}`;
      paymentPageUrl = `${process.env.FRONTEND_URL}/add-card/${encodeURIComponent(checkoutResult.id)}`;
      
      // Generate shopper result URL with parameters
      const id = encodeURIComponent(checkoutResult.id);
      const resourcePath = encodeURIComponent(`/v1/checkouts/${checkoutResult.id}/registration`);
      finalShopperResultUrl = `${process.env.BACKEND_URL}/api/cards/registration-callback?id=${id}&resourcePath=${resourcePath}&customerEmail=${encodeURIComponent(customerEmail)}`;
    }

    // Return response in format similar to payment flow
    const data = {
      status: true,
      message: "Card registration checkout created successfully",
      customerEmail,
      afs_checkout_id: checkoutResult.id,
      payment_widget_url: paymentWidgetUrl,
      payment_page_url: paymentPageUrl,
      shopper_result_url: finalShopperResultUrl,
      afs_config: {
        baseUrl: AFS_CONFIG.baseUrl,
        entityId: AFS_CONFIG.entityId,
        testMode: AFS_CONFIG.testMode
      },
      registration_type: "card_registration_only",
      payment_required: false
    };

    Post_Common_DB_Log_Data("/api/cards/prepare-registration", req.body, data);
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Error preparing checkout:', error.response?.data || error.message);
    console.error('📊 Error status:', error.response?.status);
    console.error('📋 Error headers:', error.response?.headers);
    
    if (error.response?.data?.result) {
      console.error('🔍 AFS Error details:', error.response.data.result);
    }
    
    const data = {
      status: false,
      message: 'Failed to prepare card registration checkout',
      error: error.response?.data || error.message,
      errorType: error.response ? 'AFS_API_ERROR' : 'NETWORK_ERROR',
      statusCode: error.response?.status
    };
    
    Post_Common_DB_Log_Data("/api/cards/prepare-registration", req.body, data);
    return res.status(500).json(data);
  }
};

/**
 * Step 2: Handle successful card registration with payment callback
 */
export const handleCardPaymentCallback = async (req, res) => {
  await connectDB();

  try {
    console.log('🔧 AddCardController: handleCardPaymentCallback called');
    console.log('📋 Request body:', req.body);
    console.log('🔗 Request query:', req.query);
    
    // Extract parameters from query string (AFS sends them as query params)
    const checkoutId = req.query.id || req.body.id;
    const resourcePath = req.query.resourcePath || req.body.resourcePath;
    const customerEmail = req.query.customerEmail || req.body.customerEmail;
    
    console.log('🔍 Extracted parameters:', { checkoutId, resourcePath, customerEmail });

    if (!checkoutId) {
      console.error('❌ No checkout ID provided');
      const data = { message: 'Checkout ID is required' };
      Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
      return res.status(400).json(data);
    }

    if (!customerEmail) {
      console.error('❌ No customer email provided');
      const data = { message: 'Customer email is required' };
      Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
      return res.status(400).json(data);
    }

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.error('❌ Customer not found:', customerEmail);
      const data = { message: 'Customer not found' };
      Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
      return res.status(404).json(data);
    }

    // Check payment status with AFS
    console.log('🔍 Checking payment status with AFS...');
    const statusResponse = await axios.get(
      `${AFS_CONFIG.baseUrl}${resourcePath}`,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization
        }
      }
    );

    console.log('✅ AFS payment status response:', statusResponse.data);

    // Check if payment was successful
    if (statusResponse.data && statusResponse.data.result && statusResponse.data.result.code) {
      const resultCode = statusResponse.data.result.code;
      console.log('🔍 Payment result code:', resultCode);

      if (resultCode.startsWith('000.') || resultCode.startsWith('800.')) {
        // Payment successful - save card details
        console.log('✅ Payment successful, saving card details...');

        // Extract card details from the response
        const fullCardNumber = statusResponse.data.card?.number || statusResponse.data.card?.maskedPan || '';
        const maskedCardNumber = statusResponse.data.card?.maskedPan || `****-****-****-${statusResponse.data.card?.last4 || '****'}`;
        
        const cardDetails = {
          customer_id: customer._id,
          customer_email: customerEmail,
          afs_registration_id: statusResponse.data.registrationId || statusResponse.data.id,
          afs_checkout_id: checkoutId,
          cardNumber: fullCardNumber, // Store full card number
          maskedCardNumber: maskedCardNumber, // Keep masked version for display
          cardBrand: statusResponse.data.card?.brand || statusResponse.data.paymentBrand || 'UNKNOWN',
          cardholderName: statusResponse.data.card?.holder || 'Not provided',
          expiryMonth: statusResponse.data.card?.expiryMonth || '**',
          expiryYear: statusResponse.data.card?.expiryYear || '****',
          isDefault: true, // Set as default since it's the first card
          isActive: true,
          registrationDate: new Date(),
          lastUsed: new Date(),
          afs_card_token: statusResponse.data.registrationId || statusResponse.data.id,
          afs_result_code: statusResponse.data.result?.code,
          afs_result_description: statusResponse.data.result?.description
        };

        console.log('💳 Card details to save:', JSON.stringify(cardDetails, null, 2));

        // Save card to database
        const savedCard = new SavedCard(cardDetails);
        await savedCard.save();

        console.log('✅ Card saved successfully with ID:', savedCard._id);

        // Return success response
        const data = {
          status: true,
          message: 'Card registered and payment processed successfully',
          customerEmail,
          afs_checkout_id: checkoutId,
          afs_registration_id: statusResponse.data.registrationId || statusResponse.data.id,
          card: {
            id: savedCard._id,
            last4: statusResponse.data.card?.last4 || '****',
            brand: statusResponse.data.card?.brand || 'UNKNOWN',
            holder: statusResponse.data.card?.holder || 'Not provided',
            isDefault: true
          },
          payment_processed: true,
          registration_type: 'card_registration_with_payment'
        };

        Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
        return res.status(200).json(data);

      } else {
        // Payment failed
        console.error('❌ Payment failed with code:', resultCode);
        const data = {
          status: false,
          message: `Payment failed: ${statusResponse.data.result?.description || 'Unknown error'}`,
          error_code: resultCode,
          registration_type: 'card_registration_with_payment'
        };

        Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
        return res.status(400).json(data);
      }
    } else {
      // Invalid response
      console.error('❌ Invalid payment status response');
      const data = {
        status: false,
        message: 'Invalid payment status response from payment provider',
        registration_type: 'card_registration_with_payment'
      };

      Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
      return res.status(400).json(data);
    }

  } catch (error) {
    console.error('❌ Error handling payment callback:', error.response?.data || error.message);
    console.error('📊 Error status:', error.response?.status);

    const data = {
      status: false,
      message: 'Failed to process payment callback',
      error: error.response?.data || error.message,
      errorType: error.response ? 'AFS_API_ERROR' : 'NETWORK_ERROR',
      statusCode: error.response?.status,
      registration_type: 'card_registration_with_payment'
    };

    Post_Common_DB_Log_Data("/api/cards/payment-callback", { body: req.body, query: req.query }, data);
    return res.status(500).json(data);
  }
};

/**
 * Step 2: Handle successful card registration callback
 */
export const handleCardRegistrationCallback = async (req, res) => {
  await connectDB();

  try {
    console.log('\n🔔 ===== AFS CARD REGISTRATION CALLBACK =====');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🎯 Process: Adding NEW card for existing subscription user');
    console.log('📖 Reference: https://afs.docs.oppwa.com/integrations/widget/registration-tokens');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Query params:', JSON.stringify(req.query, null, 2));
    
    if (!req.body || Object.keys(req.body).length === 0) {
      const data = { message: "Body is empty" };
      Post_Common_DB_Log_Data("/api/cards/registration-callback", {}, data);
      return res.status(400).json(data);
    }
    
    const { checkoutId, customerEmail } = req.body;

    if (!checkoutId || !customerEmail) {
      console.log('❌ Missing required fields');
      const data = { message: 'Missing checkoutId or customerEmail' };
      Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
      return res.status(400).json(data);
    }

    console.log('\n🔍 STEP 1: VALIDATION');
    console.log('✅ Checkout ID:', checkoutId);
    console.log('✅ Customer Email:', customerEmail);

    // Verify customer exists
    const customer = await CustomerLogin.findOne({ email: customerEmail });
    if (!customer) {
      console.log('❌ Customer not found:', customerEmail);
      const data = { message: 'Customer not found' };
      Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
      return res.status(404).json(data);
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
            const data = {
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              debug_info: {
                attempts: maxRetries,
                total_wait_time_seconds: (5 + 4 + (maxRetries - 2) * 3),
                last_afs_response: registrationData,
                processing_status: 'AFS_STILL_PROCESSING'
              }
            };
            
            Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
            return res.status(400).json(data);
          }
          
          // Otherwise, continue to next retry
          retryCount++;
          continue;
        }

        // Check for other error codes
        if (registrationData.result?.code && !registrationData.result.code.match(/^(000\.000\.|000\.100\.1|000\.200)/)) {
          console.log('❌ Registration failed with code:', registrationData.result);
          const data = {
            message: `Registration failed: ${registrationData.result.description}`,
            error_code: registrationData.result.code,
            debug_info: {
              afs_response: registrationData
            }
          };
          
          Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
          return res.status(400).json(data);
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
            const data = {
              message: 'Card registration is taking longer than expected to process. This can happen during peak times or with complex card verification. Please wait a moment and try adding your card again, or contact support if the issue persists.',
              error_code: 'REGISTRATION_PROCESSING_TIMEOUT',
              debug_info: {
                attempts: maxRetries,
                total_wait_time_seconds: (5 + 4 + (maxRetries - 2) * 3),
                last_error: error.response?.data,
                processing_status: 'AFS_STILL_PROCESSING_EXCEPTION'
              }
            };
            
            Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
            return res.status(400).json(data);
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
        const data = {
          message: 'Registration completed but no registration ID received',
          debug_info: { afs_response: registrationData }
        };
        
        Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
        return res.status(400).json(data);
      }

      console.log('🔍 Extracting card details from AFS response...');

      // Extract card data from registration response
      const cardData = {
        customerId: customer._id,
        customerEmail: customerEmail,
        quotepaymentId: customer.quotepaymentId || '',
        afs_registration_id: registrationData.id,
        afs_checkout_id: checkoutId,
        
        // Card details from AFS response
        maskedCardNumber: registrationData.card?.number || `****-****-****-${registrationData.card?.last4 || '****'}`,
        cardBrand: registrationData.card?.brand || registrationData.paymentBrand || 'UNKNOWN',
        cardholderName: registrationData.card?.holder || 'Not provided',
        expiryMonth: registrationData.card?.expiryMonth || '**',
        expiryYear: registrationData.card?.expiryYear || '****',
        
        // Registration metadata
        isDefault: true, // Always set new card as default
        isActive: true,
        lastUsedDate: new Date(),
        
        // AFS specific data
        afs_result_code: registrationData.result?.code,
        afs_result_description: registrationData.result?.description
      };

      console.log('💳 Card data prepared for saving:', JSON.stringify(cardData, null, 2));

      try {
        // Remove default from all other cards for this customer
        await SavedCard.updateMany(
          { customerId: customer._id, isActive: true },
          { isDefault: false }
        );
        
        // Save card to database
        console.log('💾 Saving card to database...');
        const saveResult = await SavedCard.create(cardData);
        console.log('✅ Card saved successfully!');

        // 🔄 MIGRATE SUBSCRIPTION TOKENS TO NEW CARD
        console.log('🔄 Starting subscription token migration...');
        const migrationResult = await migrateSubscriptionTokens(customerEmail, registrationData.id, checkoutId);
        console.log('✅ Subscription token migration completed');

        const data = {
          status: true,
          message: 'Card registered and saved successfully. All subscriptions updated to use new card.',
          customerEmail,
          afs_checkout_id: checkoutId,
          afs_registration_id: registrationData.id,
          card: {
            id: saveResult._id,
            last4: cardData.maskedCardNumber.slice(-4),
            brand: cardData.cardBrand,
            holder: cardData.cardholderName,
            isDefault: true
          },
          subscriptionsUpdated: true,
          migrationResult: migrationResult,
          registration_type: "card_registration_only",
          payment_processed: false,
          debug_info: {
            afs_registration_id: registrationData.id,
            checkout_id: checkoutId,
            card_saved: true
          }
        };

        Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
        return res.status(200).json(data);

      } catch (saveError) {
        console.error('❌ Error saving card to database:', saveError);
        
        const data = {
          status: false,
          message: 'Card registration successful but failed to save to database',
          error: saveError.message,
          debug_info: {
            afs_registration_id: registrationData.id,
            save_error: saveError.message
          }
        };
        
        Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
        return res.status(500).json(data);
      }

    } else {
      console.error('❌ Card registration failed:', registrationData.result);
      const data = {
        status: false,
        message: 'Card registration failed',
        error: registrationData.result?.description || 'Unknown error'
      };
      
      Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
      return res.status(400).json(data);
    }

  } catch (error) {
    console.error('❌ Error handling card registration:', error.response?.data || error.message);
    const data = {
      status: false,
      message: 'Failed to process card registration',
      error: error.response?.data || error.message
    };
    
    Post_Common_DB_Log_Data("/api/cards/registration-callback", req.body, data);
    return res.status(500).json(data);
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
        status: false,
        message: 'Customer email is required'
      });
    }

    const cards = await SavedCard.find({ 
      customerEmail: customerEmail,
      isActive: true 
    }).sort({ cardAddedDate: -1 });

    res.json({
      status: true,
      cards: cards.map(card => ({
        id: card._id,
        maskedCardNumber: card.maskedCardNumber,
        cardBrand: card.cardBrand,
        cardholderName: card.cardholderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        isDefault: card.isDefault,
        cardAddedDate: card.cardAddedDate,
        lastUsedDate: card.lastUsedDate
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching customer cards:', error);
    res.status(500).json({
      status: false,
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
        status: false,
        message: 'Card ID and customer email are required'
      });
    }

    // Find the card to set as default
    const card = await SavedCard.findById(cardId);
    if (!card || card.customerEmail !== customerEmail) {
      return res.status(404).json({
        status: false,
        message: 'Card not found'
      });
    }

    // Remove default from all other cards for this customer
    await SavedCard.updateMany(
      { customerEmail: customerEmail },
      { isDefault: false }
    );

    // Set this card as default
    await SavedCard.findByIdAndUpdate(cardId, { 
      isDefault: true,
      lastUsed: new Date()
    });

    res.json({
      status: true,
      message: 'Default card updated successfully'
    });

  } catch (error) {
    console.error('❌ Error setting default card:', error);
    res.status(500).json({
      status: false,
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

/**
 * Check payment status and handle navigation back to add-card page
 * This endpoint is called after payment completion to verify status
 */
// export const getPaymentStatus = async (req, res) => {
//   try {
//     const { resourcePath } = req.query;

//     if (!resourcePath) {
//       return res.status(400).json({
//         status: "FAILED",
//         error: "MISSING_RESOURCE_PATH",
//         message: "resourcePath is required",
//       });
//     }

//     // Ensure baseUrl ends with /
//     const baseUrl = "https://eu-test.oppwa.com"

//     const decodedResourcePath = decodeURIComponent(resourcePath);
//     const url = `${baseUrl}/${decodedResourcePath.replace(/^\//, "")}`; // avoid double //

//     console.log("🌍 Requesting payment status:", url);

//     const { data } = await axios.get(url, {
//       params: { entityId: "8ac7a4c797e1beca0197e482a8200127" },
//       headers: {
//         'Authorization': `Bearer ${'OGFjN2E0Yzc5N2UxYmVjYTAxOTdlNDgxYWFhYTAxMjJ8NnBtN1IlWVlTUkRSYXE2UXFDWXA='}`,
//       },
//       timeout: 10000,
//     });

//     return res.status(200).json({
//       status: "SUCCESS",
//       payment: data,
//     });

//   } catch (err) {
//     const code = err?.response?.data?.result?.code;

//     console.error("❌ Payment status error →", code, err?.response?.data);

//     if (code === "800.900.300") {
//       return res.status(401).json({
//         status: "FAILED",
//         error: "AUTHENTICATION_FAILED",
//         message: "Checkout expired or invalid",
//         suggestion: "Create a new checkout session",
//       });
//     }

//     if (code === "200.300.404") {
//       return res.status(404).json({
//         status: "FAILED",
//         error: "CHECKOUT_NOT_FOUND",
//         message: "Checkout not found or already expired",
//         suggestion: "Create a new checkout session",
//       });
//     }

//     return res.status(err?.response?.status || 500).json({
//       status: "FAILED",
//       error: "UNKNOWN_ERROR",
//       message: "Failed to fetch payment status",
//       details: err?.response?.data?.result?.description || err.message,
//     });
//   }
// };



export const getPaymentStatus = async (req, res) => {
  await connectDB();
  
  try {
    const { resourcePath, customerId, customerEmail } = req.query;

    if (!resourcePath) {
      return res.status(400).json({
        status: "FAILED",
        error: "MISSING_RESOURCE_PATH",
        message: "resourcePath is required",
      });
    }

    // Extract checkout ID from resource path for later use
    const checkoutIdMatch = resourcePath.match(/checkouts\/([^\/]+)\//);
    const checkoutId = checkoutIdMatch ? checkoutIdMatch[1] : null;

    const decodedResourcePath = decodeURIComponent(resourcePath);
    const url = `https://eu-test.oppwa.com/${decodedResourcePath.replace(/^\//, "")}`;

    console.log("🌍 Requesting payment status:", url);
    console.log("🆔 Checkout ID extracted:", checkoutId);

    // 1️⃣ Get payment status
    const { data: payment } = await axios.get(url, {
      params: { entityId: AFS_CONFIG.entityId },
      headers: { Authorization: AFS_CONFIG.authorization },
      timeout: 10000,
    });

    // 2️⃣ If debit succeeded, issue refund and save card details
    let refund = null;
    let savedCard = null;
    
    // Check if payment succeeded - any code starting with "000." is success
    if (payment?.result?.code?.startsWith("000.") && payment?.id) {
      console.log("✅ Debit successful → Initiating refund...");
      console.log(`💳 Payment result code: ${payment.result.code}`);

      const refundUrl = `${AFS_CONFIG.baseUrl}/v1/payments/${payment.id}`;
      const refundPayload = new URLSearchParams({
        entityId: AFS_CONFIG.entityId,
        amount: payment.amount,
        currency: payment.currency,
        paymentType: "RF", // refund
      });

      const { data: refundData } = await axios.post(refundUrl, refundPayload, {
        headers: {
          Authorization: AFS_CONFIG.authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });

      refund = refundData;
      console.log("💸 Refund response:", refund);

      // 3️⃣ Save card details to database if customer information is provided
      if (customerId || customerEmail) {
        try {
          console.log("💳 Saving card details to database...");
          
          // Find customer by ID or email
          let customer = null;
          if (customerId) {
            customer = await CustomerLogin.findById(customerId);
          } else if (customerEmail) {
            customer = await CustomerLogin.findOne({ email: customerEmail });
          }

          if (!customer) {
            console.log("❌ Customer not found for card saving");
          } else {
            console.log("✅ Customer found:", customer.email);

            // Check if this is the customer's first card
            const existingCards = await SavedCard.find({ 
              customerId: customer._id, 
              isActive: true 
            });
            const isFirstCard = existingCards.length === 0;

            // Extract card information from payment response
            // Handle different possible response structures from AFS
            const cardInfo = payment.card || {};
            const paymentBrand = payment.paymentBrand || '';
            const descriptor = payment.descriptor || '';
            
            // Try to extract last 4 digits from various sources
            let last4Digits = '';
            if (cardInfo.last4Digits) {
              last4Digits = cardInfo.last4Digits;
            } else if (cardInfo.last4) {
              last4Digits = cardInfo.last4;
            } else if (cardInfo.maskedPan) {
              // Extract last 4 from masked PAN like "411111******1111"
              const match = cardInfo.maskedPan.match(/(\d{4})$/);
              if (match) last4Digits = match[1];
            } else if (descriptor) {
              // Try to extract from descriptor like "9740.6017.5006 YEEPEEY"
              const match = descriptor.match(/(\d{4})$/);
              if (match) last4Digits = match[1];
            }
            
            const maskedCardNumber = last4Digits ? `**** **** **** ${last4Digits}` : '**** **** **** ****';
            
            // Determine card brand and normalize to match model enum
            let cardBrand = 'UNKNOWN';
            if (cardInfo.brand) {
              cardBrand = cardInfo.brand.toUpperCase();
            } else if (paymentBrand) {
              cardBrand = paymentBrand.toUpperCase();
            } else if (last4Digits) {
              // Try to determine brand from first digit
              const firstDigit = last4Digits.charAt(0);
              if (firstDigit === '4') cardBrand = 'VISA';
              else if (firstDigit === '5') cardBrand = 'MASTERCARD';
              else if (firstDigit === '3') cardBrand = 'AMEX';
            }
            
            // Normalize card brand to match SavedCard model enum values
            if (cardBrand === 'MASTER') cardBrand = 'MASTERCARD';
            if (cardBrand === 'AMERICAN EXPRESS') cardBrand = 'AMEX';
            
            // Extract expiry information
            let expiryMonth = cardInfo.expiryMonth || '';
            let expiryYear = cardInfo.expiryYear || '';
            
            // Handle different field names for expiry
            if (!expiryMonth && cardInfo.expiryMonth) {
              expiryMonth = cardInfo.expiryMonth;
            }
            if (!expiryYear && cardInfo.expiryYear) {
              expiryYear = cardInfo.expiryYear;
            }
            
            // Ensure proper format
            if (expiryMonth && expiryMonth.length === 1) {
              expiryMonth = '0' + expiryMonth;
            }
            if (expiryYear && expiryYear.length === 4) {
              expiryYear = expiryYear.slice(-2);
            }

            // Create card data for saving
            const cardData = {
              customerId: customer._id,
              customerEmail: customer.email,
              quotepaymentId: customer.quotepaymentId || '',
              afs_registration_id: payment.registrationId || payment.id,
              afs_checkout_id: payment.ndc || '',
              cardholderName: cardInfo.holder || cardInfo.cardHolder || 'Card Holder',
              cardNumber: cardInfo.number || cardInfo.maskedPan || '', // Store full card number
              maskedCardNumber: maskedCardNumber, // Keep masked version for display
              cardBrand: cardBrand.toUpperCase(),
              expiryMonth: expiryMonth,
              expiryYear: expiryYear,
              isDefault: true, // Always set new card as default
              isActive: true,
              lastUsedDate: new Date()
            };

            console.log("💳 Card data to save:", JSON.stringify(cardData, null, 2));

            // Remove default from all other cards for this customer
            await SavedCard.updateMany(
              { customerId: customer._id, isActive: true },
              { isDefault: false }
            );

            // Save the card
            const newCard = new SavedCard(cardData);
            savedCard = await newCard.save();

            console.log("✅ Card saved successfully with ID:", savedCard._id);
            console.log("✅ Card set as default:", savedCard.isDefault);
          }
        } catch (cardError) {
          console.error("❌ Error saving card details:", cardError);
          // Don't fail the entire request if card saving fails
        }
      }
    }

    return res.status(200).json({
      status: "SUCCESS",
      payment,
      refund, // included if processed
      savedCard: savedCard ? {
        id: savedCard._id,
        maskedCardNumber: savedCard.maskedCardNumber,
        cardBrand: savedCard.cardBrand,
        isDefault: savedCard.isDefault,
        cardholderName: savedCard.cardholderName
      } : null
    });
  } catch (err) {
    const code = err?.response?.data?.result?.code;
    const description = err?.response?.data?.result?.description;
    console.error("❌ Payment status error →", code, err?.response?.data);

    // Extract checkout ID from resource path
    const resourcePath = req.query.resourcePath;
    const checkoutIdMatch = resourcePath?.match(/checkouts\/([^\/]+)\//);
    const checkoutId = checkoutIdMatch ? checkoutIdMatch[1] : null;
    const customerEmail = req.query.customerEmail;

    // 200.300.404 with "invalid or missing parameter" means payment not completed yet (user hasn't submitted form)
    if (code === "200.300.404" && description === "invalid or missing parameter") {
      console.log("⏳ Payment not completed yet - user hasn't submitted the form");
      return res.status(200).json({
        status: "PENDING",
        message: "Payment form not submitted yet",
        checkoutId: checkoutId,
        waitingForUser: true
      });
    }

    // If checkout expired/not found AND card might have been saved, check database
    if ((code === "800.900.300" || code === "200.300.404") && checkoutId && customerEmail) {
      console.log("🔍 Checkout expired/not found, checking if card was already saved...");
      
      try {
        // Find customer
        const customer = await CustomerLogin.findOne({ email: customerEmail });
        
        if (customer) {
          // Check if a card was saved with this checkout ID
          const existingCard = await SavedCard.findOne({ 
            customerId: customer._id, 
            afs_checkout_id: checkoutId,
            isActive: true 
          });

          if (existingCard) {
            console.log("✅ Card was already saved successfully!");
            return res.status(200).json({
              status: "SUCCESS",
              message: "Card was already saved successfully",
              alreadyProcessed: true,
              savedCard: {
                id: existingCard._id,
                maskedCardNumber: existingCard.maskedCardNumber,
                cardBrand: existingCard.cardBrand,
                isDefault: existingCard.isDefault,
                cardholderName: existingCard.cardholderName
              }
            });
          }
        }
      } catch (dbError) {
        console.error("❌ Error checking existing card:", dbError);
        // Continue to return the original error if DB check fails
      }
    }

    if (code === "800.900.300") {
      return res.status(401).json({
        status: "FAILED",
        error: "AUTHENTICATION_FAILED",
        message: "Checkout expired or invalid",
        suggestion: "The payment session has expired. Please try adding your card again.",
      });
    }

    if (code === "200.300.404") {
      return res.status(404).json({
        status: "FAILED",
        error: "CHECKOUT_NOT_FOUND",
        message: "Checkout not found or already expired",
        suggestion: "The payment session has expired. Please try adding your card again.",
      });
    }

    return res.status(err?.response?.status || 500).json({
      status: "FAILED",
      error: "UNKNOWN_ERROR",
      message: "Failed to fetch payment status",
      details: err?.response?.data?.result?.description || err.message,
    });
  }
};



export default {
  prepareCardRegistration,
  handleCardRegistrationCallback,
  getCustomerCards,
  setDefaultCard
};
