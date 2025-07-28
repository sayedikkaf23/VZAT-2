import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service for interacting with Salesforce API
 */

/**
 * Call Salesforce API to update quote payment status
 * @param {Object} paymentData - Payment data from AFS response
 * @returns {Object} - Result of the Salesforce API call
 */
export const updateQuotePaymentStatus = async (paymentData) => {
  try {
    console.log('🔄 Calling Salesforce API to update quote payment status...');
    
    const {
      quotepaymentId,
      amount,
      transactionId,
      paymentType = 'Online_payment',
      paymentStatus,
      resultCode,
      resultDescription,
      timestamp
    } = paymentData;

    // Determine if payment was successful
    const isSuccess = paymentStatus === 'success' || 
                     (resultCode && resultCode.startsWith('000.'));
    
    // Calculate next due date (30 days from now as default)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const formattedNextDueDate = nextDueDate.toISOString().slice(0, 10);

    // Prepare Salesforce request payload
    const salesforcePayload = {
      QuotePaymentId: quotepaymentId,
      Status: isSuccess,
      Paid_Amount: parseFloat(amount) || 0,
      Transaction_Number: transactionId || 'N/A',
      Message: isSuccess ? 'Transaction completed successfully' : (resultDescription || 'Transaction failed'),
      Next_due_date: formattedNextDueDate,
      Payment_Type: paymentType
    };

    console.log('📋 Salesforce payload:', JSON.stringify(salesforcePayload, null, 2));

    // Make the API call to Salesforce
    const salesforceResponse = await axios.post(
      process.env.SALESFORCE_API_URL,
      salesforcePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log('✅ Salesforce API response:', salesforceResponse.data);
    console.log('🎉 Salesforce has been called and updated successfully');

    return {
      success: true,
      data: salesforceResponse.data,
      message: 'Salesforce has been called and updated successfully'
    };

  } catch (error) {
    console.error('❌ Error calling Salesforce API:', error);
    
    let errorMessage = 'Failed to update Salesforce';
    let errorDetails = {};

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Salesforce API error: ${error.response.status} - ${error.response.statusText}`;
      errorDetails = {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
      console.error('❌ Salesforce response error:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from Salesforce API';
      errorDetails = { request: error.request };
      console.error('❌ No response from Salesforce:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request setup error: ${error.message}`;
      errorDetails = { message: error.message };
      console.error('❌ Request setup error:', error.message);
    }

    // Log the error but don't fail the payment processing
    console.error('⚠️ Salesforce update failed, but payment processing will continue');

    return {
      success: false,
      error: errorMessage,
      details: errorDetails,
      message: 'Failed to update Salesforce, but payment was processed'
    };
  }
};

/**
 * Test Salesforce API connectivity
 * @returns {Object} - Test result
 */
export const testSalesforceConnection = async () => {
  try {
    console.log('🧪 Testing Salesforce API connection...');
    
    const testPayload = {
      QuotePaymentId: "TEST-" + Date.now(),
      Status: true,
      Paid_Amount: 1.00,
      Transaction_Number: "TEST-TRANSACTION-" + Date.now(),
      Message: "Test connection from VZAT payment system",
      Next_due_date: new Date().toISOString().slice(0, 10),
      Payment_Type: "Test_payment"
    };

    const response = await axios.post(
      process.env.SALESFORCE_API_URL,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout for test
      }
    );

    console.log('✅ Salesforce test connection successful');
    return {
      success: true,
      data: response.data,
      message: 'Salesforce API connection test successful'
    };

  } catch (error) {
    console.error('❌ Salesforce test connection failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Salesforce API connection test failed'
    };
  }
};

export default {
  updateQuotePaymentStatus,
  testSalesforceConnection
};
