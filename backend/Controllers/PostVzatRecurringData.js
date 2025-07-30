import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const Post_Vzat_Recurring_Data = async (req, res) => {
  await connectDB();

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
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
      opp_mobile
    } = req.body;

    // Validate required fields
    if (
      !OpportunityId || !quotepaymentId || !QuoteId || !CreatedDate || !Status ||
      TotalPrice === null || TotalPrice === undefined || TotalPrice === 0 ||
      Total_After_VAT_Currency === null || Total_After_VAT_Currency === undefined || Total_After_VAT_Currency === 0 ||
      !Array.isArray(Product_details) || Product_details.length === 0
    ) {
      const data = { message: "Missing or invalid required fields" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
    }

    // Check if quotepaymentId already exists in the database
    console.log(`🔍 Checking for existing quotepaymentId: ${quotepaymentId}`);
    const existingRecord = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    console.log(`🔍 Database search result:`, existingRecord ? 'FOUND' : 'NOT FOUND');
    
    if (existingRecord) {
      console.log(`Duplicate quotepaymentId found! Record ID: ${existingRecord._id}`);
      
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
    
    console.log(`No duplicate found, proceeding with new payment creation for quotepaymentId: ${quotepaymentId}`);

    // Validate CreatedDate format
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof CreatedDate !== 'string' || !regEx.test(CreatedDate)) {
      const data = { message: "Date should be in yyyy-mm-dd format" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
    }

    const dateObj = new Date(CreatedDate);
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== CreatedDate) {
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
    let firstPaymentDueDate = new Date(createdDateObj);
    let nextInstallmentDate = null;
    let installmentAmount = parseFloat(Total_After_VAT_Currency);
    
    if (finalInstallmentType === "Installments") {
      const currentDate = new Date();

      // Calculate installments left based on CreatedDate month (including current month)
      if (year <= currentDate.getFullYear()) {
        InstallmentLeft = 12 - month;
      } else {
        InstallmentLeft = 12;
      }
      if (InstallmentLeft <= 0) InstallmentLeft = 1;

      // Add 7 days to CreatedDate for first payment
      firstPaymentDueDate = new Date(createdDateObj.getTime());
      firstPaymentDueDate.setDate(firstPaymentDueDate.getDate() + 7);

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
    console.log(`💾 Saving new record with quotepaymentId: ${quotepaymentId}`);
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
      opp_mobile
    });

    const result = await baseData.save();
    console.log(`Record saved successfully with ID: ${result._id}`);

    // Generate payment schedule array for installments
    let paymentSchedule = [];
    if (finalInstallmentType === "Installments" && InstallmentLeft > 0) {
      console.log(`📅 Generating payment schedule for ${InstallmentLeft} installments`);
      
      // Helper function to calculate payment day based on business rule
      const getPaymentDay = (date) => {
        const day = date.getDate();
        return day <= 15 ? 10 : 25; // 1st-15th: 10th, 16th-31st: 25th
      };
      
      for (let i = 0; i < InstallmentLeft; i++) {
        let dueDate;
        
        if (i === 0) {
          // First payment: use the first payment due date (CreatedDate + 7 days)
          dueDate = firstPaymentDueDate;
        } else {
          // Subsequent payments: 10th or 25th of each month based on original creation date
          const paymentDay = getPaymentDay(createdDateObj);
          const targetMonth = createdDateObj.getMonth() + i + 1; // +1 because first payment is immediate
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
          status: i === 0 ? 'due' : 'pending'
        });
      }
      
      console.log(`📋 Generated payment schedule:`, paymentSchedule);
      
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
        product.TotalPrice === null || product.TotalPrice === undefined || product.TotalPrice === 0 ||
        product.Total_Price_After_VAT === null || product.Total_Price_After_VAT === undefined || product.Total_Price_After_VAT === 0
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
    let isSubscription = finalInstallmentType === "Installments" && InstallmentLeft > 1;
    
    try {
      const afsUrl = `${process.env.AFS_DOMAIN}/v1/checkouts`;
      const entityId = process.env.AFS_ENTITY_ID;
      const accessToken = process.env.AFS_ACCESS_TOKEN;
      const backendUrl = process.env.BACKEND_URL;
      const frontendUrl = process.env.FRONTEND_URL;
     
      // Use backend URL for shopperResultUrl since that's where the payment-result endpoint is
      const shopperResultUrl = `${backendUrl}/payment-result`;
    
      console.log(`🔐 AFS Configuration Debug:`);
      console.log(`   - Backend URL: ${backendUrl}`);
      console.log(`   - Frontend URL: ${frontendUrl}`);
      console.log(`   - Shopper Result URL: ${shopperResultUrl}`);
      console.log(`   - AFS Domain: ${process.env.AFS_DOMAIN}`);
      console.log(`   - Entity ID: ${entityId}`);
      
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
      
      if (isSubscription) {
        console.log(`🔄 Creating subscription for ${InstallmentLeft} installments`);
        
        // For subscriptions, we use 'DB' (Direct Debit) for immediate charge of first payment
        // This ensures the first payment is actually debited, not just pre-authorized
        afsData.append('paymentType', 'DB');
        
        // Add subscription-specific parameters
        afsData.append('recurringType', 'INITIAL');
        
        // Calculate next charge date based on creation date logic
        const nextChargeDate = nextInstallmentDate.toISOString().slice(0, 10);
        console.log(`📅 Next charge date calculated: ${nextChargeDate}`);
        
        // Add subscription metadata (for tracking)
        afsData.append('merchantMemo', `Subscription:${quotepaymentId}:${InstallmentLeft}:${nextChargeDate}`);
        
      } else {
        console.log(`💳 Creating one-time payment`);
        // For one-time payments, use 'DB' (Direct Debit)
        afsData.append('paymentType', 'DB');
      }
      
      const afsHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      
      console.log(`🚀 Sending request to AFS: ${isSubscription ? 'SUBSCRIPTION' : 'ONE-TIME'}`);
      console.log(`📋 AFS Request Data:`, Object.fromEntries(afsData.entries()));
      console.log(`🔗 AFS URL:`, afsUrl);
      
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
          
          console.log(`${isSubscription ? 'Subscription' : 'Payment'} data stored successfully`);
        } catch (updateErr) {
          console.error(" Failed to store checkout/subscription data:", updateErr);
        }
      } else {
        afsError = afsResponse.data;
      }
    } catch (err) {
      console.error(" AFS API Error:", err.response ? err.response.data : err.message);
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
      console.log(` Method 1 failed:`, getError.response?.status, getError.response?.data);
      
      try {
        console.log(`🔄 Method 2: GET with entityId parameter`);
        response = await axios.get(`${afsUrl}?entityId=${entityId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
      } catch (getWithEntityError) {
        console.log(` Method 2 failed:`, getWithEntityError.response?.status, getWithEntityError.response?.data);
        
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
          console.log(` Method 3 failed:`, postError.response?.status, postError.response?.data);
          
          // Try the result endpoint without /payment suffix as last resort
          const alternativeUrl = afsUrl.replace('/payment', '');
          console.log(`🔄 Method 4: Alternative URL without /payment: ${alternativeUrl}`);
          
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

    console.log(`📋 AFS Response received:`, JSON.stringify(resultData, null, 2));

    // Check if this is actually a successful response with payment data
    // First determine if payment was successful based on AFS result codes
    const isPaymentSuccessful = resultData.result && 
                               (resultData.result.code.startsWith('000.') || 
                                resultData.result.code === '200.300.404'); // Special case for parameter warnings
    
    console.log(`🔍 Payment Status Check: Result Code=${resultData.result?.code}, Is Successful=${isPaymentSuccessful}`);
    
    if (resultData.id && resultData.amount && resultData.currency) {
      
      console.log(`Valid payment data found: ID=${resultData.id}, Amount=${resultData.amount}, Currency=${resultData.currency}`);
      
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
      
      console.log(`💳 Determined Payment Status: ${actualPaymentStatus} - ${paymentMessage}`);
      
      // Call Salesforce API to update quote payment status (for both success and failure)
      if (quotepaymentId) {
        try {
          console.log(`🔄 Calling Salesforce API to update payment status (${actualPaymentStatus})...`);
          
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
            const statusText = actualPaymentStatus === 'success' ? 'successful payment' : 'failed payment';
            console.log(`✅ Salesforce has been notified of ${statusText}`);
            if (actualPaymentStatus === 'success') {
              resultData.overall_status = 'complete_success'; // Payment + Salesforce both successful
            } else {
              resultData.overall_status = 'payment_failed_salesforce_updated'; // Payment failed but Salesforce notified
            }
          } else {
            console.warn('⚠️ Salesforce update failed:', salesforceResult.error);
            if (actualPaymentStatus === 'success') {
              resultData.overall_status = 'payment_success_salesforce_failed'; // Payment OK, Salesforce failed
            } else {
              resultData.overall_status = 'payment_failed_salesforce_failed'; // Both failed
            }
          }
          
        } catch (salesforceError) {
          console.error('❌ Error calling Salesforce API:', salesforceError);
          resultData.salesforce_update = {
            status: 'failed',
            success: false,
            error: salesforceError.message,
            message: 'Failed to update Salesforce',
            updated_at: new Date().toISOString()
          };
          if (actualPaymentStatus === 'success') {
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
        if (actualPaymentStatus === 'success') {
          resultData.overall_status = 'payment_success_salesforce_skipped';
        } else {
          resultData.overall_status = 'payment_failed_salesforce_skipped';
        }
      }
      
      // Set the actual payment status and message based on AFS result
      resultData.paymentStatus = actualPaymentStatus;
      resultData.message = paymentMessage;
      
      // For backwards compatibility, also check special shopperResultUrl cases
      if (actualPaymentStatus === 'success' && resultData.result && 
          resultData.result.code === "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length === 1 &&
          resultData.result.parameterErrors[0].name === "shopperResultUrl") {
        
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
          resultData.result.code === "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length === 1 &&
          resultData.result.parameterErrors[0].name === "shopperResultUrl" &&
          resultData.result.parameterErrors[0].value === `${process.env.BACKEND_URL}/payment-result`) {
        
        // Call Salesforce API for this success case too
        if (quotepaymentId) {
          try {
            console.log('🔄 Calling Salesforce API for successful payment (shopperResultUrl warning case)...');
            
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
              console.log('✅ Salesforce has been called and updated successfully');
            } else {
              console.warn('⚠️ Salesforce update failed:', salesforceResult.error);
            }
            
          } catch (salesforceError) {
            console.error('❌ Error calling Salesforce API:', salesforceError);
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
          resultData.result.code === "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length === 1 &&
          resultData.result.parameterErrors[0].name === "shopperResultUrl") {
        
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
      console.error(" AFS Payment Result Error:", JSON.stringify(error.response.data, null, 2));
      
      // Handle specific AFS error: "No payment session found"
      if (error.response.data && 
          error.response.data.result && 
          error.response.data.result.code === "200.300.404" &&
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
      console.error(" AFS Payment Result Error:", error.message);
      res.status(500).json({
        message: 'Failed to get payment result',
        error: error.message
      });
    }
  }
};

export default Post_Vzat_Recurring_Data;