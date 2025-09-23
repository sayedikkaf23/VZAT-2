import axios from 'axios';
import SavedCard from '../model/SavedCardModel.js';
import config from '../config.env.js';

// AFS Configuration - Using the same config as the working AddCardController
const AFS_CONFIG = {
  baseUrl: process.env.AFS_BASE_URL || config.AFS_BASE_URL,
  entityId: process.env.AFS_ENTITY_ID || config.AFS_ENTITY_ID,
  authorization: `Bearer ${(
    (process.env.AFS_AUTHORIZATION || config.AFS_AUTHORIZATION) || ''
  ).replace(/^Bearer /, '')}`,
  testMode: 'EXTERNAL'
};

console.log('🔧 AFS Config:', {
  baseUrl: AFS_CONFIG.baseUrl,
  entityId: AFS_CONFIG.entityId,
  authorization: AFS_CONFIG.authorization.substring(0, 20) + '...',
  testMode: AFS_CONFIG.testMode
});

// Log environment variables for debugging
console.log('🔧 Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  AFS_BASE_URL: process.env.AFS_BASE_URL,
  AFS_ENTITY_ID: process.env.AFS_ENTITY_ID,
  AFS_AUTHORIZATION: process.env.AFS_AUTHORIZATION ? process.env.AFS_AUTHORIZATION.substring(0, 20) + '...' : 'undefined'
});

