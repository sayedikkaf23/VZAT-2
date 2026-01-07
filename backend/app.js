import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import SalesForce from "./routes/SalesForce.js";
import AdminLogin from "./routes/AdminLoginRoute.js";
import Customer from "./routes/CustomerRoute.js";
import VzatRecurring from "./routes/VzatRecurring.js";
import Subscription from "./routes/SubscriptionRoute.js";
import SubscriptionCard from "./routes/SubscriptionCardRoute.js";
import SalesforceRoute from "./routes/SalesforceRoute.js";
import SalesforceLogsRoute from "./routes/SalesforceLogsRoute.js";
import SavedCardRoute from "./routes/SavedCardRoute.js";
import AddCardRoute from "./routes/AddCardRoute.js";
import ActiveServicesRoute from "./routes/ActiveServicesRoute.js";
import TestPaymentRoute from "./routes/TestPaymentRoute.js";
import TestPaymentUpdate from "./routes/TestPaymentUpdate.js";
import DebugRoute from "./routes/DebugRoute.js";
import WebhookDebugRoute from "./routes/WebhookDebugRoute.js";
import RetryPaymentRoute from "./routes/RetryPaymentRoute.js";
import UserRoute from "./routes/UserRoute.js";

import { getAFSPaymentResult } from "./Controllers/PostVzatRecurringData.js";
import { connectDB, disconnectDB } from "./config/db.js";
import Vzat_Recurring_Data from "./model/VzatRecurringDataModel.js";
import { initializeCronJobs } from "./config/cronJobs.js";
import Post_Common_DB_Log_Data from "./Controllers/PostCommonDBLogData.js";
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();
// Load environment configuration
// import envConfig from './config.env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// Enable JSON parsing
app.use(express.json());

// Enable form data parsing for AFS payment widget
app.use(express.urlencoded({ extended: true }));

// Global CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:4200', 'http://localhost:3000','https://vzatnew.yeepeey.com', 'https://p11.techlab-cdn.com'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
}));

// Define your API routes

