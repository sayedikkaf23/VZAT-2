import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import SalesForce from "./routes/SalesForce.js";
import AdminLogin from "./routes/AdminLoginRoute.js";
import Customer from "./routes/CustomerRoute.js";
import VzatRecurring from "./routes/VzatRecurring.js";
import Subscription from "./routes/SubscriptionRoute.js";
import { getAFSPaymentResult } from "./Controllers/PostVzatRecurringData.js";
import { connectDB, disconnectDB } from "./config/db.js";
import Vzat_Recurring_Data from "./model/VzatRecurringDataModel.js";
import { initializeCronJobs } from "./config/cronJobs.js";
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// Enable JSON parsing
app.use(express.json());

// Enable form data parsing for AFS payment widget
app.use(express.urlencoded({ extended: true }));

// ✅ Global CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:4200', 'http://localhost:3000','https://vzatnew.yeepeey.com'];
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

// ✅ Define your API routes

app.use('/api/salesForce', SalesForce);
app.use('/api/adminLogin', AdminLogin);
app.use('/api/customer', Customer);
app.use('/api/vzat_recurring_create_payment_link', VzatRecurring);
app.use('/api/subscription', Subscription);

// ✅ Payment result API endpoint
app.get('/api/payment/result', (req, res) => {
  console.log('🔥 Payment result API called!');
  console.log('🔥 Query params:', req.query);
  console.log('🔥 Headers:', req.headers);
  getAFSPaymentResult(req, res);
});

// ✅ AFS Payment widget form submission endpoint
app.post('/payment-result', (req, res) => {
  console.log('💳 AFS Payment widget form submitted!');
  console.log('💳 Body:', req.body);
  console.log('💳 Query params:', req.query);
  console.log('💳 Headers:', req.headers);
  
  // Extract parameters from AFS response
  const resourcePath = req.body.resourcePath || req.query.resourcePath;
  const quotepaymentId = req.body.quotepaymentId || req.query.quotepaymentId;
  
  console.log('💳 ResourcePath:', resourcePath);
  console.log('💳 QuotepaymentId:', quotepaymentId);
  
  // Redirect to Angular payment result page with parameters
  const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?resourcePath=${encodeURIComponent(resourcePath || '')}&quotepaymentId=${encodeURIComponent(quotepaymentId || '')}`;
  console.log('💳 Redirecting to:', redirectUrl);
  
  res.redirect(redirectUrl);
});

// ✅ Alternative payment result endpoint for direct access
app.get('/payment-result', async (req, res) => {
  console.log('💰 Payment result GET endpoint called!');
  console.log('💰 Query params:', req.query);
  
  const resourcePath = req.query.resourcePath;
  const id = req.query.id;
  
  // Extract checkout ID from resourcePath to find the quotepaymentId
  let quotepaymentId = req.query.quotepaymentId || '';
  
  if (!quotepaymentId && id) {
    // Try to find quotepaymentId from the database using the checkout ID
    try {
      await connectDB();
      const paymentRecord = await Vzat_Recurring_Data.findOne({ 
        afs_checkout_id: id
      });
      if (paymentRecord) {
        quotepaymentId = paymentRecord.quotepaymentId;
        console.log('💰 Found payment record for checkout ID:', id, 'quotepaymentId:', quotepaymentId);
      } else {
        console.log('💰 No payment record found for checkout ID:', id);
      }
      await disconnectDB();
    } catch (err) {
      console.log('Error finding quotepaymentId:', err);
    }
  }
  
  console.log('💰 Found quotepaymentId:', quotepaymentId);
  
  // Redirect to Angular payment result page with parameters
  const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?resourcePath=${encodeURIComponent(resourcePath || '')}&quotepaymentId=${encodeURIComponent(quotepaymentId || '')}&id=${encodeURIComponent(id || '')}`;
  console.log('💰 Redirecting to:', redirectUrl);
  
  res.redirect(redirectUrl);
});

// ✅ Test endpoint to generate new payment link
app.post('/test-payment-link', (req, res) => {
  console.log('🧪 Test payment link generation requested');
  
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
  
  // Forward to the main payment creation endpoint
  req.body = testData;
  
  // Import the controller function
  import('./Controllers/PostVzatRecurringData.js').then(module => {
    module.default(req, res);
  }).catch(err => {
    console.error('Error importing controller:', err);
    res.status(500).json({ error: 'Failed to process payment link' });
  });
});

// ✅ Test endpoint for subscription
app.post('/test-subscription-link', (req, res) => {
  console.log('🧪 Test subscription link generation requested');
  
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
  
  // Forward to the main payment creation endpoint
  req.body = testData;
  
  // Import the controller function
  import('./Controllers/PostVzatRecurringData.js').then(module => {
    module.default(req, res);
  }).catch(err => {
    console.error('Error importing controller:', err);
    res.status(500).json({ error: 'Failed to process subscription link' });
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));

// SPA catch-all (must be last)
app.get('*', (req, res) => {
  console.log('🌐 SPA catch-all route hit for:', req.url);
  console.log('🌐 Query params:', req.query);
  res.sendFile(path.resolve(__dirname, '../frontend/dist/frontend/browser/index.html'), function (err) {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// Start the server
app.listen(3000, () => {
  console.log("server is running on port 3000");
  
  // Initialize cron jobs for subscription management
  try {
    initializeCronJobs();
    console.log("✅ Subscription cron jobs initialized");
  } catch (error) {
    console.error("❌ Failed to initialize cron jobs:", error);
  }
});
