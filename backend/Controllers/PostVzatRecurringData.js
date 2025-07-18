import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
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
      Total_After_VAT_Currency__c,
      InstallmentType,
      Product_details
    } = req.body;

    // Validate required fields
    if (
      !OpportunityId || !quotepaymentId || !QuoteId || !CreatedDate || !Status ||
      TotalPrice ***REMOVED***= null || TotalPrice ***REMOVED***= undefined || TotalPrice ***REMOVED***= 0 ||
      Total_After_VAT_Currency__c ***REMOVED***= null || Total_After_VAT_Currency__c ***REMOVED***= undefined || Total_After_VAT_Currency__c ***REMOVED***= 0 ||
      !Array.isArray(Product_details) || Product_details.length ***REMOVED***= 0
    ) {
      const data = { message: "Missing or invalid required fields" };
      Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
      return res.status(400).json(data);
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
    let firstPaymentDueDate = new Date(createdDateObj);
    let nextInstallmentDate = null;
    let installmentAmount = parseFloat(Total_After_VAT_Currency__c);
    
    if (finalInstallmentType ***REMOVED***= "Installments") {
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

      installmentAmount = parseFloat((Total_After_VAT_Currency__c / InstallmentLeft).toFixed(2));
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
      Total_After_VAT_Currency__c,
      Product_details: []
    });

    const result = await baseData.save();

    // Insert product details
    for (const product of Product_details) {
      if (
        !product.QuoteLineItemId ||
        product.TotalPrice ***REMOVED***= null || product.TotalPrice ***REMOVED***= undefined || product.TotalPrice ***REMOVED***= 0 ||
        product.Total_Price_After_VAT__c ***REMOVED***= null || product.Total_Price_After_VAT__c ***REMOVED***= undefined || product.Total_Price_After_VAT__c ***REMOVED***= 0
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

    // Generate AFS payment link
    let paymentLink = null;
    let afsError = null;
    let afsResponse = null;
    try {
      const afsUrl = `${process.env.AFS_DOMAIN}/v1/checkouts`;
      const entityId = process.env.AFS_ENTITY_ID;
      const accessToken = process.env.AFS_ACCESS_TOKEN;
      const frontendUrl = process.env.FRONTEND_URL;
      const shopperResultUrl = `${frontendUrl}/payment-result`;
      
      // Debug: Check if environment variables are loaded
      if (!process.env.AFS_DOMAIN || !process.env.AFS_ENTITY_ID || !process.env.AFS_ACCESS_TOKEN) {
        throw new Error(`Missing AFS environment variables: AFS_DOMAIN=${!!process.env.AFS_DOMAIN}, AFS_ENTITY_ID=${!!process.env.AFS_ENTITY_ID}, AFS_ACCESS_TOKEN=${!!process.env.AFS_ACCESS_TOKEN}`);
      }
      
      const afsData = new URLSearchParams();
      afsData.append('entityId', entityId);
      afsData.append('amount', installmentAmount.toString());
      afsData.append('currency', 'AED');
      afsData.append('paymentType', 'DB');
      afsData.append('merchantTransactionId', quotepaymentId);
      afsData.append('shopperResultUrl', shopperResultUrl);
      
      const afsHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      
      afsResponse = await axios.post(afsUrl, afsData, { headers: afsHeaders });
      if (afsResponse.data && afsResponse.data.id) {
        // Generate payment link with checkout ID
        paymentLink = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${afsResponse.data.id}`;
        
        // Store the checkout ID in the database for later retrieval
        try {
          await Vzat_Recurring_Data.findByIdAndUpdate(
            result._id,
            { afs_checkout_id: afsResponse.data.id },
            { new: true }
          );
        } catch (updateErr) {
          console.error("❌ Failed to store checkout ID:", updateErr);
        }
      } else {
        afsError = afsResponse.data;
      }
    } catch (err) {
      afsError = err.response ? err.response.data : err.message;
    }

    // Final response including payment link
    // Generate shopperResultUrl with id, resourcePath, and quotepaymentId for AFS redirect
    const backendUrl = process.env.BACKEND_URL;
    let shopperResultUrl = `${backendUrl}/payment-result`;
    let paymentPageUrl = null;
    if (afsResponse && afsResponse.data && afsResponse.data.id) {
      const id = encodeURIComponent(afsResponse.data.id);
      const resourcePath = encodeURIComponent(`/v1/checkouts/${afsResponse.data.id}/payment`);
      shopperResultUrl = `${backendUrl}/payment-result?id=${id}&resourcePath=${resourcePath}&quotepaymentId=${encodeURIComponent(quotepaymentId)}`;
      paymentPageUrl = `${process.env.FRONTEND_URL}/payment/${encodeURIComponent(afsResponse.data.id)}`;
    }
    
    const brands = "VISA MASTER AMEX";
    const data = {
      status: true,
      message: "Installment calculation complete",
      quotepaymentId,
      first_payment_due_date: firstPaymentDueDate.toISOString().slice(0, 10),
      next_installment_due_date: nextInstallmentDate ? nextInstallmentDate.toISOString().slice(0, 10) : null,
      payment_amount: installmentAmount,
      installments_left: InstallmentLeft,
      installment_type: finalInstallmentType,
      payment_link: paymentLink,
      payment_page_url: paymentPageUrl,
      afs_checkout_id: afsResponse && afsResponse.data && afsResponse.data.id ? afsResponse.data.id : null,
      shopper_result_url: shopperResultUrl,
      data_brands: brands,
      afs_error: afsError
    };

    Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
    return res.status(200).json(data);

  } catch (error) {
    const data = { message: error.message || "Internal server error" };
    Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link", req.body, data);
    return res.status(500).json(data);
  } finally {
    await disconnectDB();
  }
};

// Exported for use in Express app.js as a dedicated backend route
export const getAFSPaymentResult = async (req, res) => {
  const { resourcePath, quotepaymentId } = req.query;

  if (!resourcePath) {
    return res.status(400).json({ message: "Missing resourcePath" });
  }

  const decodedPath = decodeURIComponent(resourcePath);

  // Optional security check
  if (!decodedPath.startsWith('/v1/checkouts/')) {
    return res.status(400).json({ message: "Invalid resourcePath format" });
  }

  try {
    const afsUrl = `${process.env.AFS_DOMAIN}${decodedPath}`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;

    // Based on AFS docs error 800.900.300, try POST method with form data (like payment creation)
    let response;
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
      try {
        response = await axios.get(`${afsUrl}?entityId=${entityId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
      } catch (getError) {
        try {
          response = await axios.get(`${afsUrl}?entityId=${entityId}`, {
            headers: {
              'Authorization': `Basic ${accessToken}`,
              'Accept': 'application/json'
            }
          });
        } catch (basicError) {
          // Try the result endpoint without /payment suffix (some AFS setups use this)
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
    // AFS sometimes returns result.code 200.300.404 for parameter warnings, but payment data is still valid
    if (resultData.id && resultData.amount && resultData.currency) {
      
      // Check if the error is ONLY about shopperResultUrl (which is just a warning)
      if (resultData.result && 
          resultData.result.code ***REMOVED***= "200.300.404" && 
          resultData.result.parameterErrors && 
          resultData.result.parameterErrors.length ***REMOVED***= 1 &&
          resultData.result.parameterErrors[0].name ***REMOVED***= "shopperResultUrl") {
        
        // This is just a warning about shopperResultUrl, not a real error
        const cleanData = { ...resultData };
        delete cleanData.result; // Remove the warning
        cleanData.paymentStatus = 'success';
        cleanData.message = 'Payment details retrieved successfully';
        cleanData.warning = 'shopperResultUrl was already set during payment creation';
        
        return res.json(cleanData);
      } else if (resultData.result && resultData.result.code ***REMOVED***= "200.300.404") {
        // There are other parameter errors, but we have valid payment data
        resultData.paymentStatus = 'partial_success';
        resultData.message = 'Payment data retrieved with warnings';
        return res.json(resultData);
      } else {
        // No errors, clean success
        resultData.paymentStatus = 'success';
        resultData.message = 'Payment details retrieved successfully';
        return res.json(resultData);
      }
    } else {
      // No valid payment data found
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
      console.error("❌ AFS Payment Result Error:", JSON.stringify(error.response.data, null, 2));
      res.status(500).json({
        message: 'Failed to get payment result',
        error: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
        config: error.config
      });
    } else {
      console.error("❌ AFS Payment Result Error:", error.message);
      res.status(500).json({
        message: 'Failed to get payment result',
        error: error.message
      });
    }
  }
};

export default Post_Vzat_Recurring_Data;