app.use('/api/salesForce', SalesForce);
app.use('/api/adminLogin', AdminLogin);
app.use('/api/customer', Customer);
app.use('/api/vzat_recurring_create_payment_link', VzatRecurring);
app.use('/api/subscription', Subscription);
app.use('/api/subscription-card', SubscriptionCard);
app.use('/api/salesforce', SalesforceRoute);
app.use('/api/salesforce-logs', SalesforceLogsRoute);
app.use('/api/saved-cards', SavedCardRoute);
app.use('/api/cards', AddCardRoute);
app.use('/api/debug-cards', DebugRoute);
app.use('/api/customer', ActiveServicesRoute);
app.use('/api/test-payment', TestPaymentRoute);
app.use('/api/test-payment-update', TestPaymentUpdate);
app.use('/api/debug', WebhookDebugRoute);
app.use('/api/retry-payment', RetryPaymentRoute);
app.use('/api/user', UserRoute);
// Payment schedule API endpoint for Angular component
// Updated to use quotepaymentId instead of temporary checkout ID
app.get('/api/payment_schedule/:quotepaymentId', async (req, res) => {
  
  try {
    // Find payment data by quotepaymentId (persistent identifier)
    const paymentData = await Vzat_Recurring_Data.findOne({ 
      quotepaymentId: req.params.quotepaymentId 
    });
    
    console.log('🔍 Payment data lookup by quotepaymentId:', req.params.quotepaymentId);
    
    if (!paymentData) {
      const errorData = {
        error: 'Payment data not found',
        quotepaymentId: req.params.quotepaymentId
      };
      
      Post_Common_DB_Log_Data('/api/payment_schedule/:quotepaymentId', req.params, errorData);
      return res.status(404).json(errorData);
    }
    
    // No expiry check - payment links using quotepaymentId never expire
    // Checkout IDs are generated on-demand when user initiates payment
    
    console.log('✅ Payment data found:', paymentData);
    
    // Get Salesforce OAuth token and fetch compliance_clear and prepayment_screening
    let compliance_clear, prepayment_screening;
    const quoteId = paymentData.quotepaymentId;
    
    console.log('🔍 Checking for quoteId to call Salesforce API:', { quoteId, quotepaymentId: req.params.quotepaymentId });
    
    if (quoteId) {
      console.log('📞 Starting Salesforce API call process...');
      try {
        // Dynamically import axios
        const axios = (await import('axios')).default;
        
        // Step 1: Get Salesforce OAuth token
        console.log('🔐 Step 1: Requesting Salesforce OAuth token...');
        const TokenResponse = await axios.post(
          `https://test.salesforce.com/services/oauth2/token`,
          null,
          {
            params: {
              client_id: process.env.SALESFORCE_CLIENT_ID,
              client_secret: process.env.SALESFORCE_CLIENT_SECRET,
              grant_type: "password",
              username: process.env.SALESFORCE_USERNAME,
              password: process.env.SALESFORCE_PASSWORD,
            },
          }
        );
        
        const accessToken = TokenResponse.data.access_token;
        const saleforcUrl = TokenResponse.data.instance_url;
        
        console.log('✅ Step 1: Salesforce OAuth token received successfully', {
          hasAccessToken: !!accessToken,
          instanceUrl: saleforcUrl
        });
        
        // Step 2: Call Salesforce API to get AR Clearance data
        console.log('📡 Step 2: Calling Salesforce getARClearnce API...', {
          url: `${saleforcUrl}/services/apexrest/getARClearnce`,
          paymentId: quoteId
        });
        
        const config = {
          method: 'get',
          url: `${saleforcUrl}/services/apexrest/getARClearnce`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          data: {
            paymentId: quoteId
          }
        };
        
        const salesforceResponse = await axios.request(config);
        
        console.log('✅ Step 2: Salesforce API response received', {
          status: salesforceResponse.status,
          statusText: salesforceResponse.statusText,
          hasData: !!salesforceResponse.data,
          responseData: salesforceResponse.data
        });
        
        // Extract compliance_clear and prepayment_screening from Salesforce response
        // Handle different field name variations from Salesforce API
        if (salesforceResponse.data) {
          // Check for compliance_clear or compliance_cleared (Salesforce returns compliance_cleared)
          compliance_clear = salesforceResponse.data.compliance_clear !== undefined 
            ? salesforceResponse.data.compliance_clear 
            : salesforceResponse.data.compliance_cleared;
          
          // Check for prepayment_screening or Prepayment_screening (Salesforce returns Prepayment_screening with capital P)
          prepayment_screening = salesforceResponse.data.prepayment_screening !== undefined
            ? salesforceResponse.data.prepayment_screening
            : salesforceResponse.data.Prepayment_screening;
          
          console.log('✅ Salesforce AR Clearance data extracted:', {
            compliance_clear,
            prepayment_screening,
            compliance_clearType: typeof compliance_clear,
            prepayment_screeningType: typeof prepayment_screening,
            rawResponseKeys: Object.keys(salesforceResponse.data)
          });
          
          // Update the database with the new values from Salesforce
          if (compliance_clear !== undefined || prepayment_screening !== undefined) {
            const updateData = {};
            if (compliance_clear !== undefined) {
              updateData.compliance_clear = compliance_clear;
            }
            if (prepayment_screening !== undefined) {
              updateData.prepayment_screening = prepayment_screening;
            }
            
            console.log('💾 Updating database with Salesforce data...', {
              updateData,
              quotepaymentId: req.params.quotepaymentId
            });
            
            await Vzat_Recurring_Data.updateOne(
              { quotepaymentId: req.params.quotepaymentId },
              { $set: updateData }
            );
            
            console.log('✅ Database updated successfully with compliance_clear and prepayment_screening');
            
            // Update the paymentData object with new values
            paymentData.compliance_clear = compliance_clear !== undefined ? compliance_clear : paymentData.compliance_clear;
            paymentData.prepayment_screening = prepayment_screening !== undefined ? prepayment_screening : paymentData.prepayment_screening;
            
            console.log('✅ PaymentData object updated:', {
              compliance_clear: paymentData.compliance_clear,
              prepayment_screening: paymentData.prepayment_screening
            });
          } else {
            console.log('⚠️ No compliance_clear or prepayment_screening values found in Salesforce response');
          }
        } else {
          console.log('⚠️ Salesforce response data is empty or null');
        }
      } catch (salesforceError) {
        console.error('❌ Error calling Salesforce API:', {
          message: salesforceError.message,
          status: salesforceError.response?.status,
          statusText: salesforceError.response?.statusText,
          data: salesforceError.response?.data,
          stack: salesforceError.stack
        });
        // Continue without Salesforce data - don't fail the request
      }
    } else {
      console.log('⚠️ No quoteId found, skipping Salesforce API call');
    }
    
    // Add compliance_clear and prepayment_screening to paymentData
    console.log('📦 Building final responseData...', {
      hasComplianceClear: paymentData.compliance_clear !== undefined,
      hasPrepaymentScreening: paymentData.prepayment_screening !== undefined,
      compliance_clear: paymentData.compliance_clear,
      prepayment_screening: paymentData.prepayment_screening
    });
    
    const responseData = {
      ...paymentData.toObject ? paymentData.toObject() : paymentData,
      compliance_clear: paymentData.compliance_clear !== undefined ? paymentData.compliance_clear : false,
      prepayment_screening: paymentData.prepayment_screening !== undefined ? paymentData.prepayment_screening : false
    };
    
    console.log('✅ Final responseData prepared:', {
      compliance_clear: responseData.compliance_clear,
      prepayment_screening: responseData.prepayment_screening,
      quotepaymentId: responseData.quotepaymentId
    });
    
    // Log successful response to database
    Post_Common_DB_Log_Data('/api/payment_schedule/:quotepaymentId', req.params, {
      success: true,
      paymentData: responseData
    });
    
    // Return the data in the format expected by Angular component
    res.json(responseData);
    
  } catch (error) {
  
    const errorData = {
      error: 'Failed to fetch payment schedule',
      message: error.message
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/payment_schedule/:quotepaymentId', req.params, errorData);
    
    res.status(500).json(errorData);
  }
});

// Generate fresh AFS checkout ID on demand
// This endpoint creates a new checkout ID each time it's called
// Prevents the 30-minute expiration issue
app.post('/api/generate_checkout/:quotepaymentId', async (req, res) => {
  await connectDB();
  
  try {
    console.log('\ud83d\udd04 Generating fresh checkout ID for:', req.params.quotepaymentId);
    
    // Find payment data by quotepaymentId
    const paymentData = await Vzat_Recurring_Data.findOne({ 
      quotepaymentId: req.params.quotepaymentId 
    });
    
    if (!paymentData) {
      const errorData = {
        error: 'Payment data not found',
        quotepaymentId: req.params.quotepaymentId
      };
      Post_Common_DB_Log_Data('/api/generate_checkout/:quotepaymentId', req.params, errorData);
      return res.status(404).json(errorData);
    }
    
    // Determine if this is a subscription
    const isSubscription = paymentData.InstallmentType === 'Installments' && paymentData.InstallmentLeft > 1;
    
    // Calculate installment amount
    const installmentAmount = paymentData.Total_After_VAT_Currency / paymentData.InstallmentLeft;
    
    // Prepare AFS checkout request
    const axios = (await import('axios')).default;
    const afsUrl = `${process.env.AFS_DOMAIN}/v1/checkouts`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;
    const backendUrl = process.env.BACKEND_URL;
    
    const shopperResultUrl = `${backendUrl}/payment-result`;
    
    const afsData = new URLSearchParams();
    afsData.append('entityId', entityId);
    afsData.append('amount', installmentAmount.toFixed(2));
    afsData.append('currency', 'AED');
    afsData.append('merchantTransactionId', paymentData.quotepaymentId);
    afsData.append('shopperResultUrl', shopperResultUrl);
    
    // Add webhook notification URL
    const notificationUrl = `${backendUrl}/api/subscription/webhook/afs`;
    afsData.append('notificationUrl', notificationUrl);
    
    if (isSubscription) {
      afsData.append('paymentType', 'DB');
      afsData.append('createRegistration', 'true');
      afsData.append('recurringType', 'INITIAL');
      
      // Calculate next charge date
      const createdDate = new Date(paymentData.CreatedDate);
      const nextInstallmentDate = new Date(createdDate);
      nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);
      const nextChargeDate = nextInstallmentDate.toISOString().slice(0, 10);
      
      afsData.append('merchantMemo', `Subscription:${paymentData.quotepaymentId}:${paymentData.InstallmentLeft}:${nextChargeDate}`);
    } else {
      afsData.append('paymentType', 'DB');
    }
    
    const afsHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    
    console.log('\ud83d\udce1 Calling AFS to generate checkout ID...');
    const afsResponse = await axios.post(afsUrl, afsData, { headers: afsHeaders });
    
    if (afsResponse.data && afsResponse.data.id) {
      const checkoutId = afsResponse.data.id;
      // Widget URL should only have checkoutId, NOT entityId (AFS rejects entityId in script URL)
      // EntityId is used during checkout creation and in the HTML form data-entity-id attribute
      const paymentWidgetUrl = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
      
      console.log('✅ Fresh checkout ID generated:', checkoutId);
      console.log('🔗 Widget URL:', paymentWidgetUrl);
      
      // Update the database with the latest checkout ID (for reference only)
      await Vzat_Recurring_Data.findOneAndUpdate(
        { quotepaymentId: req.params.quotepaymentId },
        { 
          afs_checkout_id: checkoutId,
          last_checkout_generated: new Date()
        },
        { new: true }
      );
      
      const responseData = {
        status: true,
        message: 'Fresh checkout ID generated successfully',
        checkout_id: checkoutId,
        payment_widget_url: paymentWidgetUrl,
        entity_id: entityId, // Include for frontend to use in form data-entity-id attribute
        amount: installmentAmount,
        currency: 'AED',
        quotepaymentId: paymentData.quotepaymentId,
        is_subscription: isSubscription
      };
      
      Post_Common_DB_Log_Data('/api/generate_checkout/:quotepaymentId', req.params, responseData);
      return res.status(200).json(responseData);
      
    } else {
      throw new Error('Failed to get checkout ID from AFS');
    }
    
  } catch (error) {
    console.error('\u274c Error generating checkout ID:', error.message);
    
    const errorData = {
      error: 'Failed to generate checkout ID',
      message: error.message,
      details: error.response?.data || null
    };
    
    Post_Common_DB_Log_Data('/api/generate_checkout/:quotepaymentId', req.params, errorData);
    return res.status(500).json(errorData);
  }
});

