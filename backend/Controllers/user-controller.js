// const BankTransfer = require("../model/BankTransferModel");
const Decimal = require('decimal.js'); // Install the library if needed
const mailgun = require('mailgun-js');
const qs     = require("querystring");

const { validationResult } = require("express-validator");
const PiData = require("../model/PiData");
const AWS = require('aws-sdk'); // Remove the import * as AWS from 'aws-sdk';
const fs = require('fs');
const nodemailer = require("nodemailer");

const CountryRisk = require("../model/CountryRisk");

const axios = require("axios");

const crypto = require("crypto");
const { request } = require("http");
require("dotenv").config();
const stripe = require("stripe")(
  ***REMOVED***
);

// Load AWS credentials and S3 bucket name from environment variables
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.AWS_REGION_NAME;
const s3BucketName = process.env.S3_BUCKET_NAME;

const s3 = new AWS.S3({
  accessKeyId: awsAccessKeyId,
  secretAccessKey: awsSecretAccessKey,
  region: awsRegion,
});

const DOMAIN = process.env.MAILGUN_DOMAIN || "vz.ae";

const mg = mailgun({ 
  apiKey: ***REMOVED***, 
  domain: DOMAIN 
});

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

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || process.env.SMTP_USER,
    pass: process.env.GMAIL_PASSWORD || process.env.SMTP_PASS,
  },
});













