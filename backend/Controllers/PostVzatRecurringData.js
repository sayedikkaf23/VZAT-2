import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import axios from "axios";


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
      // Debug log for year, month, current year
      console.log("Installment Calculation Debug:", { year, month, currentYear: currentDate.getFullYear() });

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

    // Final response before AFS call
    // Generate AFS payment link
    let paymentLink = null;
    let afsError = null;
    let afsResponse = null;
    try {
      const afsUrl = "https://eu-test.oppwa.com/v1/checkouts";
      const entityId = "8ac7a4c797e1beca0197e482a8200127";
      const accessToken = "OGFjN2E0Yzc5N2UxYmVjYTAxOTdlNDgxYWFhYTAxMjJ8NnBtN1IlWVlTUkRSYXE2UXFDWXA=";
      // Prepare shopperResultUrl for AFS redirect
      const sandboxFrontendUrl = 'https://vzatnew.yeepeey.com';
      const shopperResultUrl = `${sandboxFrontendUrl}/payment/result?id={checkoutId}&resourcePath=/v1/checkouts/{checkoutId}/payment`;
      const afsData = new URLSearchParams();
      afsData.append('entityId', entityId);
      afsData.append('amount', installmentAmount.toString());
      afsData.append('currency', 'AED');
      afsData.append('paymentType', 'DB');
      afsData.append('merchantTransactionId', quotepaymentId);
      afsData.append('shopperResultUrl', shopperResultUrl);
      // Optionally add customer info if available
      // afsData.append('customer.email', req.body.customerEmail || 'test@example.com');
      console.log('AFS Checkout Request Data:', afsData.toString());
      const afsHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      afsResponse = await axios.post(afsUrl, afsData, { headers: afsHeaders });
      if (afsResponse.data && afsResponse.data.id) {
        console.log("AFS Response:", afsResponse.data);
        // Generate payment link with checkout ID
        paymentLink = `https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=${afsResponse.data.id}`;
      } else {
        afsError = afsResponse.data;
      }
    } catch (err) {
      afsError = err.response ? err.response.data : err.message;
    }

    // Final response including payment link
    // Generate shopperResultUrl with id and resourcePath for AFS redirect
    const sandboxFrontendUrl = 'https://vzatnew.yeepeey.com';
    let shopperResultUrl = `${sandboxFrontendUrl}/payment/result`;
    let paymentPageUrl = null;
    if (afsResponse && afsResponse.data && afsResponse.data.id) {
      const id = encodeURIComponent(afsResponse.data.id);
      const resourcePath = encodeURIComponent(`/v1/checkouts/${afsResponse.data.id}/payment`);
      shopperResultUrl = `${sandboxFrontendUrl}/payment/result?id=${id}&resourcePath=${resourcePath}`;
      paymentPageUrl = `${sandboxFrontendUrl}/payment/${encodeURIComponent(afsResponse.data.id)}`;
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

export const getAFSPaymentResult = async (req, res) => {
  const { resourcePath } = req.query;

  if (!resourcePath) {
    return res.status(400).json({ message: "Missing resourcePath" });
  }

  const decodedPath = decodeURIComponent(resourcePath);

  // Optional security check
  if (!decodedPath.startsWith('/v1/checkouts/')) {
    return res.status(400).json({ message: "Invalid resourcePath format" });
  }

  try {
    const afsUrl = `https://eu-test.oppwa.com${decodedPath}`;
    const accessToken = 'OGFjN2E0Yzc5N2UxYmVjYTAxOTdlNDgxYWFhYTAxMjJ8NnBtN1IlWVlTUkRSYXE2UXFDWXA=';

    console.log("🔎 Fetching AFS payment result from:", afsUrl);

    const response = await axios.get(afsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log("✅ AFS Payment Result:", JSON.stringify(response.data, null, 2));

    res.json(response.data);
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