// Payment result API endpoint
app.get('/api/payment/result', (req, res) => {
  
  // Log the request to database
  Post_Common_DB_Log_Data('/api/payment/result', req.query, {
    message: 'Payment result API called',
    headers: req.headers
  });
  
  getAFSPaymentResult(req, res);
});

// AFS Payment widget form submission endpoint
app.post('/payment-result', async (req, res) => {
  await connectDB();
  
  try {
    // Extract parameters from AFS response
    const resourcePath = req.body.resourcePath || req.query.resourcePath;
    const quotepaymentId = req.body.quotepaymentId || req.query.quotepaymentId;
    
    console.log('🔧 Payment widget form submission received:');
    console.log('   - Resource Path:', resourcePath);
    console.log('   - Quote Payment ID:', quotepaymentId);
    console.log('   - Request Body:', JSON.stringify(req.body, null, 2));
    
    // 🆕 ENHANCED CARD DETAILS CAPTURE FROM PAYMENT WIDGET SUBMISSION
    // Check if this is a subscription payment and capture card details
    if (quotepaymentId) {
      try {
        console.log('💳 Processing payment for quotepaymentId:', quotepaymentId);
        
        // Import required modules
        const { saveCustomerCard } = await import('./Controllers/CustomerRegistration.js');
        const Vzat_Recurring_Data = (await import('./model/VzatRecurringDataModel.js')).default;
        
        // Find the subscription record
        const subscriptionRecord = await Vzat_Recurring_Data.findOne({ quotepaymentId });
        
        if (subscriptionRecord) {
          console.log('✅ Subscription record found, attempting to save card details...');
          
          // Check for card details in multiple possible locations
          let cardDetails = req.body.cardDetails || req.body.card || req.body.paymentMethod;
          
          // If no card details in body, try to extract from AFS response
          if (!cardDetails && resourcePath) {
            try {
              console.log('🔍 Attempting to fetch card details from AFS...');
              const axios = (await import('axios')).default;
              const AFS_CONFIG = {
                baseUrl: process.env.AFS_DOMAIN,
                entityId: process.env.AFS_ENTITY_ID,
                authorization: `Bearer ${process.env.AFS_ACCESS_TOKEN}`
              };
              
              const statusResponse = await axios.get(
                `${AFS_CONFIG.baseUrl}${resourcePath}`,
                {
                  headers: {
                    'Authorization': AFS_CONFIG.authorization
                  },
                  params: {
                    entityId: AFS_CONFIG.entityId
                  }
                }
              );
              
              console.log('🔍 AFS status response:', JSON.stringify(statusResponse.data, null, 2));
              
              // Extract card details from AFS response
              if (statusResponse.data && statusResponse.data.card) {
                cardDetails = {
                  cardNumber: statusResponse.data.card.number || statusResponse.data.card.maskedPan,
                  maskedCardNumber: statusResponse.data.card.maskedPan || `****-****-****-${statusResponse.data.card.last4 || '****'}`,
                  cardBrand: statusResponse.data.card.brand || statusResponse.data.card.paymentBrand,
                  expiryMonth: statusResponse.data.card.expiryMonth,
                  expiryYear: statusResponse.data.card.expiryYear,
                  cardholderName: statusResponse.data.card.holder || 'Not provided',
                  registrationId: statusResponse.data.registrationId || statusResponse.data.id
                };
                console.log('✅ Card details extracted from AFS response');
              }
            } catch (afsError) {
              console.error('❌ Error fetching card details from AFS:', afsError.message);
            }
          }
          
          if (cardDetails) {
            console.log('💳 Card details found:', JSON.stringify(cardDetails, null, 2));
            
            // Prepare payment data with card details
            const paymentData = {
              ...subscriptionRecord.toObject(),
              cardDetails: cardDetails,
              afs_registration_id: cardDetails.registrationId || req.body.registrationId || quotepaymentId,
              afs_checkout_id: req.body.checkoutId || quotepaymentId,
              result: {
                card: cardDetails,
                registrationId: cardDetails.registrationId || req.body.registrationId,
                id: req.body.id || quotepaymentId
              }
            };
            
            // Save the card with details
            const cardSaveResult = await saveCustomerCard(paymentData);
            
            if (cardSaveResult.success) {
              console.log('✅ Card saved successfully with details:', cardSaveResult.cardId);
            } else {
              console.log('⚠️ Card saving failed:', cardSaveResult.message);
            }
          } else {
            console.log('⚠️ No card details found in payment submission or AFS response');
            console.log('⚠️ This may indicate the payment widget is not sending card details properly');
          }
        } else {
          console.log('⚠️ Subscription record not found for quotepaymentId:', quotepaymentId);
        }
      } catch (cardSaveError) {
        console.error('❌ Error processing card details from payment widget:', cardSaveError);
        console.error('❌ Error stack:', cardSaveError.stack);
        // Don't fail the payment if card saving fails
      }
    }
    
    // Redirect to Angular payment result page with parameters
    const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?resourcePath=${encodeURIComponent(resourcePath || '')}&quotepaymentId=${encodeURIComponent(quotepaymentId || '')}`;
    
    // Log to database
    Post_Common_DB_Log_Data('/payment-result', {
      body: req.body,
      query: req.query
    }, {
      resourcePath: resourcePath,
      quotepaymentId: quotepaymentId,
      redirectUrl: redirectUrl,
      message: 'AFS Payment widget form submission processed',
      cardDetailsCaptured: !!(quotepaymentId && req.body.cardDetails)
    });
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error processing payment widget submission:', error);
    
    // Still redirect even if there's an error
    const resourcePath = req.body.resourcePath || req.query.resourcePath;
    const quotepaymentId = req.body.quotepaymentId || req.query.quotepaymentId;
    const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?resourcePath=${encodeURIComponent(resourcePath || '')}&quotepaymentId=${encodeURIComponent(quotepaymentId || '')}`;
    
    res.redirect(redirectUrl);
  }
});

