import axios from 'axios';
import dotenv from 'dotenv';
import { logSalesforceApiCall } from './salesforceApiLogService.js';

dotenv.config();

/**
 * Service for interacting with Salesforce API
 */

// Cache for access token
let accessTokenCache = {
  token: null,
  instanceUrl: null,
  expiresAt: null
};

/**
 * Get Salesforce access token using OAuth2
 * @returns {object} - Token response with access_token and instance_url
 */
const getSalesforceAccessToken = async () => {
  const startTime = Date.now();
  const endpoint = `${process.env.SALESFORCE_LOGIN_URL}/services/oauth2/token`;
  
  try {
    // Check if we have a valid cached token
    if (accessTokenCache.token && accessTokenCache.instanceUrl && accessTokenCache.expiresAt > Date.now()) {
      console.log('🔄 Using cached Salesforce access token');
      return {
        access_token: accessTokenCache.token,
        instance_url: accessTokenCache.instanceUrl
      };
    }

    console.log('🔄 Requesting new Salesforce access token...');

    const authData = new URLSearchParams();
    authData.append('grant_type', 'password');
    authData.append('client_id', process.env.SALESFORCE_CLIENT_ID);
    authData.append('client_secret', process.env.SALESFORCE_CLIENT_SECRET);
    authData.append('username', process.env.SALESFORCE_USERNAME);
    authData.append('password', process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN);

    const requestData = {
      grant_type: 'password',
      client_id: process.env.SALESFORCE_CLIENT_ID,
      username: process.env.SALESFORCE_USERNAME,
      // Don't log sensitive data like client_secret, password, security_token
    };

    const response = await axios.post(
      endpoint,
      authData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    const { access_token, instance_url, expires_in } = response.data;
    
    // Cache the token and instance URL (expires_in is typically 7200 seconds = 2 hours, we'll cache for 1.5 hours to be safe)
    accessTokenCache.token = access_token;
    accessTokenCache.instanceUrl = instance_url;
    accessTokenCache.expiresAt = Date.now() + (expires_in - 300) * 1000; // 5 minutes buffer

    // Log successful authentication
    await logSalesforceApiCall({
      endpoint,
      method: 'POST',
      requestData,
      responseData: { 
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        // Don't log the actual access token for security
      },
      statusCode: response.status,
      isSuccess: true,
      executionTime: Date.now() - startTime
    });

    console.log('✅ Salesforce access token obtained successfully');
    return {
      access_token,
      instance_url
    };

  } catch (error) {
    // Log failed authentication
    await logSalesforceApiCall({
      endpoint,
      method: 'POST',
      requestData: {
        grant_type: 'password',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        username: process.env.SALESFORCE_USERNAME
      },
      statusCode: error.response?.status,
      isSuccess: false,
      errorMessage: error.message,
      executionTime: Date.now() - startTime
    });

    console.error('❌ Failed to get Salesforce access token:', error);
    throw new Error(`Failed to authenticate with Salesforce: ${error.message}`);
  }
};

/**
 * Call Salesforce API to update quote payment status
 * @param {Object} paymentData - Payment data from AFS response
 * @returns {Object} - Result of the Salesforce API call
 */
export const updateQuotePaymentStatus = async (paymentData) => {
  const startTime = Date.now();
  
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
      timestamp,
      nextDueDate
    } = paymentData;

    // Determine if payment was successful
    const isSuccess = paymentStatus ***REMOVED***= 'success' || 
                     (resultCode && resultCode.startsWith('000.'));
    
    // Calculate next due date - use provided date or default to 30 days from now
    const formattedNextDueDate = nextDueDate || (() => {
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 30);
      return nextDueDate.toISOString().slice(0, 10);
    })();

    // Process amount
    const processedAmount = Math.round(parseFloat(amount)) || 0;
    console.log(`💰 Processing amount: "${amount}" → ${processedAmount} (type: ${typeof processedAmount})`);

    // Prepare Salesforce request payload
    const salesforcePayload = {
      QuotePaymentId: quotepaymentId,
      Status: isSuccess,
      Paid_Amount: processedAmount, // Round to nearest integer
      Transaction_Number: transactionId || 'N/A',
      Message: isSuccess ? 'Transaction completed successfully' : (resultDescription || 'Transaction failed'),
      Next_due_date: formattedNextDueDate,
      Payment_Type: paymentType
    };

    console.log('📋 Salesforce payload:', JSON.stringify(salesforcePayload, null, 2));

    // Get access token and instance URL
    const tokenResponse = await getSalesforceAccessToken();
    const { access_token, instance_url } = tokenResponse;
    
    // Build dynamic endpoint using instance URL
    const endpoint = `${instance_url}/services/apexrest/updateQuotePaymentStatus`;
    console.log('🔗 Salesforce endpoint:', endpoint);

    // Make the API call to Salesforce
    const salesforceResponse = await axios.put(
      endpoint,
      salesforcePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log('✅ Salesforce API response:', salesforceResponse.data);
    
    // Check if the response contains an error
    if (salesforceResponse.data && salesforceResponse.data.error) {
      console.error('❌ Salesforce returned an error:', salesforceResponse.data.error);
      
      // Log failed API call
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: salesforcePayload,
        responseData: salesforceResponse.data,
        statusCode: salesforceResponse.status,
        isSuccess: false,
        errorMessage: salesforceResponse.data.error,
        executionTime: Date.now() - startTime,
        quotepaymentId
      });
      
      throw new Error(`Salesforce API returned error: ${salesforceResponse.data.error}`);
    }
    
    // Log successful API call
    await logSalesforceApiCall({
      endpoint,
      method: 'PUT',
      requestData: salesforcePayload,
      responseData: salesforceResponse.data,
      statusCode: salesforceResponse.status,
      isSuccess: true,
      executionTime: Date.now() - startTime,
      quotepaymentId
    });
    
    // Create appropriate success message based on payment status
    const paymentStatusText = isSuccess ? 'successful payment' : 'failed payment';
    const salesforceMessage = `Salesforce has been notified of ${paymentStatusText} (Status: ${isSuccess})`;
    
    console.log(`🎉 ${salesforceMessage}`);

    return {
      success: true,
      data: salesforceResponse.data,
      message: salesforceMessage,
      payment_was_successful: isSuccess
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
      
      // Log failed API call with response
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: paymentData,
        responseData: error.response.data,
        statusCode: error.response.status,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.quotepaymentId
      });
      
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from Salesforce API';
      errorDetails = { request: error.request };
      console.error('❌ No response from Salesforce:', error.request);
      
      // Log failed API call without response
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: 'No response received',
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.quotepaymentId
      });
      
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request setup error: ${error.message}`;
      errorDetails = { message: error.message };
      console.error('❌ Request setup error:', error.message);
      
      // Log failed API call setup error
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.quotepaymentId
      });
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
  const startTime = Date.now();
  const endpoint = process.env.SALESFORCE_API_URL;
  
  try {
    console.log('🧪 Testing Salesforce API connection...');
    
    // First test the authentication
    const accessToken = await getSalesforceAccessToken();
    console.log('✅ Salesforce authentication successful');
    
    const testPayload = {
      QuotePaymentId: "TEST-" + Date.now(),
      Status: true,
      Paid_Amount: 1, // Simple integer
      Transaction_Number: "TEST-TRANSACTION-" + Date.now(),
      Message: "Test connection from VZAT payment system",
      // Next_due_date: new Date().toISOString().slice(0, 10),
      Payment_Type: "Test_payment"
    };

    const response = await axios.put(
      endpoint,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 15000 // 15 seconds timeout for test
      }
    );

    // Log successful test
    await logSalesforceApiCall({
      endpoint,
      method: 'PUT',
      requestData: testPayload,
      responseData: response.data,
      statusCode: response.status,
      isSuccess: true,
      executionTime: Date.now() - startTime,
      quotepaymentId: testPayload.QuotePaymentId
    });

    console.log('✅ Salesforce test connection successful');
    return {
      success: true,
      data: response.data,
      message: 'Salesforce API connection test successful'
    };

  } catch (error) {
    console.error('❌ Salesforce test connection failed:', error);
    
    let errorMessage = 'Salesforce API connection test failed';
    let errorDetails = {};

    if (error.response) {
      errorMessage = `Salesforce API error: ${error.response.status} - ${error.response.statusText}`;
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
      
      // Log failed test with response
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: { test: true },
        responseData: error.response.data,
        statusCode: error.response.status,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime
      });
      
    } else {
      errorDetails = { message: error.message };
      
      // Log failed test without response
      await logSalesforceApiCall({
        endpoint,
        method: 'PUT',
        requestData: { test: true },
        statusCode: 0,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime
      });
    }

    return {
      success: false,
      error: errorMessage,
      details: errorDetails,
      message: 'Salesforce API connection test failed'
    };
  }
};

/**
 * Call Salesforce API to update quote payment number
 * @param {Object} paymentData - Payment data containing QuotePaymentId
 * @returns {Object} - Result of the Salesforce API call
 */
export const updateQuotePaymentNumber = async (paymentData) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Calling Salesforce API to update quote payment number...');
    
    const {
      QuotePaymentId
    } = paymentData;

    // Prepare Salesforce request payload
    const requestBody = {
      QuotePaymentId: QuotePaymentId
    };

    console.log('📋 Salesforce request body:', JSON.stringify(requestBody, null, 2));

    // Get access token and instance URL
    const tokenResponse = await getSalesforceAccessToken();
    const { access_token, instance_url } = tokenResponse;
    
    // Build dynamic endpoint using instance URL
    const salesforceUrl = instance_url;
    const endpoint = `${salesforceUrl}/services/apexrest/updatequotepaymentnumber`;
    console.log('🔗 Salesforce endpoint:', endpoint);

    // Create config object for axios request
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      data: requestBody
    };

    // Make the API call to Salesforce
    const salesforceResponse = await axios.request(config);

    console.log('✅ Salesforce API response:', salesforceResponse.data);
    
    // Check if the response contains an error
    if (salesforceResponse.data && salesforceResponse.data.error) {
      console.error('❌ Salesforce returned an error:', salesforceResponse.data.error);
      
      // Log failed API call
      await logSalesforceApiCall({
        endpoint,
        method: 'GET',
        requestData: requestBody,
        responseData: salesforceResponse.data,
        statusCode: salesforceResponse.status,
        isSuccess: false,
        errorMessage: salesforceResponse.data.error,
        executionTime: Date.now() - startTime,
        quotepaymentId: QuotePaymentId
      });
      
      throw new Error(`Salesforce API returned error: ${salesforceResponse.data.error}`);
    }
    
    // Log successful API call
    await logSalesforceApiCall({
      endpoint,
      method: 'GET',
      requestData: requestBody,
      responseData: salesforceResponse.data,
      statusCode: salesforceResponse.status,
      isSuccess: true,
      executionTime: Date.now() - startTime,
      quotepaymentId: QuotePaymentId
    });
    
    const salesforceMessage = `Salesforce has been notified to update quote payment number for ${QuotePaymentId}`;
    console.log(`🎉 ${salesforceMessage}`);

    return {
      success: true,
      data: salesforceResponse.data,
      message: salesforceMessage
    };

  } catch (error) {
    console.error('❌ Error calling Salesforce API:', error);
    
    let errorMessage = 'Failed to update Salesforce quote payment number';
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
      
      // Log failed API call with response
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        responseData: error.response.data,
        statusCode: error.response.status,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
      
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from Salesforce API';
      errorDetails = { request: error.request };
      console.error('❌ No response from Salesforce:', error.request);
      
      // Log failed API call without response
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: 'No response received',
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
      
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request setup error: ${error.message}`;
      errorDetails = { message: error.message };
      console.error('❌ Request setup error:', error.message);
      
      // Log failed API call setup error
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
    }

    // Log the error but don't fail the payment processing
    console.error('⚠️ Salesforce quote payment number update failed, but payment processing will continue');

    return {
      success: false,
      error: errorMessage,
      details: errorDetails,
      message: 'Failed to update Salesforce quote payment number, but payment was processed'
    };
  }
};

