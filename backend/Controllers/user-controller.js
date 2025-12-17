import { connectDB } from '../config/db.js';
import CountryRisk from '../model/CountryRisk.js';
import axios from 'axios';
import dotenv from 'dotenv';
// import envConfig from '../config.env.js';

dotenv.config();

/**
 * Get all country risks
 */
export const getAllCountryRisks = async (req, res) => {
  await connectDB();

  try {
    const countryRisks = await CountryRisk.find({}).sort({ country: 1 });
    
    return res.status(200).json({
      success: true,
      data: countryRisks,
      count: countryRisks.length
    });
  } catch (error) {
    console.error('❌ Error fetching country risks:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Call Salesforce digicomplice endpoint
 * This endpoint performs customer screening/compliance checks
 */
export const callSalesforceEndpoint = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      nationality,
      dob,
      CustomerType,
      quotePaymentId
    } = req.body;

    // Validate required fields
    if (!firstName || !nationality || !CustomerType || !quotePaymentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, nationality, CustomerType, and quotePaymentId are required'
      });
    }

    // Get Salesforce access token
    const salesforceLoginUrl = process.env.SALESFORCE_LOGIN_URL || 
                                process.env.SALESFORCE_URL?.replace(/\/$/, '') || 
                                'https://login.salesforce.com';
    
    console.log('🔄 Getting Salesforce access token for digicomplice...');
    
    const tokenResponse = await axios.post(
      `${salesforceLoginUrl}/services/oauth2/token`,
      null,
      {
        params: {
          grant_type: 'password',
          client_id: process.env.SALESFORCE_CLIENT_ID || envConfig.SALESFORCE_CLIENT_ID,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET || envConfig.SALESFORCE_CLIENT_SECRET,
          username: process.env.SALESFORCE_USERNAME || envConfig.SALESFORCE_USERNAME,
          password: (process.env.SALESFORCE_PASSWORD || envConfig.SALESFORCE_PASSWORD || '') + 
                   (process.env.SALESFORCE_SECURITY_TOKEN || '')
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        proxy: false,
        timeout: 30000
      }
    );

    const { access_token, instance_url } = tokenResponse.data;
    console.log('✅ Salesforce access token obtained');

    // Prepare payload for digicomplice endpoint
    const digicomplicePayload = {
      firstName: firstName,
      lastName: lastName || '',
      nationality: nationality,
      dob: dob || '',
      CustomerType: CustomerType, // 'I' for Individual, 'C' for Corporate
      quotePaymentId: quotePaymentId
    };

    console.log('📡 Calling Salesforce digicomplice endpoint...', {
      instanceUrl: instance_url,
      payload: { ...digicomplicePayload, quotePaymentId: quotePaymentId }
    });

    // Call Salesforce digicomplice endpoint
    const salesforceResponse = await axios.post(
      `${instance_url}/services/apexrest/digicomplice`,
      digicomplicePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        proxy: false,
        timeout: 30000
      }
    );

    console.log('✅ Salesforce digicomplice response received');

    // Return the response in the format expected by frontend
    return res.status(200).json({
      success: true,
      ...salesforceResponse.data
    });

  } catch (error) {
    console.error('❌ Error calling Salesforce digicomplice endpoint:', error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to call Salesforce endpoint';

    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      details: error.response?.data || null
    });
  }
};

/**
 * Check customer status from Salesforce
 */
export const checkStatus = async (req, res) => {
  try {
    const {
      CustomerId,
      CompanyName
    } = req.body;

    // Validate required fields
    if (!CustomerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: CustomerId'
      });
    }

    // Get Salesforce access token
    const salesforceLoginUrl = process.env.SALESFORCE_LOGIN_URL || 
                                process.env.SALESFORCE_URL?.replace(/\/$/, '') || 
                                'https://login.salesforce.com';
    
    console.log('🔄 Getting Salesforce access token for checkStatus...');
    
    const tokenResponse = await axios.post(
      `${salesforceLoginUrl}/services/oauth2/token`,
      null,
      {
        params: {
          grant_type: 'password',
          client_id: process.env.SALESFORCE_CLIENT_ID || envConfig.SALESFORCE_CLIENT_ID,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET || envConfig.SALESFORCE_CLIENT_SECRET,
          username: process.env.SALESFORCE_USERNAME || envConfig.SALESFORCE_USERNAME,
          password: (process.env.SALESFORCE_PASSWORD || envConfig.SALESFORCE_PASSWORD || '') + 
                   (process.env.SALESFORCE_SECURITY_TOKEN || '')
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        proxy: false,
        timeout: 30000
      }
    );

    const { access_token, instance_url } = tokenResponse.data;
    console.log('✅ Salesforce access token obtained');

    // Prepare payload for checkStatus endpoint
    const statusPayload = {
      CustomerId: CustomerId,
      CompanyName: CompanyName || 'Virtuzone'
    };

    console.log('📡 Calling Salesforce checkStatus endpoint...', {
      instanceUrl: instance_url,
      payload: statusPayload
    });

    // Call Salesforce checkStatus endpoint
    const salesforceResponse = await axios.post(
      `${instance_url}/services/apexrest/checkStatus`,
      statusPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        proxy: false,
        timeout: 30000
      }
    );

    console.log('✅ Salesforce checkStatus response received');

    // Return the response in the format expected by frontend
    // Frontend expects: { data: { CustomerStatus: string } }
    return res.status(200).json({
      success: true,
      data: salesforceResponse.data
    });

  } catch (error) {
    console.error('❌ Error calling Salesforce checkStatus endpoint:', error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to check customer status';

    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage,
      details: error.response?.data || null
    });
  }
};