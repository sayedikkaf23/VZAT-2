
import qs from "querystring";

import VzatRecurringDataModel from "../model/VzatRecurringDataModel.js";
// Remove the import * as AWS from 'aws-sdk';
import fs from 'fs';
import mailgun from 'mailgun-js';

import CountryRisk from "../model/CountryRisk.js";

import axios from "axios";

import crypto from "crypto";
import { request } from "http";
import dotenv from "dotenv";
dotenv.config();


// Load AWS credentials and S3 bucket name from environment variables



// const mg = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: process.env.SMTP_SECURE ***REMOVED***= 'true', // Convert string to boolean
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
//   tls: {
//     ciphers: process.env.SMTP_CIPHERS,
//   }
// });

// Initialize Mailgun
const mailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN || 'vz.ae',
  fromEmail: process.env.SMTP_USER || 'payment@vz.ae'
};

let mailgunClient = null;
if (mailgunConfig.apiKey && mailgunConfig.domain) {
  try {
    mailgunClient = mailgun(mailgunConfig);
    console.log('✅ Mailgun client initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Mailgun client:', error);
  }
} else {
  console.warn('⚠️ Mailgun API key or domain not configured. Email functionality will be limited.');
}













export const callSalesforceEndpoint = async (req, res) => {
  const { firstName, lastName, nationality, dob, CustomerType, quotePaymentId} = req.body;



  try {
    // Step 1: Authenticate with the external API
    const authResponse = await axios.post(
      `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/authenticate`,
      {
        username: process.env.SCREENING_USERNAME,
        password: process.env.SCREENING_PASSWORD,
        CompanyName: process.env.SCREENING_COMPANYNAME
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const authToken = authResponse.data.token; // Assuming the token is in authResponse.data.token
// console.log(`${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/authenticate`)
    // Step 2: Get access token from Salesforce


    // Step 3: Make the HTTP POST request to the Salesforce endpoint
 

    // console.log(CustomerType,CustomerType == "C",CustomerType == "I")
    // Extract the Salesforce response data

    // Extract and use responseData safely

    
   

    // Step 4: Call the appropriate Screening API based on CustomerType
    let screeningResponse;
    if (CustomerType == "I") {
      // Call individual customer screening API
      screeningResponse = await axios.post(
          `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/Screening`,
        {
          UserId: 'ComplianceVZUAE',
          CompanyName: 'Virtuzone',
          CustomerId:quotePaymentId,
          CustomerType: CustomerType,
          FirstName: firstName,
          MiddleName: '',
          LastName: lastName,
          Gender: '',
          DOB: dob,
          NationalityISOList: [nationality],
          PlaceOfBirth: '',
          CustomerIdType: '',
          CustomerIdNumber: '',
          CustomerIdExpiry: '',
          MatchCategory: '',
          CompanyCode: '',
          SourceCode: '',
          ScreeningPreset: '',
          EmailIds: '',
          ReplyBackEmailIds: '',
          Threshold: 85,
          OtherParameters: {
            Header1: 'Value1',
            Header2: 'Value2',
            Header3: 'Value3',
            Header4: 'Value4',
            Header5: 'Value5',
          },
          Datasets: ['ALL'],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } else if (CustomerType == "C") {
      // Call corporate customer screening API
      const shareholders = req.body.shareholders || [ {
            "FirstName": "",
            "MiddleName": "",
            "LastName": "dawood ibrahim",
            "Nationality": "",
            "DOB": "",
            "Gender": "Male"
        },
        {
            "FirstName": "",
            "MiddleName": "",
            "LastName": "donald",
            "Nationality": "",
            "DOB": "",
            "Gender": "Female"
        }];

      const formattedShareholders = shareholders.map(shareholder => ({
        FirstName: shareholder.firstName || '',
        MiddleName: shareholder.middleName || '',
        LastName: shareholder.name || shareholder.lastName || '',
        Nationality: shareholder.nationalityshareholder || '',
        DOB: shareholder.dob || '',
        Gender: shareholder.gender || ''
      }));



      screeningResponse = await axios.post(
        `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/Screening`,
        {
          UserId: 'ComplianceVZUAE',
          CompanyName: 'Virtuzone',
          CustomerId: quotePaymentId,
          CustomerType: CustomerType,
          FirstName: firstName,
          MiddleName: '',
          LastName: lastName,
          Gender: '',
          DOB: dob,
          NationalityISOList: [nationality],
          PlaceOfBirth: '',
          CustomerIdType: '',
          CustomerIdNumber: '',
          CustomerIdExpiry: '',
          MatchCategory: '',
          CompanyCode: '',
          SourceCode: '',
          ScreeningPreset: '',
          EmailIds: '',
          ReplyBackEmailIds: '',
          Threshold: 85,
          OtherParameters: {
            Header1: 'Value1',
            Header2: 'Value2',
            Header3: 'Value3',
            Header4: 'Value4',
            Header5: 'Value5',
          },
          Datasets: ['ALL'],
          Shareholders: [{}],
          ShareHolderOptions: {
            Threshold: 80,
            Datasets: ['PEP-CURRENT', 'SAN', 'REL', 'DD']
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    }
console.log(`${process.env.EXTERNAL_API_SCREENING_URL}`)

    console.log('Screening Response:', screeningResponse.data);
    
    const { matchScore } = screeningResponse.data;
    // const newEmail = req.body.email.toLowerCase();
    // Step 5: Create a new Pidata document
 

    // Send a success MatchScoreProductService
    res.status(200).json({ message: 'Data saved successfully' ,screeningmatchScore:screeningResponse.data});
  } catch (error) {
    console.error('Error calling Salesforce endpoint:', error);
    res.status(500).json({ message: 'Error calling Salesforce endpoint', details: error.message || JSON.stringify(error)});
  }
};



export const checkStatus = async (req, res) => {
  // Destructure CustomerId and CompanyName from the request body
  const { CustomerId, CompanyName } = req.body;
 
  // Validate required fields
  if (!CustomerId) {
    return res.status(400).json({ 
      error: 'CustomerId is required',
      details: 'CustomerId is missing from request body'
    });
  }

  if (!CompanyName) {
    return res.status(400).json({ 
      error: 'CompanyName is required',
      details: 'CompanyName is missing from request body'
    });
  }
 
  try {
    // Step 1: Authenticate to get the token
    let authResponse;
    try {
      authResponse = await axios.post(
        `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/authenticate`,
        {
          username: 'VirtuLiveAPI',
          password: 'dkl890shscnzksj43ks',
          CompanyName: 'Virtuzone',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Authentication API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return res.status(error.response?.status || 500).json({
        error: 'Authentication failed',
        details: error.response?.data || error.message,
        step: 'authentication'
      });
    }
 
    const authToken = authResponse.data.token; // Assuming the token is in authResponse.data.token

    if (!authToken) {
      return res.status(500).json({
        error: 'Authentication token not received',
        details: 'Token is missing from authentication response',
        step: 'authentication'
      });
    }
 
    // Step 2: Call the status API with the provided payload from the request body
    let statusResponse;
    try {
      statusResponse = await axios.post(
        `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/status`,
        {
          CustomerId: CustomerId,
          CompanyName: CompanyName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Status API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        requestPayload: { CustomerId, CompanyName }
      });
      return res.status(error.response?.status || 500).json({
        error: 'Status API call failed',
        details: error.response?.data || error.message,
        step: 'status_check',
        requestPayload: { CustomerId, CompanyName }
      });
    }
 
    // Extract response data from the status API
    const statusData = statusResponse.data;
    
 
    // Step 3: Find the VzatRecurringDataModel entry using the LeadId in leadWithDetails to match CustomerId
    const pidata = await VzatRecurringDataModel.findOne({ afs_checkout_id: CustomerId });

 
    if (!pidata) {
      return res.status(404).json({ error: 'VzatRecurringDataModel not found' });
    }
 
    // Update the kycStatus field with the value from the API response
if (statusData.CustomerStatus == 'Auto Approved') {
  pidata.prepayment_screening = true;

  // 1. Validate Salesforce credentials before attempting OAuth
  const salesforceCredentials = {
    client_id: process.env.SALESFORCE_CLIENT_ID,
    client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    username: process.env.SALESFORCE_USERNAME,
    password: process.env.SALESFORCE_PASSWORD,
  };

  const missingCredentials = Object.entries(salesforceCredentials)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingCredentials.length > 0) {
    console.warn('⚠️ Missing Salesforce credentials:', missingCredentials);
    console.warn('⚠️ Skipping Salesforce update - continuing without it');
  } else {
    // 2. Get Salesforce OAuth token
    let TokenResponse;
    try {
      TokenResponse = await axios.post(
        `https://login.salesforce.com/services/oauth2/token`,
        null,
        {
          params: {
            client_id: salesforceCredentials.client_id,
            client_secret: salesforceCredentials.client_secret,
            grant_type: "password",
            username: salesforceCredentials.username,
            password: salesforceCredentials.password,
          },
        }
      );
    } catch (error) {
      console.error('Salesforce OAuth error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        errorCode: error.response?.data?.error,
        errorDescription: error.response?.data?.error_description
      });
      // Continue execution even if Salesforce fails - log but don't fail the whole request
      console.warn('⚠️ Salesforce OAuth failed, continuing without Salesforce update');
    }

    if (TokenResponse && TokenResponse.data) {
      const accessToken = TokenResponse.data.access_token;
      const saleforcUrl = TokenResponse.data.instance_url;

      if (accessToken && saleforcUrl) {
        // 3. Prepare request data
        const requestBodySalesforce = {
          opp_id: pidata.OpportunityId,               // From your `pidata` record
          compliance_status: pidata.compliance_clear,
          prepayment_status: pidata.prepayment_screening,
          qp_id: pidata.quotepaymentId,
        };

        console.log("requestBodySalesforce", requestBodySalesforce);
        // 4. Define endpoint
        const endpointUrl = `${saleforcUrl}/services/apexrest/updateComplianceStatus`;

        // 5. Make the PUT or POST request (check with your backend devs if it's POST or PUT)
        try {
          const salesforceResponse = await axios.put(endpointUrl, requestBodySalesforce, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          console.log("✅ Salesforce compliance update success:", salesforceResponse.data);
        } catch (error) {
          console.error("❌ Salesforce compliance update failed:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
          // Continue execution even if Salesforce update fails
        }
      }
    }
  }

  // 5. Save DB record
  await pidata.save();
}else {

   if (!pidata.opp_email) {
    return res
      .status(400)
      .json({ message: "Email is required"});
  }

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: pidata.opp_email,
    subject: "Your account is waiting for approval",
    html: `<!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
    
    <head>
      <title></title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
      <style>
        * {
          box-sizing: border-box;
        }
    
        body {
          margin: 0;
          padding: 0;
        }
    
        a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: inherit !important;
        }
    
        #MessageViewBody a {
          color: inherit;
          text-decoration: none;
        }
    
        p {
          line-height: inherit
        }
    
        .desktop_hide,
        .desktop_hide table {
          mso-hide: all;
          display: none;
          max-height: 0px;
          overflow: hidden;
        }
    
        .image_block img+div {
          display: none;
        }
    
        @media (max-width:620px) {
          .social_block.desktop_hide .social-table {
            display: inline-block !important;
          }
    
          .mobile_hide {
            display: none;
          }
    
          .row-content {
            width: 100% !important;
          }
    
          .stack .column {
            width: 100%;
            display: block;
          }
    
          .mobile_hide {
            min-height: 0;
            max-height: 0;
            max-width: 0;
            overflow: hidden;
            font-size: 0px;
          }
    
          .desktop_hide,
          .desktop_hide table {
            display: table !important;
            max-height: none !important;
          }
        }
      </style>
    </head>
    
    <body style="background-color: #ffffff; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
      <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
        <tbody>
          <tr>
            <td>
              <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tbody>
                  <tr>
                    <td>
                      <table class="row-content stack" align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px;" width="600">
                        <tbody>
                          <tr>
                            <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                              <table class="paragraph_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad">
                                    <div style="color:#000000;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:14px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:21px;">
                                      <p style="margin: 0; margin-bottom: 16px;">Hi&nbsp;,</p>
                                      <p style="margin: 0; margin-bottom: 16px;"> Thank you for uploading the required supporting documents. We are pleased to inform you that they are now under review.</p>
                                      <p style="margin: 0; margin-bottom: 16px;">We will send an email with the link for the payment once you got the approval</p>
                                     <br>
                                       <p style="margin: 0; margin-top: 24px; font-weight: bold;">Your Details:</p>
                                  <ul style="margin: 0; padding-left: 18px; margin-bottom: 16px;">
                                  <li>Quote Payment ID: <strong>${pidata.quotepaymentId}</strong></li>
                                    <li>Opportunity ID: <strong>${pidata.OpportunityId}</strong></li>
                                    <li>Email: <strong>${pidata.opp_email}</strong></li>
                                  </ul>
                                  <br>
                                      <p style="margin: 0;">Regards,</p>
                                      <p style="margin: 0;"></p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tbody>
                  <tr>
                    <td>
                      <table class="row-content stack" align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px;" width="600">
                        <tbody>
                          <tr>
                            <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 30px; padding-left: 20px; padding-right: 20px; padding-top: 30px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                              <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad" style="padding-bottom:20px;width:100%;padding-right:0px;padding-left:0px;">
                                    <div class="alignment" align="center" style="line-height:10px">
                                      <div style="max-width: 183px;"><a href="https://www.vz.ae" target="_blank" style="outline:none" tabindex="-1"><img src="https://res.cloudinary.com/dotkngkpl/image/upload/v1739944226/thumbnail_vz-ascentium_1_yrtbkn.png" style="display: block; height: auto; border: 0; width: 100%;" width="183"></a></div>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="social_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad" style="text-align:center;padding-right:0px;padding-left:0px;">
                                    <div class="alignment" align="center">
                                      <table class="social-table" width="276px" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;">
                                        <tr>
                                          <td style="padding:0 7px 0 7px;"><a href="https://www.facebook.com/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/facebook@2x.png" width="32" height="32" alt="Facebook" title="Facebook" style="display: block; height: auto; border: 0;"></a></td>
                                          <td style="padding:0 7px 0 7px;"><a href="https://twitter.com/Virtuzone_UAE" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/twitter@2x.png" width="32" height="32" alt="Twitter" title="Twitter" style="display: block; height: auto; border: 0;"></a></td>
                                          <td style="padding:0 7px 0 7px;"><a href="http://www.youtube.com/virtuzoneuae" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/youtube@2x.png" width="32" height="32" alt="YouTube" title="YouTube" style="display: block; height: auto; border: 0;"></a></td>
                                          <td style="padding:0 7px 0 7px;"><a href="http://www.instagram.com/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/instagram@2x.png" width="32" height="32" alt="Instagram" title="Instagram" style="display: block; height: auto; border: 0;"></a></td>
                                          <td style="padding:0 7px 0 7px;"><a href="http://www.linkedin.com/company/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/linkedin@2x.png" width="32" height="32" alt="LinkedIn" title="LinkedIn" style="display: block; height: auto; border: 0;"></a></td>
                                          <td style="padding:0 7px 0 7px;"><a href="https://www.vz.ae/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/website@2x.png" width="32" height="32" alt="Web Site" title="Web Site" style="display: block; height: auto; border: 0;"></a></td>
                                        </tr>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="text_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;">
                                    <div style="font-family: sans-serif">
                                      <div class style="font-size: 12px; font-family: Arial, Helvetica, sans-serif; mso-line-height-alt: 18px; color: #000000; line-height: 1.5;">
                                        <p style="margin: 0; text-align: center; mso-line-height-alt: 18px;"><a href="https://g.page/virtuzone?share" target="_blank" style="text-decoration: underline; color: #000000;" rel="noopener">Office 404, Al Saaha Office, Building B, Souk Al Bahar, Old Town Island,<br>Burj Khalifa District, Dubai - UAE</a></p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table><!-- End -->
    </body>
    
    </html>
    `,
  };

   try {
     if (!mailgunClient) {
       throw new Error('Mailgun client not initialized');
     }
     const result = await mailgunClient.messages().send(mailData);
     console.log('✅ Email sent successfully to:', pidata.opp_email, 'Message ID:', result.id);
   } catch (emailError) {
     console.error('❌ Email sending failed:', {
       message: emailError.message,
       to: pidata.opp_email,
       error: emailError
     });
     // Continue execution even if email fails - don't fail the whole request
   }
  
}

 
    res.status(200).json({
      message: 'Status retrieved and VzatRecurringDataModel updated successfully',
      data: statusData,
    });
 
  } catch (error) {
    console.error('Error retrieving or updating status:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });

    // If it's an axios error with response, use that status code
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data || error.message;

    res.status(statusCode).json({
      error: 'Error retrieving or updating status',
      details: errorDetails,
      message: error.message
    });
  }
};



















export const getAllCountryRisks = async (_, res) => {
  const countries = await CountryRisk.find();
  res.json(countries);
};


function resolvePaymentURL(pi, quotePaymentId, bodyBase) {
  if (pi.paymentURL) return pi.paymentURL;
  const base =
    bodyBase ||
    process.env.REDIRECT_DOMAIN || // e.g. https://pay.example.com/pay
    "";
  return base ? `${base.replace(/\/+$/,"")}/onlinepayment/${encodeURIComponent(quotePaymentId)}` : null;
}

// Helper function to send email via Mailgun
async function sendEmailViaMailgun(mailData) {
  if (!mailgunClient) {
    throw new Error('Mailgun client not initialized');
  }

  const mailgunData = {
    from: mailData.from || `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: Array.isArray(mailData.to) ? mailData.to.join(', ') : mailData.to,
    subject: mailData.subject,
    html: mailData.html,
    ...(mailData.cc && { cc: Array.isArray(mailData.cc) ? mailData.cc.join(', ') : mailData.cc }),
    ...(mailData.bcc && { bcc: Array.isArray(mailData.bcc) ? mailData.bcc.join(', ') : mailData.bcc }),
    ...(mailData.attachment && { attachment: mailData.attachment })
  };

  const result = await mailgunClient.messages().send(mailgunData);
  return { messageId: result.id || result.message, accepted: [mailgunData.to], rejected: [] };
}

function buildSubject(pi) {
  return `Virtuzone | Proforma Invoice & Payment Link – PI ${pi.quotePaymentName || ""}`;
}

// Your provided HTML (unchanged), with pi mapped to newQuote/newData and paymentURL injected
function buildEmailHTML(pi, paymentURL) {
  const newQuote = pi;
  const newData = pi;
  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *{box-sizing:border-box}body{margin:0;padding:0}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}
    #MessageViewBody a{color:inherit;text-decoration:none}
    p{line-height:inherit}
    .desktop_hide,.desktop_hide table{mso-hide:all;display:none;max-height:0;overflow:hidden}
    .image_block img+div{display:none}
    @media(max-width:620px){
      .social_block.desktop_hide .social-table{display:inline-block!important}
      .mobile_hide{display:none}
      .row-content{width:100%!important}
      .stack .column{width:100%;display:block}
      .mobile_hide{min-height:0;max-height:0;max-width:0;overflow:hidden;font-size:0}
      .desktop_hide,.desktop_hide table{display:table!important;max-height:none!important}
    }
  </style>
</head>
<body style="background-color:#ffffff;margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;">
  <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;">
    <tbody><tr><td>
      <table class="row row-1" align="center" width="100%" role="presentation"><tbody><tr><td>
        <table class="row-content stack" align="left" role="presentation" style="color:#000;width:600px;" width="600"><tbody><tr>
          <td class="column column-1" width="100%" style="padding:5px 0;vertical-align:top;">
            <table width="100%" role="presentation"><tr><td>
              <div style="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:150%;text-align:left;">
                <p style="margin:0 0 16px;">Hello ${newQuote.contactName || "Customer"},</p>
                <p style="margin:0 0 16px;">This is a gentle reminder that payment for your Proforma Invoice is still pending.</p>
                <p style="margin:0 0 16px;">For your convenience, you can complete the payment using the secure link below:</p>
            
              <p style="margin:0 0 16px;"><a href="${paymentURL}" style="text-decoration:underline;color:#7747FF;">${paymentURL}</a></p>
          
              </div>
            </td></tr></table>
          </td>
        </tr></tbody></table>
      </td></tr></tbody></table>

    

      

      <table class="row row-6" align="center" width="100%" role="presentation"><tbody><tr><td>
        <table class="row-content stack" align="left" role="presentation" style="color:#000;width:600px;" width="600"><tbody><tr><td style="padding:5px 0;">
          <div style="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:150%;text-align:left;">
            <p style="margin:0;padding-top:10px;">You may also click on the below button to view the payment options available to you.</p>
          </div>
    

          <div style="color:#000;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:150%;text-align:left;">
            <p style="margin:0;">If you have already made the payment by other means, please disregard this message.</p>
          </div>
          <br><p style="margin:0;font-size:14px;">We look forward to proceeding with your services as soon as payment is received. If you have any questions or require assistance, please let us know.</p><br>
          <p style="margin:0;font-size:14px;">Kind regards,</p>
          <p style="margin:0;font-size:14px;">${newData.opportunityOwnerName || "Virtuzone Team"}</p>
        </td></tr></tbody></table>
      </td></tr></tbody></table>
  <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
      <tbody>
          <tr>
              <td>
                  <table class="row-content stack" align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px;" width="600">
                      <tbody>
                          <tr>
                              <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 30px; padding-left: 20px; padding-right: 20px; padding-top: 30px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                  <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                      <tr>
                                          <td class="pad" style="padding-bottom:20px;width:100%;padding-right:0px;padding-left:0px;">
                                              <div class="alignment" align="center" style="line-height:10px">
                                                  <div style="max-width: 183px;"><a href="https://www.vz.ae" target="_blank" style="outline:none" tabindex="-1"><img src="https://res.cloudinary.com/dotkngkpl/image/upload/v1739944226/thumbnail_vz-ascentium_1_yrtbkn.png" style="display: block; height: auto; border: 0; width: 100%;" width="183"></a></div>
                                              </div>
                                          </td>
                                      </tr>
                                  </table>
                                  <table class="social_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                      <tr>
                                          <td class="pad" style="text-align:center;padding-right:0px;padding-left:0px;">
                                              <div class="alignment" align="center">
                                                  <table class="social-table" width="276px" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;">
                                                      <tr>
                                                          <td style="padding:0 7px 0 7px;"><a href="https://www.facebook.com/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/facebook@2x.png" width="32" height="32" alt="Facebook" title="Facebook" style="display: block; height: auto; border: 0;"></a></td>
                                                          <td style="padding:0 7px 0 7px;"><a href="https://twitter.com/Virtuzone_UAE" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/twitter@2x.png" width="32" height="32" alt="Twitter" title="Twitter" style="display: block; height: auto; border: 0;"></a></td>
                                                          <td style="padding:0 7px 0 7px;"><a href="http://www.youtube.com/virtuzoneuae" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/youtube@2x.png" width="32" height="32" alt="YouTube" title="YouTube" style="display: block; height: auto; border: 0;"></a></td>
                                                          <td style="padding:0 7px 0 7px;"><a href="http://www.instagram.com/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/instagram@2x.png" width="32" height="32" alt="Instagram" title="Instagram" style="display: block; height: auto; border: 0;"></a></td>
                                                          <td style="padding:0 7px 0 7px;"><a href="http://www.linkedin.com/company/virtuzone" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/linkedin@2x.png" width="32" height="32" alt="LinkedIn" title="LinkedIn" style="display: block; height: auto; border: 0;"></a></td>
                                                          <td style="padding:0 7px 0 7px;"><a href="https://www.vz.ae/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/website@2x.png" width="32" height="32" alt="Web Site" title="Web Site" style="display: block; height: auto; border: 0;"></a></td>
                                                      </tr>
                                                  </table>
                                              </div>
                                          </td>
                                      </tr>
                                  </table>
                                  <table class="text_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                      <tr>
                                          <td class="pad" style="padding-left:10px;padding-right:10px;padding-top:10px;">
                                              <div style="font-family: sans-serif">
                                                  <div class style="font-size: 12px; font-family: Arial, Helvetica, sans-serif; mso-line-height-alt: 18px; color: #000000; line-height: 1.5;">
                                                      <p style="margin: 0; text-align: center; mso-line-height-alt: 18px;"><a href="https://g.page/virtuzone?share" target="_blank" style="text-decoration: underline; color: #000000;" rel="noopener">Office 404, Al Saaha Office, Building B, Souk Al Bahar, Old Town Island,<br>Burj Khalifa District, Dubai - UAE</a></p>
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>
                                  </table>
                              </td>
                          </tr>
                      </tbody>
                  </table>
              </td>
          </tr>
      </tbody>
  </table>
  </td>
  </tr>
  </tbody>
  </table>
      <!-- Footer/social kept as in your template if needed -->
    </td></tr></tbody>
  </table>
</body>
</html>`;
}







// export { AddCashCounter };
// export { AddBankTransfer };
// export { convertCurrency };
// export { AddCashMachin };
// export { AddCashDeposit };
// export { AddChequeDeposit };
// export { getSidebarData };