// Alternative payment result endpoint for direct access
app.get('/payment-result', async (req, res) => {
  
  const resourcePath = req.query.resourcePath;
  const id = req.query.id;
  
  // Extract checkout ID from resourcePath to find the quotepaymentId
  let quotepaymentId = req.query.quotepaymentId || '';
  
  if (!quotepaymentId && id) {
    // Try to find quotepaymentId from the database using the checkout ID (using persistent connection)
    try {
      const paymentRecord = await Vzat_Recurring_Data.findOne({ 
        afs_checkout_id: id
      });
      if (paymentRecord) {
        quotepaymentId = paymentRecord.quotepaymentId;
      } else {
        console.log('💰 No payment record found for checkout ID:', id);
      }
    } catch (err) {
      
      // Log error to database
      Post_Common_DB_Log_Data('/payment-result', req.query, {
        error: 'Error finding quotepaymentId',
        message: err.message
      });
    }
  }
  
  
  // Redirect to Angular payment result page with parameters
  const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?resourcePath=${encodeURIComponent(resourcePath || '')}&quotepaymentId=${encodeURIComponent(quotepaymentId || '')}&id=${encodeURIComponent(id || '')}`;
  
  // Log to database
  Post_Common_DB_Log_Data('/payment-result', req.query, {
    quotepaymentId: quotepaymentId,
    redirectUrl: redirectUrl,
    message: 'Payment result GET endpoint processed'
  });
  
  res.redirect(redirectUrl);
});

// AFS Card Registration widget form submission endpoint
app.post('/card-registration-result', (req, res) => {
  
  // Extract parameters from AFS response
  const resourcePath = req.body.resourcePath || req.query.resourcePath;
  
  
  // Redirect to Angular add-card page with resourcePath parameter
  const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/saved-card/add-card?resourcePath=${encodeURIComponent(resourcePath || '')}`;
  
  // Log to database
  Post_Common_DB_Log_Data('/card-registration-result', {
    body: req.body,
    query: req.query
  }, {
    resourcePath: resourcePath,
    redirectUrl: redirectUrl,
    message: 'AFS Card Registration widget form submission processed'
  });
  
  res.redirect(redirectUrl);
});

