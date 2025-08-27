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
import envConfig from './config.env.js';

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

// Payment schedule API endpoint for Angular component
app.get('/api/payment_schedule/:checkoutId', async (req, res) => {
  
  try {
    // Find payment data by checkout ID (using persistent connection)
    const paymentData = await Vzat_Recurring_Data.findOne({ 
      afs_checkout_id: req.params.checkoutId 
    });
    
    console.log('🔍 Payment data found:', paymentData);
    if (!paymentData) {
      
      const errorData = {
        error: 'Payment data not found',
        checkoutId: req.params.checkoutId
      };

      
      // Log to database
      Post_Common_DB_Log_Data('/api/payment_schedule/:checkoutId', req.params, errorData);
      
      return res.status(404).json(errorData);
    }
    
    // ⏰ CHECK PAYMENT LINK EXPIRY (7 days after creation)
    const currentDate = new Date();
    const paymentLinkExpiry = paymentData.payment_link_expiry;
    
    if (paymentLinkExpiry && currentDate > paymentLinkExpiry) {
      console.log('🚫 Payment link has expired for checkoutId:', req.params.checkoutId);
      const expiredData = {
        error: 'Payment link has expired',
        message: 'This payment link has expired. Please contact your sales representative to generate a new payment link.',
        isExpired: true,
        expiryDate: paymentLinkExpiry,
        checkoutId: req.params.checkoutId
      };
      
      // Log expired link access attempt
      Post_Common_DB_Log_Data('/api/payment_schedule/:checkoutId', req.params, expiredData);
      
      return res.status(410).json(expiredData); // 410 Gone - resource expired
    }
    
    console.log('✅ Payment data found and link is still valid:', paymentData);
    
    // Log successful response to database
    Post_Common_DB_Log_Data('/api/payment_schedule/:checkoutId', req.params, {
      success: true,
      paymentData: paymentData
    });
    
    // Return the data in the format expected by Angular component
    res.json(paymentData);
    
  } catch (error) {
  
    const errorData = {
      error: 'Failed to fetch payment schedule',
      message: error.message
    };
    
    // Log error to database
    Post_Common_DB_Log_Data('/api/payment_schedule/:checkoutId', req.params, errorData);
    
    res.status(500).json(errorData);
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
app.post('/payment-result', (req, res) => {

  
  // Extract parameters from AFS response
  const resourcePath = req.body.resourcePath || req.query.resourcePath;
  const quotepaymentId = req.body.quotepaymentId || req.query.quotepaymentId;

  
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
    message: 'AFS Payment widget form submission processed'
  });
  
  res.redirect(redirectUrl);
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
    if (value && typeof value ***REMOVED***= 'string') {
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
