import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import { createCustomerAccount, saveCustomerCard } from "./CustomerRegistration.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const Post_Vzat_Recurring_Data = async (req, res) => {
  await connectDB();

  try {
    if (!req.body || Object.keys(req.body).length ***REMOVED***= 0) {
      const data = { message: "Body is empty" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", {}, data);
      return res.status(400).json(data);
    }

    const {
      OpportunityId,
      quotepaymentId,
      QuoteId,
      CreatedDate,
      Status,
      TotalPrice,
      Total_After_VAT_Currency,
      InstallmentType,
      Product_details,
      quote_payment_number,
      Customer_name,
      opp_owner,
      opp_email,
      opp_number,
      opp_title,
      opp_phone,
      opp_mobile,
      salesPersonDetails : salesPersonDetails
      
    } = req.body;

    // Validate required fields
    if (
      !OpportunityId || !quotepaymentId || !QuoteId || !CreatedDate || !Status ||
      TotalPrice ***REMOVED***= null || TotalPrice ***REMOVED***= undefined || TotalPrice ***REMOVED***= 0 ||
      Total_After_VAT_Currency ***REMOVED***= null || Total_After_VAT_Currency ***REMOVED***= undefined || Total_After_VAT_Currency ***REMOVED***= 0 ||
      !Array.isArray(Product_details) || Product_details.length ***REMOVED***= 0
    ) {
      const data = { message: "Missing or invalid required fields" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
    }

    // Check if quotepaymentId already exists in the database
    const existingRecord = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (existingRecord) {
      
      // Generate payment page URL for existing record
      let existingPaymentPageUrl = null;
      let existingPaymentLink = null;
      
      if (existingRecord.afs_checkout_id) {
        existingPaymentPageUrl = `${process.env.FRONTEND_URL}/payment/${encodeURIComponent(existingRecord.afs_checkout_id)}`;
        existingPaymentLink = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${existingRecord.afs_checkout_id}`;
      }

      const data = {
        status: false,
        message: "Payment link already exists for this quotepaymentId",
        error: "DUPLICATE_QUOTE_PAYMENT_ID",
        quotepaymentId,
        existing_record: {
          id: existingRecord._id,
          created_date: existingRecord.CreatedDate,
          status: existingRecord.Status,
          total_amount: existingRecord.Total_After_VAT_Currency,
          installment_type: existingRecord.InstallmentType,
          afs_checkout_id: existingRecord.afs_checkout_id,
          payment_page_url: existingPaymentPageUrl,
          payment_widget_link: existingPaymentLink
        },
        suggestion: "Use the existing payment link or provide a different quotepaymentId"
      };
      
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(409).json(data); // 409 Conflict status code
    }
    
    // Validate CreatedDate format
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof CreatedDate !***REMOVED*** 'string' || !regEx.test(CreatedDate)) {
      const data = { message: "Date should be in yyyy-mm-dd format" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
    }

    const dateObj = new Date(CreatedDate);
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !***REMOVED*** CreatedDate) {
      const data = { message: "Invalid date" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
    }

    // Installment logic
    const finalInstallmentType = InstallmentType || "Installments";
    const createdDateObj = new Date(CreatedDate);
    const year = createdDateObj.getFullYear();
    const month = createdDateObj.getMonth(); // 0-based: Jan=0 ... Dec=11
    const day = createdDateObj.getDate();

    let InstallmentLeft = 1; // fallback default
    let firstPaymentDueDate = new Date(createdDateObj); // First payment due on CreatedDate itself
    let nextInstallmentDate = null;
    let installmentAmount = parseFloat(Total_After_VAT_Currency);
    let paymentLinkExpiryDate = new Date(createdDateObj);
    paymentLinkExpiryDate.setDate(paymentLinkExpiryDate.getDate() + 7); // Payment link expires 7 days after creation
    
    if (finalInstallmentType ***REMOVED***= "Installments") {
      const currentDate = new Date();

      // Calculate installments left based on CreatedDate month (including current month)
      if (year <= currentDate.getFullYear()) {
        InstallmentLeft = 12 - month;
      } else {
        InstallmentLeft = 12;
      }
      if (InstallmentLeft <= 0) InstallmentLeft = 1;

      // Add 0 days to CreatedDate for first payment (payment due on creation date itself)
      firstPaymentDueDate = new Date(createdDateObj.getTime());

      // Next installment due date logic
      let chargeDay = day <= 15 ? 10 : 25;
      let chargeMonth = month + 1;
      let chargeYear = year;
      if (chargeMonth > 11) {
        chargeMonth = 0;
        chargeYear += 1;
      }
      // Always set to 10th or 25th of next month
      // Use UTC to avoid timezone issues
      nextInstallmentDate = new Date(Date.UTC(chargeYear, chargeMonth, chargeDay, 0, 0, 0, 0));

      installmentAmount = parseFloat((Total_After_VAT_Currency / InstallmentLeft).toFixed(2));
    }

    // Save to DB
    const baseData = new Vzat_Recurring_Data({
      OpportunityId,
      quotepaymentId,
      QuoteId,
      CreatedDate,
      Status,
      InstallmentType: finalInstallmentType,
      TotalPrice,
      Total_After_VAT_Currency,
      Product_details: [],
      quote_payment_number,
      Customer_name,
      opp_owner,
      opp_email,
      opp_number,
      opp_title,
      opp_phone,
      opp_mobile,
      salesPersonDetails,
      payment_link_expiry: paymentLinkExpiryDate
    });

    const result = await baseData.save();
    // Generate payment schedule array for installments
    let paymentSchedule = [];
    if (finalInstallmentType ***REMOVED***= "Installments" && InstallmentLeft > 0) {      
      // Helper function to calculate payment day based on business rule
      const getPaymentDay = (date) => {
        const day = date.getDate();
        return day <= 15 ? 10 : 25; // 1st-15th: 10th, 16th-31st: 25th
      };
      
      for (let i = 0; i < InstallmentLeft; i++) {
        let dueDate;
        
        if (i ***REMOVED***= 0) {
          // FIRST payment: ALWAYS use the CreatedDate itself (not modified)
          dueDate = new Date(createdDateObj.getTime()); // Use exact CreatedDate
        } else {
          // Subsequent payments: 10th or 25th of each month based on original creation date
          const paymentDay = getPaymentDay(createdDateObj);
          const targetMonth = createdDateObj.getMonth() + i; // No +1 since first payment is CreatedDate month
          const targetYear = createdDateObj.getFullYear() + Math.floor(targetMonth / 12);
          const adjustedMonth = targetMonth % 12;
          
          dueDate = new Date(targetYear, adjustedMonth, paymentDay);
        }
        
        // Format date as YYYY-MM-DD
        const formattedDueDate = dueDate.toISOString().slice(0, 10);
        
        paymentSchedule.push({
          installment_number: i + 1,
          due_date: formattedDueDate,
          amount: installmentAmount,
          status: i ***REMOVED***= 0 ? 'due' : 'pending'
        });
      }
            
      // Update the record with payment schedule
      await Vzat_Recurring_Data.findByIdAndUpdate(
        result._id,
        { payment_schedule: paymentSchedule },
        { new: true }
      );
    }

    // Insert product details
    for (const product of Product_details) {
      if (
        !product.QuoteLineItemId ||
        product.TotalPrice ***REMOVED***= null || product.TotalPrice ***REMOVED***= undefined || product.TotalPrice ***REMOVED***= 0 ||
        product.Total_Price_After_VAT ***REMOVED***= null || product.Total_Price_After_VAT ***REMOVED***= undefined || product.Total_Price_After_VAT ***REMOVED***= 0
      ) {
        await Vzat_Recurring_Data.findByIdAndDelete(result._id);
        const data = { message: "One or more product details are missing or invalid" };
        Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
        return res.status(400).json(data);
      }

      await Vzat_Recurring_Data.findByIdAndUpdate(
        result._id,
        { $push: { Product_details: product } },
        { new: true, runValidators: true }
      );
    }

    // Generate AFS payment link or subscription
    let paymentLink = null;
    let afsError = null;
    let afsResponse = null;
    let isSubscription = finalInstallmentType ***REMOVED***= "Installments" && InstallmentLeft > 1;
    
    try {
      const afsUrl = `${process.env.AFS_DOMAIN}/v1/checkouts`;
      const entityId = process.env.AFS_ENTITY_ID;
      const accessToken = process.env.AFS_ACCESS_TOKEN;
      const backendUrl = process.env.BACKEND_URL;
      const frontendUrl = process.env.FRONTEND_URL;
     
      // Use backend URL for shopperResultUrl since that's where the payment-result endpoint is
      const shopperResultUrl = `${backendUrl}/payment-result`;
    
      
      // Debug: Check if environment variables are loaded
      if (!process.env.AFS_DOMAIN || !process.env.AFS_ENTITY_ID || !process.env.AFS_ACCESS_TOKEN) {
        throw new Error(`Missing AFS environment variables: AFS_DOMAIN=${!!process.env.AFS_DOMAIN}, AFS_ENTITY_ID=${!!process.env.AFS_ENTITY_ID}, AFS_ACCESS_TOKEN=${!!process.env.AFS_ACCESS_TOKEN}`);
      }
      
      const afsData = new URLSearchParams();
      afsData.append('entityId', entityId);
      afsData.append('amount', installmentAmount.toFixed(2)); // Ensure 2 decimal places
      afsData.append('currency', 'AED');
      afsData.append('merchantTransactionId', quotepaymentId);
      afsData.append('shopperResultUrl', shopperResultUrl);
      
      // Add webhook notification URL for automatic payment status updates
      const notificationUrl = `${backendUrl}/api/subscription/webhook/afs`;
      afsData.append('notificationUrl', notificationUrl);
      
      if (isSubscription) {
        
        // For subscriptions, we use 'DB' (Direct Debit) for immediate charge of first payment
        // This ensures the first payment is actually debited, not just pre-authorized
        afsData.append('paymentType', 'DB');
        
        // Add subscription-specific parameters
        afsData.append('recurringType', 'INITIAL');
        
        // Calculate next charge date based on creation date logic
        const nextChargeDate = nextInstallmentDate.toISOString().slice(0, 10);
        
        // Add subscription metadata (for tracking)
        afsData.append('merchantMemo', `Subscription:${quotepaymentId}:${InstallmentLeft}:${nextChargeDate}`);
        
      } else {
        // For one-time payments, use 'DB' (Direct Debit)
        afsData.append('paymentType', 'DB');
      }
      
      const afsHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      
      
      afsResponse = await axios.post(afsUrl, afsData, { headers: afsHeaders });
      
      if (afsResponse.data && afsResponse.data.id) {
        // Generate payment link with checkout ID
        paymentLink = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${afsResponse.data.id}`;
        
        // Store the checkout ID and subscription info in the database
        try {
          const updateData = { 
            afs_checkout_id: afsResponse.data.id,
            is_subscription: isSubscription,
            subscription_status: isSubscription ? 'pending' : 'one-time',
            next_charge_date: isSubscription ? nextInstallmentDate : null
          };
          
          await Vzat_Recurring_Data.findByIdAndUpdate(
            result._id,
            updateData,
            { new: true }
          );
          
          
        } catch (updateErr) {
          // Error storing checkout/subscription data handled silently
        }
      } else {
        afsError = afsResponse.data;
      }
    } catch (err) {
      afsError = err.response ? err.response.data : err.message;
    }

    // Final response including payment link
    // Generate final URLs for response
    let finalShopperResultUrl = `${process.env.BACKEND_URL}/payment-result`;
    let paymentPageUrl = null;
    if (afsResponse && afsResponse.data && afsResponse.data.id) {
      const id = encodeURIComponent(afsResponse.data.id);
      const resourcePath = encodeURIComponent(`/v1/checkouts/${afsResponse.data.id}/payment`);
      finalShopperResultUrl = `${process.env.BACKEND_URL}/payment-result?id=${id}&resourcePath=${resourcePath}&quotepaymentId=${encodeURIComponent(quotepaymentId)}`;
      paymentPageUrl = `${process.env.FRONTEND_URL}/payment/${encodeURIComponent(afsResponse.data.id)}`;
    }
    
    const brands = "VISA MASTER AMEX";
    const data = {
      status: true,
      message: isSubscription ? "Subscription payment link created successfully" : "One-time payment link created successfully",
      quotepaymentId,
      payment_type: isSubscription ? "subscription" : "one-time",
      first_payment_due_date: firstPaymentDueDate.toISOString().slice(0, 10),
      next_installment_due_date: nextInstallmentDate ? nextInstallmentDate.toISOString().slice(0, 10) : null,
      payment_amount: installmentAmount,
      installments_left: InstallmentLeft,
      installment_type: finalInstallmentType,
      payment_link: paymentLink,
      payment_page_url: paymentPageUrl,
      afs_checkout_id: afsResponse && afsResponse.data && afsResponse.data.id ? afsResponse.data.id : null,
      shopper_result_url: finalShopperResultUrl,
      data_brands: brands,
      payment_schedule: paymentSchedule, // Add the structured payment schedule
      subscription_info: isSubscription ? {
        total_installments: InstallmentLeft,
        remaining_installments: InstallmentLeft - 1, // First payment is immediate
        next_charge_date: nextInstallmentDate ? nextInstallmentDate.toISOString().slice(0, 10) : null,
        installment_amount: installmentAmount,
        total_amount: Total_After_VAT_Currency
      } : null,
      afs_error: afsError
    };

    Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
    return res.status(200).json(data);

  } catch (error) {
    const data = { message: error.message || "Internal server error" };
    Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
    return res.status(500).json(data);
  } finally {
    
  }
};

// Exported for use in Express app.js as a dedicated backend route
export const getAFSPaymentResult = async (req, res) => {
  const { resourcePath, quotepaymentId, id } = req.query;

  if (!resourcePath) {
    return res.status(400).json({ message: "Missing resourcePath" });
  }

  const decodedPath = decodeURIComponent(resourcePath);

  // Optional security check
  if (!decodedPath.startsWith('/v1/checkouts/')) {
    return res.status(400).json({ message: "Invalid resourcePath format" });
  }

  // Check if checkout ID is provided and log environment info for debugging
  if (id) {
  }

  try {
    const afsUrl = `${process.env.AFS_DOMAIN}${decodedPath}`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;

    // Try GET request without entityId first (some AFS implementations don't want it for status checks)
    let response;
    try {
      response = await axios.get(afsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
    } catch (getError) {
      
      try {
        response = await axios.get(`${afsUrl}?entityId=${entityId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
      } catch (getWithEntityError) {
        
        try {
          const formData = new URLSearchParams();
          formData.append('entityId', entityId);
          
          response = await axios.post(afsUrl, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            }
          });
       
        } catch (postError) {
          
          // Try the result endpoint without /payment suffix as last resort
          const alternativeUrl = afsUrl.replace('/payment', '');
          
          response = await axios.get(alternativeUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          });
          
        }
      }
    }

    // Attach quotepaymentId to response for frontend display/tracking
    const resultData = { ...response.data };
    if (quotepaymentId) {
      resultData.quotepaymentId = quotepaymentId;
    }

    // Check if this is actually a successful response with payment data
    // First determine if payment was successful based on AFS result codes
    const isPaymentSuccessful = resultData.result && 
                               (resultData.result.code.startsWith('000.') || 
                                resultData.result.code ***REMOVED***= '200.300.404'); // Special case for parameter warnings
    
    if (resultData.id && resultData.amount && resultData.currency) {
      
      // Determine actual payment status based on AFS result codes
      let actualPaymentStatus = 'failed';
      let paymentMessage = 'Payment failed';
      
      if (isPaymentSuccessful) {
        actualPaymentStatus = 'success';
        paymentMessage = 'Payment completed successfully';
      } else {
        actualPaymentStatus = 'failed';
        paymentMessage = resultData.result?.description || 'Payment failed for unknown reason';
      }
      
      // Call Salesforce API to update quote payment status (for both success and failure)
      if (quotepaymentId) {
        try {
          
          const salesforcePaymentData = {
            quotepaymentId: quotepaymentId,
            amount: resultData.amount,
            transactionId: resultData.id,
            paymentType: 'Online_payment',
            paymentStatus: actualPaymentStatus, // Use actual status, not hardcoded
            resultCode: resultData.result?.code,
            resultDescription: resultData.result?.description,
            timestamp: resultData.timestamp
          };

          const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
          
          // Add comprehensive Salesforce result to response data
          resultData.salesforce_update = {
            status: salesforceResult.success ? 'success' : 'failed',
            success: salesforceResult.success,
            message: salesforceResult.message,
            error: salesforceResult.error || null,
            data: salesforceResult.data || null,
            updated_at: new Date().toISOString()
          };
          
          if (salesforceResult.success) {
            const statusText = actualPaymentStatus ***REMOVED***= 'success' ? 'successful payment' : 'failed payment';
            if (actualPaymentStatus ***REMOVED***= 'success') {
              resultData.overall_status = 'complete_success'; // Payment + Salesforce both successful
            } else {
              resultData.overall_status = 'payment_failed_salesforce_updated'; // Payment failed but Salesforce notified
            }
          } else {
            if (actualPaymentStatus ***REMOVED***= 'success') {
              resultData.overall_status = 'payment_success_salesforce_failed'; // Payment OK, Salesforce failed
            } else {
              resultData.overall_status = 'payment_failed_salesforce_failed'; // Both failed
            }
          }
          
        } catch (salesforceError) {
          resultData.salesforce_update = {
            status: 'failed',
            success: false,
            error: salesforceError.message,
            message: 'Failed to update Salesforce',
            updated_at: new Date().toISOString()
          };
          if (actualPaymentStatus ***REMOVED***= 'success') {
            resultData.overall_status = 'payment_success_salesforce_failed';
          } else {
            resultData.overall_status = 'payment_failed_salesforce_failed';
          }
        }
      } else {
        // No quotepaymentId provided, so we can't update Salesforce
        resultData.salesforce_update = {
          status: 'skipped',
          success: null,
          message: 'No Quote Payment ID provided - Salesforce update skipped',
          updated_at: new Date().toISOString()
        };
        if (actualPaymentStatus ***REMOVED***= 'success') {
          resultData.overall_status = 'payment_success_salesforce_skipped';
        } else {
          resultData.overall_status = 'payment_failed_salesforce_skipped';
        }
      }
      
      // Set the actual payment status and message based on AFS result
      resultData.paymentStatus = actualPaymentStatus;
      resultData.message = paymentMessage;
      
      // 🆕 AUTOMATIC WEBHOOK TRIGGERING FOR SUCCESSFUL PAYMENTS
      if (actualPaymentStatus ***REMOVED***= 'success' && quotepaymentId) {
        try {
          // Import webhook handler
          const { handleAFSWebhook } = await import('./SubscriptionController.js');
          
          // Create webhook data based on the payment result
          const webhookData = {
            id: resultData.id,
            paymentType: 'DB', // Always DB for direct debit
            result: {
              code: resultData.result?.code || '000.100.110',
              description: resultData.result?.description || 'Successful transaction'
            },
            amount: parseFloat(resultData.amount) || 210,
            currency: resultData.currency || 'AED',
            merchantTransactionId: quotepaymentId,
            registrationId: resultData.registrationId || resultData.id,
            timestamp: resultData.timestamp || new Date().toISOString()
          };
          
          // Create mock request and response objects
          const mockReq = {
            body: {
              ...webhookData,
              isAutoTriggered: true, // Flag to indicate this is auto-triggered
              skipCustomerCreation: true // Skip customer creation since it was already done
            },
            ip: '127.0.0.1',
            get: () => 'Auto-triggered webhook',
            headers: { 'user-agent': 'VZAT-Auto-Webhook/1.0' },
            query: {},
            originalUrl: '/auto-webhook-trigger'
          };
          
          const mockRes = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { 
              this.responseData = data; 
              return this; 
            },
            statusCode: 200,
            responseData: null
          };
          
          // Call the webhook handler
          await handleAFSWebhook(mockReq, mockRes);
          
          if (mockRes.statusCode ***REMOVED***= 200) {
            resultData.auto_webhook = {
              status: 'triggered',
              success: true,
              message: 'Webhook automatically triggered for database update',
              triggered_at: new Date().toISOString()
            };
          } else {
            resultData.auto_webhook = {
              status: 'failed',
              success: false,
              message: 'Webhook trigger returned error status',
              status_code: mockRes.statusCode,
              triggered_at: new Date().toISOString()
            };
          }
          
        } catch (webhookError) {
          resultData.auto_webhook = {
            status: 'error',
            success: false,
            error: webhookError.message,
            message: 'Failed to auto-trigger webhook',
            triggered_at: new Date().toISOString()
          };
        }
        
      }
      
      // 🆕 CREATE CUSTOMER ACCOUNT AND SAVE CARD FOR ALL SUCCESSFUL PAYMENTS
      if (actualPaymentStatus ***REMOVED***= 'success' && quotepaymentId) {
        try {
          console.log('🔄 Starting customer account creation process...');
          console.log(`📋 Payment Status: ${actualPaymentStatus}, Quote Payment ID: ${quotepaymentId}`);
          
          // Find the original payment record
          const paymentRecord = await Vzat_Recurring_Data.findOne({ quotepaymentId });
          
          if (paymentRecord) {
            console.log('✅ Payment record found:', {
              quotepaymentId: paymentRecord.quotepaymentId,
              Customer_name: paymentRecord.Customer_name,
              opp_email: paymentRecord.opp_email,
              is_subscription: paymentRecord.is_subscription
            });
            
            // Add customer information to result data for frontend display
            resultData.customer_name = paymentRecord.Customer_name;
            resultData.Customer_name = paymentRecord.Customer_name; // Backward compatibility
            resultData.customer_email = paymentRecord.opp_email;
            resultData.Total_After_VAT_Currency = paymentRecord.Total_After_VAT_Currency;
            
            // Handle customer account creation (subscription payments only)
            if (paymentRecord.is_subscription && paymentRecord.opp_email) {
              console.log('🔄 Creating customer account for subscription payment...');
              
              const customerCreationResult = await createCustomerAccount({
                quotepaymentId: paymentRecord.quotepaymentId,
                opp_email: paymentRecord.opp_email,
                Customer_name: paymentRecord.Customer_name,
                OpportunityId: paymentRecord.OpportunityId,
                QuoteId: paymentRecord.QuoteId
              });
              
              console.log('📧 Customer creation result:', customerCreationResult);
              
              if (customerCreationResult.success) {
                resultData.customer_account = {
                  status: 'created',
                  message: 'Customer account created and welcome email sent for subscription',
                  isExisting: customerCreationResult.isExisting || false
                };
                console.log('✅ Customer account created successfully for subscription');
              } else {
                resultData.customer_account = {
                  status: 'failed',
                  error: customerCreationResult.error
                };
                console.error('❌ Customer account creation failed for subscription:', customerCreationResult.error);
              }
            } else if (paymentRecord && !paymentRecord.is_subscription) {
              console.log('🔄 Creating customer account for one-time payment...');
              
              // Create customer account for one-time payments too (for card saving)
              if (paymentRecord.opp_email) {
                const customerCreationResult = await createCustomerAccount({
                  quotepaymentId: paymentRecord.quotepaymentId,
                  opp_email: paymentRecord.opp_email,
                  Customer_name: paymentRecord.Customer_name,
                  OpportunityId: paymentRecord.OpportunityId,
                  QuoteId: paymentRecord.QuoteId
                });
                
                console.log('📧 Customer creation result for one-time payment:', customerCreationResult);
                
                if (customerCreationResult.success) {
                  resultData.customer_account = {
                    status: 'created',
                    message: 'Customer account created for one-time payment card saving',
                    isExisting: customerCreationResult.isExisting || false
                  };
                  console.log('✅ Customer account created successfully for one-time payment');
                } else {
                  resultData.customer_account = {
                    status: 'failed',
                    error: customerCreationResult.error
                  };
                  console.error('❌ Customer account creation failed for one-time payment:', customerCreationResult.error);
                }
              } else {
                resultData.customer_account = {
                  status: 'skipped',
                  message: 'One-time payment - no email address provided'
                };
                console.log('⚠️ One-time payment skipped - no email address');
              }
            } else {
              resultData.customer_account = {
                status: 'skipped',
                message: 'Customer account creation skipped - missing payment data or email address'
              };
              console.log('⚠️ Customer account creation skipped - missing data:', {
                hasPaymentRecord: !!paymentRecord,
                hasEmail: paymentRecord?.opp_email,
                isSubscription: paymentRecord?.is_subscription
              });
            }
            
            // 🆕 SAVE CUSTOMER CARD DETAILS FOR ALL SUCCESSFUL PAYMENTS
            try {
              const cardSaveResult = await saveCustomerCard({
                ...paymentRecord.toObject(),
                result: resultData // Pass AFS result for card details
              });
              
              
              if (cardSaveResult.success) {
                if (!resultData.customer_account) {
                  resultData.customer_account = {};
                }
                resultData.customer_account.card_saved = true;
              } else {
                if (!resultData.customer_account) {
                  resultData.customer_account = {};
                }
                resultData.customer_account.card_saved = false;
                resultData.customer_account.card_error = cardSaveResult.message;
              }
            } catch (cardError) {
              if (!resultData.customer_account) {
                resultData.customer_account = {};
              }
              resultData.customer_account.card_saved = false;
              resultData.customer_account.card_error = cardError.message;
            }
            
          } else {
            // Try to get customer data from Salesforce API if payment record not found
            if (quotepaymentId) {
              try {
                const { GetVzatRecurringDataById } = await import('./GetVzatRecurringDataById.js');
                
                // Create mock request object for the API call
                const mockReq = {
                  params: { quotepaymentId: quotepaymentId },
                  query: {}
                };
                
                let customerData = null;
                const mockRes = {
                  json: function(data) { 
                    customerData = data;
                    return this; 
                  },
                  status: function(code) { 
                    this.statusCode = code; 
                    return this; 
                  },
                  statusCode: 200
                };
                
                await GetVzatRecurringDataById(mockReq, mockRes);
                
                if (customerData && customerData.Customer_name) {
                  resultData.customer_name = customerData.Customer_name;
                  resultData.Customer_name = customerData.Customer_name;
                  resultData.customer_email = customerData.opp_email;
                  resultData.Total_After_VAT_Currency = customerData.Total_After_VAT_Currency;
                  
                }
              } catch (apiError) {
                // Error fetching customer data handled silently
              }
            }
            
            resultData.customer_account = {
              status: 'failed',
              error: 'Payment record not found in database'
            };
          }
        } catch (customerError) {
          resultData.customer_account = {
            status: 'failed',
            error: customerError.message
          };
        }

      } else {
        // Customer registration skipped
      }
      
      // For backwards compatibility, also check special shopperResultUrl cases
      if (actualPaymentStatus ***REMOVED***= 'success' && resultData.result && 
          resultData.result.code ***REMOVED***= "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length ***REMOVED***= 1 &&
          resultData.result.parameterErrors[0].name ***REMOVED***= "shopperResultUrl") {
        
        // This is just a warning about shopperResultUrl, payment is successful
        const cleanData = { ...resultData };
        delete cleanData.result; // Remove the warning
        cleanData.warning = 'shopperResultUrl was already set during payment creation';
        
        return res.json(cleanData);
      }
      
      // Return the result with proper payment status
      return res.json(resultData);
    } else {
  
      
      // Special case: If we get a shopperResultUrl error but it's about the CORRECT URL, treat it as success
      if (resultData.result && 
          resultData.result.code ***REMOVED***= "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length ***REMOVED***= 1 &&
          resultData.result.parameterErrors[0].name ***REMOVED***= "shopperResultUrl" &&
          resultData.result.parameterErrors[0].value ***REMOVED***= `${process.env.BACKEND_URL}/payment-result`) {
        
        // Call Salesforce API for this success case too
        if (quotepaymentId) {
          try {
            
            const salesforcePaymentData = {
              quotepaymentId: quotepaymentId,
              amount: 0, // Amount not available in this case
              transactionId: req.query.id || 'N/A',
              paymentType: 'Online_payment',
              paymentStatus: 'success',
              resultCode: '000.100.110',
              resultDescription: 'Payment completed successfully',
              timestamp: new Date().toISOString()
            };

            const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
            
            if (salesforceResult.success) {
              // Salesforce updated successfully
            } else {
              // Salesforce update failed
            }
            
          } catch (salesforceError) {
            // Error calling Salesforce API handled silently
          }
        }
       
        return res.json({
          paymentStatus: 'success',
          message: 'Payment session accessed successfully',
          warning: 'AFS returned a shopperResultUrl warning, but the URL is correct',
          quotepaymentId: quotepaymentId,
          checkout_id: req.query.id,
          shopperResultUrl: resultData.result.parameterErrors[0].value,
          note: 'This usually means the payment checkout is valid but AFS is being strict about parameter usage'
        });
      }
      
      // No valid payment data found - check for specific "shopperResultUrl" error case
      if (resultData.result && 
          resultData.result.code ***REMOVED***= "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length ***REMOVED***= 1 &&
          resultData.result.parameterErrors[0].name ***REMOVED***= "shopperResultUrl") {
        
        // This is the specific case where AFS is complaining about shopperResultUrl mismatch
        return res.status(400).json({
          message: 'Payment session configuration mismatch',
          error: 'The payment was created with a different shopperResultUrl. This usually happens when the payment was created on localhost but accessed from live server.',
          suggestion: 'Create a new payment link from your live server environment',
          original_error: resultData.result,
          environment_info: {
            current_domain: process.env.AFS_DOMAIN,
            current_backend: process.env.BACKEND_URL,
            checkout_id: req.query.id,
            conflicting_url: resultData.result.parameterErrors[0].value
          }
        });
      }
      
      // Other 404 errors
      if (resultData.result && resultData.result.code) {
        return res.status(400).json({
          message: 'Failed to retrieve payment data',
          error: resultData.result,
          code: resultData.result.code
        });
      }
    }

    res.json(resultData);
  } catch (error) {
    // Log full error response for diagnostics
    if (error.response) {
      
      // Handle specific AFS error: "No payment session found"
      if (error.response.data && 
          error.response.data.result && 
          error.response.data.result.code ***REMOVED***= "200.300.404" &&
          error.response.data.result.description && 
          error.response.data.result.description.includes("No payment session found")) {
        
        return res.status(400).json({
          message: 'Payment session has expired or not found',
          error: 'This payment session is no longer valid. This can happen if: 1) More than 30 minutes have passed since payment creation, 2) Wrong environment (test vs live), or 3) Invalid checkout ID.',
          suggestion: 'Please create a new payment link',
          original_error: error.response.data,
          environment_check: {
            current_domain: process.env.AFS_DOMAIN,
            checkout_id: req.query.id,
            suggested_action: 'Verify AFS environment matches your server environment'
          }
        });
      }
      
      res.status(500).json({
        message: 'Failed to get payment result',
        error: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
        config: error.config
      });
    } else {

      res.status(500).json({
        message: 'Failed to get payment result',
        error: error.message
      });
    }
  }
};

export default Post_Vzat_Recurring_Data;