/**
 * Call Salesforce API to get payment status and update payment schedule
 * @param {Object} paymentData - Payment data containing QuotePaymentId
 * @returns {Object} - Result of the Salesforce API call with payment schedule data
 */
export const getPaymentStatusAndUpdateSchedule = async (paymentData) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Calling Salesforce API to get payment status...');
    
    const {
      QuotePaymentId
    } = paymentData;

    // Prepare Salesforce request payload
    const requestBody = {
      QuotePaymentId: QuotePaymentId
    };

    console.log('📋 Salesforce request body:', JSON.stringify(requestBody, null, 2));

    // Get access token and instance URL
    const tokenResponse = await getSalesforceAccessToken();
    const { access_token, instance_url } = tokenResponse;
    
    // Build dynamic endpoint using instance URL
    const salesforceUrl = instance_url;
    const endpoint = `${salesforceUrl}/services/apexrest/updatequotepaymentnumber`;
    console.log('🔗 Salesforce endpoint:', endpoint);

    // Create config object for axios request
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      data: requestBody
    };

    // Make the API call to Salesforce
    const salesforceResponse = await axios.request(config);

    console.log('✅ Salesforce API response:', salesforceResponse.data);
    
    // Check if the response contains an error
    if (salesforceResponse.data && salesforceResponse.data.error) {
      console.error('❌ Salesforce returned an error:', salesforceResponse.data.error);
      
      // Log failed API call
      await logSalesforceApiCall({
        endpoint,
        method: 'GET',
        requestData: requestBody,
        responseData: salesforceResponse.data,
        statusCode: salesforceResponse.status,
        isSuccess: false,
        errorMessage: salesforceResponse.data.error,
        executionTime: Date.now() - startTime,
        quotepaymentId: QuotePaymentId
      });
      
      throw new Error(`Salesforce API returned error: ${salesforceResponse.data.error}`);
    }
    
    // Log successful API call
    await logSalesforceApiCall({
      endpoint,
      method: 'GET',
      requestData: requestBody,
      responseData: salesforceResponse.data,
      statusCode: salesforceResponse.status,
      isSuccess: true,
      executionTime: Date.now() - startTime,
      quotepaymentId: QuotePaymentId
    });
    
    const salesforceMessage = `Salesforce payment status retrieved successfully for ${QuotePaymentId}`;
    console.log(`🎉 ${salesforceMessage}`);

    return {
      success: true,
      data: salesforceResponse.data,
      message: salesforceMessage,
      paymentSchedule: salesforceResponse.data // Return the payment schedule array
    };

  } catch (error) {
    console.error('❌ Error calling Salesforce API:', error);
    
    let errorMessage = 'Failed to get payment status from Salesforce';
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
      
      // Log failed API call with response
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        responseData: error.response.data,
        statusCode: error.response.status,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
      
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from Salesforce API';
      errorDetails = { request: error.request };
      console.error('❌ No response from Salesforce:', error.request);
      
      // Log failed API call without response
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: 'No response received',
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
      
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request setup error: ${error.message}`;
      errorDetails = { message: error.message };
      console.error('❌ Request setup error:', error.message);
      
      // Log failed API call setup error
      await logSalesforceApiCall({
        endpoint: `${instance_url}/services/apexrest/updatequotepaymentnumber`,
        method: 'GET',
        requestData: paymentData,
        statusCode: 0,
        isSuccess: false,
        errorMessage: error.message,
        executionTime: Date.now() - startTime,
        quotepaymentId: paymentData.QuotePaymentId
      });
    }

    // Log the error but don't fail the payment processing
    console.error('⚠️ Salesforce payment status retrieval failed, but payment processing will continue');

    return {
      success: false,
      error: errorMessage,
      details: errorDetails,
      message: 'Failed to get payment status from Salesforce, but payment was processed'
    };
  }
};

/**
 * Clear the access token cache (useful for testing or when token issues occur)
 */
export const clearTokenCache = () => {
  accessTokenCache.token = null;
  accessTokenCache.expiresAt = null;
  console.log('🔄 Salesforce access token cache cleared');
};

export default {
  updateQuotePaymentStatus,
  updateQuotePaymentNumber,
  getPaymentStatusAndUpdateSchedule,
  testSalesforceConnection,
  clearTokenCache
};