// Debug endpoint to capture AFS payment data
app.post('/debug/payment-data', (req, res) => {
  
  // Look for potential card numbers in the data
  const allData = { ...req.body, ...req.query };
  const cardFields = {};
  
  for (const [key, value] of Object.entries(allData)) {
    if (value && typeof value === 'string') {
      const cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length >= 13 && cleanValue.length <= 19) {
        cardFields[key] = value;
        cardFields[`${key}_LAST4`] = cleanValue.slice(-4);
      }
    }
  }
  
  res.json({
    message: 'Debug data captured',
    receivedFields: Object.keys(allData),
    cardFields: cardFields,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to generate new payment link
app.post('/test-payment-link', (req, res) => {
  
  const testData = {
    OpportunityId: "test-opp-123",
    quotepaymentId: "test-quote-" + Date.now(),
    QuoteId: "test-quote-123",
    CreatedDate: "2025-01-18",
    Status: "Active",
    TotalPrice: 100,
    Total_After_VAT_Currency: 105,
    InstallmentType: "OneTime",
    Product_details: [{
      QuoteLineItemId: "test-item-123",
      TotalPrice: 100,
      Total_Price_After_VAT: 105
    }]
  };
  
  // Log test request to database
  Post_Common_DB_Log_Data('/test-payment-link', req.body, {
    testData: testData,
    message: 'Test payment link generation requested'
  });
  
  // Forward to the main payment creation endpoint
  req.body = testData;
  
  // Import the controller function
  import('./Controllers/PostVzatRecurringData.js').then(module => {
    module.default(req, res);
  }).catch(err => {
    console.error('Error importing controller:', err);
    
    const errorData = { error: 'Failed to process payment link' };
    
    // Log error to database
    Post_Common_DB_Log_Data('/test-payment-link', req.body, {
      error: errorData,
      message: err.message
    });
    
    res.status(500).json(errorData);
  });
});

// Test endpoint for subscription
app.post('/test-subscription-link', (req, res) => {
  
  const testData = {
    OpportunityId: "test-sub-opp-123",
    quotepaymentId: "test-sub-quote-" + Date.now(),
    QuoteId: "test-sub-quote-123",
    CreatedDate: "2025-07-21",
    Status: "Active",
    TotalPrice: 1200,
    Total_After_VAT_Currency: 1200,
    InstallmentType: "Installments", // This will trigger subscription
    Product_details: [{
      QuoteLineItemId: "test-sub-item-123",
      TotalPrice: 1200,
      Total_Price_After_VAT: 1200
    }]
  };
  
  // Log test request to database
  Post_Common_DB_Log_Data('/test-subscription-link', req.body, {
    testData: testData,
    message: 'Test subscription link generation requested'
  });
  
  // Forward to the main payment creation endpoint
  req.body = testData;
  
  // Import the controller function
  import('./Controllers/PostVzatRecurringData.js').then(module => {
    module.default(req, res);
  }).catch(err => {
    console.error('Error importing controller:', err);
    
    const errorData = { error: 'Failed to process subscription link' };
    
    // Log error to database
    Post_Common_DB_Log_Data('/test-subscription-link', req.body, {
      error: errorData,
      message: err.message
    });
    
    res.status(500).json(errorData);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));

// SPA catch-all (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist/frontend/browser/index.html'), function (err) {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// Start the server and establish database connection
const startServer = async () => {
  try {
    // Establish persistent database connection
    await connectDB();
    
    // Start the server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      
      // Initialize cron jobs for subscription management
      try {
        initializeCronJobs();
        console.log("Subscription cron jobs initialized");
      } catch (error) {
        console.error("Failed to initialize cron jobs:", error);
      }
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();