// Initialize payment for card addition (1 AED charge)
export const initializeCardPayment = async (req, res) => {
  try {
    console.log('🔧 AddCardPaymentController: initializeCardPayment called');
    console.log('🔧 Request body:', req.body);
    
    const { customerId, entityId, amount, currency, paymentType, description } = req.body;

    console.log('🔧 Backend: customerId =', customerId);
    console.log('🔧 Backend: customerId type =', typeof customerId);
    console.log('🔧 Backend: customerId length =', customerId ? customerId.length : 0);

    if (!customerId) {
      console.log('❌ Backend: Customer ID is empty or falsy');
      return res.status(400).json({ 
        success: false, 
        message: 'Customer ID is required' 
      });
    }

    // Create checkout session with AFS for card registration (similar to working AddCardController)
    const checkoutData = {
      entityId: AFS_CONFIG.entityId,
      createRegistration: true,
      shopperResultUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/add-card/payment-result?customerId=${encodeURIComponent(customerId)}`,
      testMode: AFS_CONFIG.testMode
    };

    // Convert to x-www-form-urlencoded string (same as working implementation)
    const urlEncodedCheckoutData = Object.entries(checkoutData)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    console.log('🔧 Backend: AFS checkout payload =', checkoutData);
    console.log('🔧 Backend: URL encoded data =', urlEncodedCheckoutData);
    
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

    console.log('🔧 AFS Response:', response.data);
    console.log('🔧 AFS Response Status:', response.status);

    if (response.data && response.data.id) {
      console.log('✅ Checkout created successfully with ID:', response.data.id);
      res.status(200).json({
        success: true,
        checkoutId: response.data.id,
        message: 'Payment initialized successfully'
      });
    } else if (response.data && response.data.result && response.data.result.code) {
      console.log('❌ AFS returned error code:', response.data.result.code);
      console.log('❌ AFS error description:', response.data.result.description);
      throw new Error(`AFS Error: ${response.data.result.description || 'Unknown error'}`);
    } else {
      console.log('❌ Invalid response structure:', response.data);
      throw new Error('Invalid response from payment gateway');
    }

  } catch (error) {
    console.error('Error initializing card payment:', error);
    
    // Log OPPWA error details if available
    if (error.response) {
      console.error('🔧 OPPWA Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
};

// Process card payment with AFS
export const processCardPayment = async (req, res) => {
  try {
    const { checkoutId, cardDetails, entityId, amount, currency, paymentType } = req.body;

    if (!checkoutId || !cardDetails) {
      return res.status(400).json({
        success: false,
        message: 'Checkout ID and card details are required'
      });
    }

    // Process payment with AFS
    const paymentPayload = {
      entityId: entityId || AFS_CONFIG.entityId,
      amount: amount || '1.00',
      currency: currency || 'AED',
      paymentType: paymentType || 'DB',
      'card.number': cardDetails.cardNumber.replace(/\s/g, ''),
      'card.holder': cardDetails.cardholderName,
      'card.expiryMonth': cardDetails.expiryMonth,
      'card.expiryYear': cardDetails.expiryYear,
      'card.cvv': cardDetails.cvv
    };

    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/payments`,
      paymentPayload,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data && response.data.id) {
      const paymentId = response.data.id;
      const resultCode = response.data.result?.code;

      if (resultCode === '000.100.110' || resultCode === '000.000.000') {
        // Payment successful - save card details immediately
        try {
          console.log('✅ Payment successful, saving card details immediately...');
          
          // Extract customer ID from checkout ID or request
          const customerId = req.body.customerId || req.body.checkoutId?.split('_')[0];
          
          if (customerId && cardDetails) {
            // Save card details with full card number
            const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
            const maskedCardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
            
            // Determine card brand
            let cardBrand = 'Unknown';
            if (cardNumber.startsWith('4')) {
              cardBrand = 'VISA';
            } else if (cardNumber.startsWith('5')) {
              cardBrand = 'MASTERCARD';
            } else if (cardNumber.startsWith('3')) {
              cardBrand = 'AMEX';
            }
            
            // Check if this is the first card for the customer
            const existingCards = await SavedCard.find({ customerId: customerId, isActive: true });
            const isFirstCard = existingCards.length === 0;
            
            const newCard = new SavedCard({
              customerId: customerId,
              cardNumber: cardNumber, // Store full card number
              maskedCardNumber: maskedCardNumber, // Keep masked version for display
              cardBrand: cardBrand,
              expiryMonth: cardDetails.expiryMonth,
              expiryYear: cardDetails.expiryYear,
              cardholderName: cardDetails.cardholderName,
              isDefault: isFirstCard, // Set as default if it's the first card
              isActive: true,
              lastUsedDate: new Date(),
              cardAddedDate: new Date(),
              paymentId: paymentId,
              afs_registration_id: response.data.registrationId || paymentId
            });
            
            await newCard.save();
            console.log('✅ Card saved successfully with full details:', newCard._id);
          }
        } catch (cardSaveError) {
          console.error('❌ Error saving card details:', cardSaveError);
          // Don't fail the payment if card saving fails
        }
        
        // Payment successful
        res.status(200).json({
          success: true,
          paymentId: paymentId,
          message: 'Payment processed successfully'
        });
      } else {
        // Payment failed
        res.status(400).json({
          success: false,
          message: 'Payment failed',
          error: response.data.result?.description || 'Unknown error'
        });
      }
    } else {
      throw new Error('Invalid response from payment gateway');
    }

  } catch (error) {
    console.error('Error processing card payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};

// Refund the 1 AED charge
export const refundCardPayment = async (req, res) => {
  try {
    const { paymentId, entityId, amount, paymentType, currency } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    // Process refund with AFS
    const refundPayload = {
      entityId: entityId || AFS_CONFIG.entityId,
      amount: amount || '1.00',
      paymentType: paymentType || 'RF',
      currency: currency || 'AED'
    };

    const response = await axios.post(
      `${AFS_CONFIG.baseUrl}/v1/payments/${paymentId}`,
      refundPayload,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data && response.data.id) {
      const refundId = response.data.id;
      const resultCode = response.data.result?.code;

      if (resultCode === '000.100.110' || resultCode === '000.000.000') {
        // Refund successful
        res.status(200).json({
          success: true,
          refundId: refundId,
          message: 'Refund processed successfully'
        });
      } else {
        // Refund failed
        res.status(400).json({
          success: false,
          message: 'Refund failed',
          error: response.data.result?.description || 'Unknown error'
        });
      }
    } else {
      throw new Error('Invalid response from payment gateway');
    }

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Save card details to database
export const saveCardDetails = async (req, res) => {
  try {
    const { customerId, cardDetails, paymentId, isDefault, isActive } = req.body;

    if (!customerId || !cardDetails || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID, card details, and payment ID are required'
      });
    }

    // Check if this is the first card for the customer
    const existingCards = await SavedCard.find({ customerId: customerId, isActive: true });
    const isFirstCard = existingCards.length === 0;

    // Store full card number and create masked version for display
    const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
    const maskedCardNumber = `**** **** **** ${cardNumber.slice(-4)}`;

    // Determine card brand based on number
    let cardBrand = 'Unknown';
    if (cardNumber.startsWith('4')) {
      cardBrand = 'VISA';
    } else if (cardNumber.startsWith('5')) {
      cardBrand = 'MASTERCARD';
    } else if (cardNumber.startsWith('3')) {
      cardBrand = 'AMEX';
    }

    // Create new saved card
    const newCard = new SavedCard({
      customerId: customerId,
      cardNumber: cardNumber, // Store full card number
      maskedCardNumber: maskedCardNumber, // Keep masked version for display
      cardBrand: cardBrand,
      expiryMonth: cardDetails.expiryMonth,
      expiryYear: cardDetails.expiryYear,
      cardholderName: cardDetails.cardholderName,
      isDefault: isFirstCard || isDefault, // Set as default if it's the first card
      isActive: isActive !== false, // Default to true
      lastUsedDate: new Date(),
      cardAddedDate: new Date(),
      paymentId: paymentId // Store reference to the payment
    });

    // If this is not the first card and it's being set as default, remove default from other cards
    if (!isFirstCard && isDefault) {
      await SavedCard.updateMany(
        { customerId: customerId, isActive: true },
        { isDefault: false }
      );
    }

    await newCard.save();

    res.status(201).json({
      success: true,
      cardId: newCard._id,
      message: 'Card saved successfully',
      isDefault: newCard.isDefault
    });

  } catch (error) {
    console.error('Error saving card details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save card details',
      error: error.message
    });
  }
};

// Test AFS configuration
export const testOppwaConfig = async (req, res) => {
  try {
    console.log('🔧 Testing AFS configuration...');
    
    // Test basic connection
    const statusResponse = await axios.get(`${AFS_CONFIG.baseUrl}/v1/status`, {
      headers: {
        'Authorization': AFS_CONFIG.authorization
      }
    });
    
    console.log('🔧 AFS Status Response:', statusResponse.data);
    
    res.status(200).json({
      success: true,
      message: 'AFS configuration test successful',
      status: statusResponse.data
    });
    
  } catch (error) {
    console.error('🔧 AFS Configuration Test Failed:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      message: 'AFS configuration test failed',
      error: error.response?.data || error.message
    });
  }
};

// Handle AFS payment result and check payment status for card registration
export const handlePaymentResult = async (req, res) => {
  try {
    console.log('🔧 AddCardPaymentController: handlePaymentResult called');
    console.log('🔧 Request body:', req.body);
    console.log('🔧 Request query:', req.query);
    
    // Extract resourcePath from AFS response
    const resourcePath = req.body.resourcePath || req.query.resourcePath;
    const customerId = req.body.customerId || req.query.customerId;
    
    console.log('🔧 ResourcePath:', resourcePath);
    console.log('🔧 CustomerId:', customerId);
    
    if (!resourcePath) {
      console.log('❌ No resourcePath provided');
      return res.status(400).json({
        success: false,
        message: 'No resourcePath provided'
      });
    }
    
    // Check payment status using resourcePath (as per AFS documentation)
    const paymentStatusUrl = `${AFS_CONFIG.baseUrl}${resourcePath}`;
    console.log('🔧 Checking payment status at:', paymentStatusUrl);
    
    const statusResponse = await axios.get(paymentStatusUrl, {
      headers: {
        'Authorization': AFS_CONFIG.authorization
      },
      params: {
        entityId: AFS_CONFIG.entityId
      }
    });
    
    console.log('🔧 Payment status response:', statusResponse.data);
    
    // Check if payment was successful
    if (statusResponse.data && statusResponse.data.result && statusResponse.data.result.code) {
      const resultCode = statusResponse.data.result.code;
      console.log('🔧 Payment result code:', resultCode);
      
      if (resultCode.startsWith('000.') || resultCode.startsWith('800.')) {
        // Payment successful - card should already be saved from processCardPayment
        console.log('✅ Payment successful - card details should already be saved');
        
        // Check if card was already saved
        const existingCard = await SavedCard.findOne({ 
          customerId: customerId,
          paymentId: statusResponse.data.id 
        });
        
        if (existingCard) {
          console.log('✅ Card already saved with full details:', existingCard._id);
        } else {
          console.log('⚠️ Card not found in database - this might be an issue');
        }
        
        // Redirect to frontend with success
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/saved-card?success=true&cardId=${existingCard?._id || 'unknown'}`;
        res.redirect(redirectUrl);
        
      } else {
        // Payment failed
        console.log('❌ Payment failed with code:', resultCode);
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/saved-card/add-card?error=payment_failed&code=${resultCode}`;
        res.redirect(redirectUrl);
      }
    } else {
      // Invalid response
      console.log('❌ Invalid payment status response');
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/saved-card/add-card?error=invalid_response`;
      res.redirect(redirectUrl);
    }
    
  } catch (error) {
    console.error('❌ Error handling payment result:', error);
    
    // Redirect to frontend with error
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/saved-card/add-card?error=server_error&message=${encodeURIComponent(error.message)}`;
    res.redirect(redirectUrl);
  }
};

// Payment result callback from AFS (legacy - keeping for compatibility)
export const paymentResult = async (req, res) => {
  try {
    const { resourcePath, resultCode, resultDescription } = req.query;

    if (!resourcePath) {
      return res.status(400).json({
        success: false,
        message: 'Resource path is required'
      });
    }

    // Extract payment ID from resource path
    const paymentIdMatch = resourcePath.match(/\/payments\/([^\/]+)/);
    if (!paymentIdMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource path'
      });
    }

    const paymentId = paymentIdMatch[1];

    // Check payment status
    const response = await axios.get(
      `${AFS_CONFIG.baseUrl}/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': AFS_CONFIG.authorization
        }
      }
    );

    if (response.data && response.data.result?.code === '000.100.110') {
      // Payment successful - redirect to success page
      res.redirect(`/saved-card/add-card/success?paymentId=${paymentId}`);
    } else {
      // Payment failed - redirect to error page
      res.redirect(`/saved-card/add-card/error?paymentId=${paymentId}&error=${resultDescription}`);
    }

  } catch (error) {
    console.error('Error handling payment result:', error);
    res.redirect('/saved-card/add-card/error?error=Unknown error occurred');
  }
};