exports.callSalesforceEndpoint = async (req, res) => {
  // Destructure fields from the request body
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
 

    // console.log(CustomerType,CustomerType ***REMOVED*** "C",CustomerType ***REMOVED*** "I")
    // Extract the Salesforce response data

    // Extract and use responseData safely

    
   

    // Step 4: Call the appropriate Screening API based on CustomerType
    let screeningResponse;
    if (CustomerType ***REMOVED*** "I") {
      // Call individual customer screening API
      screeningResponse = await axios.post(
          `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/Screening`,
        {
          UserId: 'ComplianceUAT',
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
    } else if (CustomerType ***REMOVED*** "C") {
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
          UserId: 'ComplianceUAT',
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



exports.checkStatus = async (req, res) => {
  // Destructure CustomerId and CompanyName from the request body
  const { CustomerId, CompanyName } = req.body;
 
  try {
    // Step 1: Authenticate to get the token
    const authResponse = await axios.post(
      `${process.env.EXTERNAL_API_SCREENING_URL}/api/customer/authenticate`,
      {
        username: 'VirtuUAT',
        password: 'VirtuApiuat@123',
        CompanyName: 'Virtuzone',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
 
    const authToken = authResponse.data.token; // Assuming the token is in authResponse.data.token
 
    // Step 2: Call the status API with the provided payload from the request body
    const statusResponse = await axios.post(
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
 
    // Extract response data from the status API
    const statusData = statusResponse.data;
    
 
    // Step 3: Find the Pidata entry using the LeadId in leadWithDetails to match CustomerId
    const pidata = await PiData.findOne({ quotePaymentId: CustomerId });

 
    if (!pidata) {
      return res.status(404).json({ error: 'Pidata not found' });
    }
 
    // Update the kycStatus field with the value from the API response
if (statusData.CustomerStatus ***REMOVED***= 'Auto Approved') {
  pidata.prepayment_screening = true;

  // 1. Get Salesforce OAuth token
  const TokenResponse = await axios.post(
    `https://test.salesforce.com/services/oauth2/token`,
    null,
    {
      params: {
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        grant_type: "password",
        username: process.env.SALESFORCE_USERNAME,
        password: process.env.SALESFORCE_PASSWORD,
      },
    }
  );

  const accessToken = TokenResponse.data.access_token;
  const saleforcUrl = TokenResponse.data.instance_url;

  // 2. Prepare request data
  const requestBodySalesforce = {
    opp_id: pidata.oppurtunityId,               // From your `pidata` record
    compliance_status: pidata.compliance_clear,
    prepayment_status: pidata.prepayment_screening,
    qp_id: pidata.quotePaymentId,
  };

  console.log("requestBodySalesforce",requestBodySalesforce)
  // 3. Define endpoint
  const endpointUrl = `${saleforcUrl}/services/apexrest/updateComplianceStatus`;

  // 4. Make the PUT or POST request (check with your backend devs if it's POST or PUT)
  await axios
    .put(endpointUrl, requestBodySalesforce, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      console.log("✅ Salesforce compliance update success:", response.data);
    })
    .catch((error) => {
      console.error("❌ Salesforce compliance update failed:", error?.response?.data || error.message);
    });

  // 5. Save DB record
  await pidata.save();
}else {

   if (!pidata.userEmailId) {
    return res
      .status(400)
      .json({ message: "Email is required"});
  }

  const data = {
    from: process.env.GMAIL_USER || process.env.SMTP_USER,
    to: pidata.userEmailId,
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
                                    <li>Quote Payment ID: <strong>${pidata.quotePaymentId}</strong></li>
                                    <li>Opportunity ID: <strong>${pidata.oppurtunityId}</strong></li>
                                    <li>Email: <strong>${pidata.email}</strong></li>
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
                                      <div style="max-width: 183px;"><a href="https://www.vz.ae" target="_blank" style="outline:none" tabindex="-1"><img src="assets/images/vz_logo.png" style="display: block; height: auto; border: 0; width: 100%;" width="183"></a></div>
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

   await mailTransporter.sendMail(data); // Added `await`
  
}

 
    res.status(200).json({
      message: 'Status retrieved and Pidata updated successfully',
      data: statusData,
    });
 
  } catch (error) {
    console.error('Error retrieving or updating status:', error);

    res.status(500).json({
      error: 'Error retrieving or updating status',
      details: error.message,
    });
  }
};

const checkQuoteIdExists = async (req, res) => {
  const { quoteId } = req.params;

  try {
    const tokenResponse = await axios.post(
      'https://test.salesforce.com/services/oauth2/token',
      null,
      {
        params: {
          client_id: process.env.SALESFORCE_CLIENT_ID,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET,
          grant_type: 'password',
          username: process.env.SALESFORCE_USERNAME,
          password: process.env.SALESFORCE_PASSWORD,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const saleforcUrl = tokenResponse.data.instance_url;


    const sfEndpoint = `${saleforcUrl}/services/apexrest/VZAR_CheckPaymentLink`;
    const requestBody = [
      quoteId
    ];

    const sfResponse = await axios.post(sfEndpoint, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("sfResponse",sfResponse.data)

    // Check if the response contains any data
    if (sfResponse.data && sfResponse.data.length > 0) {
      const firstPayment = sfResponse.data[0];
      const isActive = firstPayment.isActive;

      // Handle the isActive value as needed
      console.log(`isActive...: ${isActive}`);

      // Respond to the client based on the isActive value
      res.status(200).json({ isActive });
    } else {
      // If the response is empty or does not contain the expected data
      console.log('Invalid response from Salesforce endpoint');
      res.status(500).json({ error: 'Invalid response from Salesforce endpoint' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while checking quoteId.' });
  }
};

const convertCurrency = async (req, res) => {
  const xeApiUsername = process.env.XE_API_USERNAME;
  const xeApiPassword = process.env.XE_API_PASSWORD;

  const { fromCurrency, toCurrency, amount } = req.body;

  if (fromCurrency ***REMOVED***= toCurrency) {
    return res.json({ convertedAmount: amount });
  }

  // Skip XE API call if converting from AED to USD, directly use custom logic
  if (fromCurrency ***REMOVED***= "AED" && toCurrency ***REMOVED***= "USD") {
    console.log("✅ Skipping XE API call and using custom rate for AED to USD");
    const conversionRate = 1 / 3.65; // Fixed rate for AED to USD
    const customConvertedAmount = new Decimal(amount)
      .mul(new Decimal(conversionRate))
      .toDecimalPlaces(2, Decimal.ROUND_DOWN)  // 👈 round down
      .toNumber();
    return res.json({ convertedAmount: customConvertedAmount });
  }

  const url = `${process.env.XE_API_BASE_URL}/convert_from?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`;
  const auth = { username: xeApiUsername, password: xeApiPassword };

  try {
    const response = await axios.get(url, { auth });
    const convertedAmount = response.data.to[0].mid;
    return res.json({ convertedAmount });
  } catch (error) {
    console.log(error);
    // Handle specific error from the external API
    if (error.response && error.response.data && error.response.data.code ***REMOVED***= 9) {
      // Custom conversion logic for when XE API fails for other currencies
      console.log("Custom conversion worked (XE API error)");

      const conversionRate = rates[fromCurrency]?.[toCurrency];

      if (conversionRate) {
        console.log(`✅ Using custom rate for ${fromCurrency} to ${toCurrency}: ${conversionRate}`);
        const customConvertedAmount = new Decimal(amount)
          .mul(new Decimal(conversionRate))
          .toDecimalPlaces(2, Decimal.ROUND_DOWN)  // 👈 round down
          .toNumber();
        return res.json({ convertedAmount: customConvertedAmount });
      } else {
        console.error("No custom rate found for the currencies.");
        return res.status(400).json({ error: "No conversion rate available for the given currencies." });
      }
    }

    // Handle other errors
    console.error("Error fetching conversion rate:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};















exports.getAllCountryRisks = async (_, res) => {
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

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || process.env.SMTP_USER,
      pass: process.env.GMAIL_PASSWORD || process.env.SMTP_PASS,
    },
  });
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


async function sendProformaEmails(req, res) {
  try {
    const ids = req.body?.quotePaymentIds;
    const replyTo = req.body?.replyTo || "monish@yeepeey.com";
    const paymentUrlBase = req.body?.paymentUrlBase;

    if (!ids || (Array.isArray(ids) && ids.length ***REMOVED***= 0)) {
      return res.status(400).json({ error: "quotePaymentIds is required (array or string)" });
    }
    const quotePaymentIds = Array.isArray(ids) ? ids : [ids];

    const transporter = createTransporter();
    const results = [];

    for (const quotePaymentId of quotePaymentIds) {
      try {
        const pi = await PiData.findOne({ quotePaymentId }).lean();
        if (!pi) {
          results.push({ quotePaymentId, status: "skipped", reason: "PiData not found" });
          continue;
        }

        // recipient logic
        const to = pi.quoteEmail || pi.contactEmail;
        const cc = "sayedikkaf@gmail.com";
        if (!to) {
          results.push({ quotePaymentId, status: "skipped", reason: "No recipient email (quoteEmail/contactEmail missing)" });
          continue;
        }

        // payment link
        const paymentURL = resolvePaymentURL(pi, quotePaymentId, paymentUrlBase);
        if (!paymentURL) {
          results.push({ quotePaymentId, status: "skipped", reason: "No payment URL (none on record and no base provided)" });
          continue;
        }

        const html = buildEmailHTML(pi, paymentURL);
        const info = await transporter.sendMail({
          from: process.env.SMTP_USER,
          to,
          cc,
          bcc:"mishal@yeepeey.com",
          replyTo,
          subject: buildSubject(pi),
          html,
        });

        results.push({ quotePaymentId, status: "sent", messageId: info.messageId });
      } catch (err) {
        results.push({ quotePaymentId, status: "error", reason: err?.message || "Unknown error" });
      }
    }

    return res.json({
      total: quotePaymentIds.length,
      sent: results.filter(r => r.status ***REMOVED***= "sent").length,
      skipped: results.filter(r => r.status ***REMOVED***= "skipped").length,
      errors: results.filter(r => r.status ***REMOVED***= "error").length,
      results,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Internal server error" });
  }
}

exports.getPaymentStatus = async (req, res) => {
  try {
    const { resourcePath } = req.query; // comes encoded in URL

    if (!resourcePath) {
      return res.status(400).json({ message: "resourcePath is required" });
    }

    const url = `https://eu-test.oppwa.com${resourcePath}`;

    const { data } = await axios.get(url, {
      params: { entityId: process.env.ENTITY_ID },
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
      timeout: 10000,
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("Payment status error →", err?.response?.data || err.message);
    return res.status(500).json({ message: "Failed to fetch payment status" });
  }
};

exports.payNow = payNow;
exports.checkQuoteIdExists = checkQuoteIdExists;
exports.sendProformaEmails = sendProformaEmails;
exports.AddCashCounter = AddCashCounter;
exports.AddBankTransfer = AddBankTransfer;
exports.convertCurrency = convertCurrency;
exports.AddCashMachin = AddCashMachin;
exports.AddCashDeposit = AddCashDeposit;
exports.AddChequeDeposit = AddChequeDeposit;
exports.getSidebarData = getSidebarData;
exports.payNowSaleforce = payNowSaleforce;
exports.payNowByStripe = payNowByStripe;