// import mailgun from 'mailgun-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to format numbers with thousand separators
const formatAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    return '0.00';
  }
  
  // Format with thousand separators and 2 decimal places
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Email configuration
const EMAIL_CONFIG = {
  sender: {
    email: process.env.SMTP_USER || 'payment@vz.ae',
    name: 'Recurring Payment System'
  },
  recipients: {
    business_team: process.env.BUSINESS_TEAM_EMAIL || 'saeedikkaf@gmail.com',
    operations_team: process.env.OPERATIONS_TEAM_EMAIL || 'saeedikkaf@gmail.com',
    devtech_team: process.env.DEVTECH_TEAM_EMAIL || 'dev.tech@vz.ae',
    ar_team: process.env.AR_TEAM_EMAIL || 'ar@virtuzone.com'
  }
};

const getDevTechBccEmail = () => process.env.DEV_TECH_BCC_EMAIL || 'sayed@yeepeey.com';

const getDevTechCcEmails = () => ['dev.tech@virtuzone.com', 'dev.tech@vz.ae'];

// Helper function to generate email footer
const getEmailFooter = () => {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #dee2e6; margin-top: 30px; padding-top: 20px;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <a href="https://www.vz.ae" target="_blank" style="outline: none;">
                  <img src="https://res.cloudinary.com/dotkngkpl/image/upload/v1739944226/thumbnail_vz-ascentium_1_yrtbkn.png" alt="Virtuzone" style="display: block; height: auto; border: 0; max-width: 183px;" width="183">
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="padding: 0 7px;">
                      <a href="https://www.facebook.com/virtuzone" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/facebook@2x.png" width="32" height="32" alt="Facebook" title="Facebook" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                    <td style="padding: 0 7px;">
                      <a href="https://twitter.com/Virtuzone_UAE" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/twitter@2x.png" width="32" height="32" alt="Twitter" title="Twitter" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                    <td style="padding: 0 7px;">
                      <a href="http://www.youtube.com/virtuzoneuae" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/youtube@2x.png" width="32" height="32" alt="YouTube" title="YouTube" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                    <td style="padding: 0 7px;">
                      <a href="http://www.instagram.com/virtuzone" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/instagram@2x.png" width="32" height="32" alt="Instagram" title="Instagram" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                    <td style="padding: 0 7px;">
                      <a href="http://www.linkedin.com/company/virtuzone" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/linkedin@2x.png" width="32" height="32" alt="LinkedIn" title="LinkedIn" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                    <td style="padding: 0 7px;">
                      <a href="https://www.vz.ae/" target="_blank">
                        <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-dark-gray/website@2x.png" width="32" height="32" alt="Web Site" title="Web Site" style="display: block; height: auto; border: 0;">
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 10px 20px;">
                <p style="margin: 0; font-size: 12px; color: #6c757d; line-height: 1.5;">
                  <a href="https://g.page/virtuzone?share" target="_blank" style="text-decoration: underline; color: #6c757d;">
                    Office 404, Al Saaha Office, Building B, Souk Al Bahar, Old Town Island,<br>Burj Khalifa District, Dubai - UAE
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

// Initialize Mailgun (COMMENTED OUT - Using Nodemailer for now)
// const mailgunConfig = {
//   apiKey: process.env.MAILGUN_API_KEY,
//   domain: process.env.MAILGUN_DOMAIN || 'vz.ae',
//   fromEmail: process.env.SMTP_USER || 'payment@vz.ae'
// };

// let mailgunClient = null;
// if (mailgunConfig.apiKey && mailgunConfig.domain) {
//   try {
//     mailgunClient = mailgun(mailgunConfig);
//     console.log('✅ Mailgun client initialized successfully');
//   } catch (error) {
//     console.error('❌ Error initializing Mailgun client:', error);
//   }
// } else {
//   console.warn('⚠️ Mailgun API key or domain not configured. Email functionality will be limited.');
// }

// Initialize Nodemailer
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mishalnunu@gmail.com",
    pass: "qgwlzriynfzukuwy",
  },
});

// Keep mailgunConfig for fromEmail reference
const mailgunConfig = {
  fromEmail: process.env.SMTP_USER || 'payment@vz.ae'
};

// Helper function to send email via Nodemailer (temporarily replacing Mailgun)
const sendEmailViaMailgun = async (mailData) => {
  if (!mailTransporter) {
    throw new Error('Nodemailer transporter not initialized');
  }

  // Convert to Nodemailer format
  const fromAddress = mailData.from?.address 
    ? `${mailData.from.name || 'Virtuzone'} <${mailData.from.address}>` 
    : mailData.from || `${EMAIL_CONFIG.sender.name} <${mailgunConfig.fromEmail}>`;

  const nodemailerData = {
    from: fromAddress,
    to: Array.isArray(mailData.to) ? mailData.to : mailData.to,
    subject: mailData.subject,
    html: mailData.html,
    ...(mailData.cc && { cc: Array.isArray(mailData.cc) ? mailData.cc : mailData.cc }),
    ...(mailData.bcc && { bcc: Array.isArray(mailData.bcc) ? mailData.bcc : mailData.bcc }),
    ...(mailData.attachment && { attachments: mailData.attachment })
  };

  console.log('📧 Sending email via Nodemailer:', {
    to: nodemailerData.to,
    cc: nodemailerData.cc || 'none',
    bcc: nodemailerData.bcc || 'none',
    subject: nodemailerData.subject
  });

  const result = await mailTransporter.sendMail(nodemailerData);
  console.log('✅ Email sent successfully. Message ID:', result.messageId);
  return { 
    messageId: result.messageId, 
    accepted: Array.isArray(nodemailerData.to) ? nodemailerData.to : [nodemailerData.to], 
    rejected: [] 
  };
};

/**
 * Send email notification for completed subscription
 */
export const sendSubscriptionCompletedEmail = async (subscriptionData) => {
  try {
    const {
      quotepaymentId,
      Quote_payment_number,
      OpportunityId,
      QuoteId,
      Total_After_VAT_Currency,
      InstallmentLeft,
      payments_completed,
      last_payment_date,
      contactName,
      opp_email,
      salesPersonDetails
    } = subscriptionData;

    // Send to both customer and business team
    const recipientList = [
      opp_email, // Customer email
      EMAIL_CONFIG.recipients.business_team, // Business team
      (salesPersonDetails && salesPersonDetails.salesPersonEmail) || undefined // Sales person
    ].filter(Boolean);

    const devTechCcEmails = getDevTechCcEmails();

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: recipientList,
      cc: devTechCcEmails,
      subject: `Subscription Successfully Completed - ${Quote_payment_number || quotepaymentId}`,
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
            .outlook-header { padding-left: 10px !important; padding-right: 20px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; font-family: Arial, sans-serif;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#28a745" style="padding: 20px; text-align: center;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">Subscription Successfully Completed</h1>
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#f8f9fa" style="padding: 20px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Dear ${contactName || 'Valued Customer'},</p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Congrat&#117;lations! We are pleased to inform you that your subscription with Virtuzone has been <strong>successfully completed</strong>.</p>
                      
                      <h2 style="margin: 20px 0 15px 0; font-size: 20px; color: #333333;">Subscription Summary</h2>
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; margin: 20px 0;">
                        <tr bgcolor="#e9ecef">
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 40%;">Quote Payment ID</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${Quote_payment_number || quotepaymentId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Opportunity ID</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${OpportunityId}</td>
                        </tr>
                        <tr bgcolor="#e9ecef">
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote ID</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${QuoteId}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Total Amount Paid</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>${Total_After_VAT_Currency} AED</strong></td>
                        </tr>
                        <tr bgcolor="#e9ecef">
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Total Installments</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${InstallmentLeft}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Payments Completed</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${payments_completed}</td>
                        </tr>
                        <tr bgcolor="#e9ecef">
                          <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Final Payment Date</td>
                          <td style="padding: 12px; border: 1px solid #dee2e6;">${last_payment_date ? new Date(last_payment_date).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      </table>
                      
                      <!-- Success Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#d4edda" style="border: 1px solid #c3e6cb; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h3 style="margin: 0 0 10px 0; color: #155724; font-size: 18px;">Payment Complete!</h3>
                            <p style="margin: 0; color: #155724; font-size: 14px; line-height: 1.6;">
                              All installment payments have been successfully processed. 
                              <strong>No further charges will be processed</strong> for this subscription.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Thank you for choosing Virtuzone for your corporate services. We appreciate your business and look forward to serving you in the future.</p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const result = await sendEmailViaMailgun(mailOptions);

    return { success: true, messageId: result.messageId, recipients: recipientList };
    
  } catch (error) {
    console.error('❌ Failed to send subscription completion email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send final renewal email to customer, devtech, and opp owner
 */
export const sendFinalRenewalEmail = async (data) => {
  try {
    const {
      quotepaymentId,
      Quote_payment_number,
      contactName,
      opp_email,
      opp_owner,
      payments_completed,
      InstallmentLeft,
      last_payment_date,
      salesPersonDetails
    } = data;

    // Safety check: only send if completed
    if (!InstallmentLeft || payments_completed < InstallmentLeft) {
      return { success: false, error: 'Subscription not completed yet' };
    }

    const subject = `Virtuzone | Your Corporate Service Term Is Ending – Let's Renew for Continued Success`;

    const oppOwnerEmail =
      salesPersonDetails?.salesPersonEmail ||
      (typeof opp_owner === 'string' && opp_owner.includes('@') ? opp_owner : undefined);

    const ccRecipients = [...getDevTechCcEmails()];
    if (oppOwnerEmail) {
      ccRecipients.push(oppOwnerEmail);
    }

    const devTechBccEmail = getDevTechBccEmail();

    const finalDate = last_payment_date ? new Date(last_payment_date) : new Date();
    const finalDateStr = finalDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const bodyHtml = `
      <!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
        <!--[if mso]>
        <style type="text/css">
          .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; font-family: Arial, sans-serif;">
                <tr>
                  <td style="padding: 20px;">
                    <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Dear ${contactName || 'Customer'},</p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">We hope this message finds you well.</p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">This is a gentle reminder that your current corporate service package with Virtuzone, is nearing the end of its term. Your final installment was successfully processed on <strong>${finalDateStr}</strong>.</p>
                    <p style="margin: 0 0 40px 0; font-size: 16px; color: #333333; line-height: 1.6;">We thank you sincerely for placing your trust in Virtuzone. Your corporate services consultant is added in CC to this e-mail to assist you with tailoring a new plan for next year that fits your current needs.</p>
                    <p style="margin: 40px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
                    
                    <!-- Footer -->
                    ${getEmailFooter()}
                    <!--[if mso]></div><![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: opp_email,
      ...(ccRecipients.length > 0 && { cc: ccRecipients }),
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject,
      html: bodyHtml
    };

    const result = await sendEmailViaMailgun(mailOptions);
    const recipients = {
      to: opp_email,
      cc: ccRecipients,
      bcc: devTechBccEmail ? [devTechBccEmail] : []
    };
    return { success: true, messageId: result.messageId, recipients };
  } catch (error) {
    console.error('❌ Failed to send final renewal email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment failure notification to customer, devtech, opp owner, and AR team
 */
export const sendPaymentFailureNotificationEmail = async (data) => {
  try {
    const {
      quotepaymentId,
      q_payment_id,
      contactName,
      opp_email,
      opp_owner,
      payment_amount,
      due_date,
      failure_reason,
      payment_link,
      salesPersonDetails
    } = data;

    const subject = `Action Required: Virtuzone | Payment Attempt Unsuccessful for Your Scheduled Installment`;
    
    const oppOwnerEmail =
      salesPersonDetails?.salesPersonEmail ||
      (typeof opp_owner === 'string' && opp_owner.includes('@') ? opp_owner : undefined);

    const ccRecipientsSet = new Set(
      [
        ...getDevTechCcEmails(),
        oppOwnerEmail,
        'maryia.vinahradava1@virtuzone.com',
        'arteam1@vz.ae'
      ].filter(Boolean)
    );
    const ccRecipients = Array.from(ccRecipientsSet);

    const devTechBccEmail = getDevTechBccEmail();

    const dueDateStr = due_date ? new Date(due_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';

    const reasonText = failure_reason || 'Payment processing failed';
    const paymentLinkButton = payment_link ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
        <tr>
          <td align="center" bgcolor="#dc3545" style="background-color: #dc3545; padding: 12px 24px;">
            <a href="${payment_link}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Click here to access your Customer Portal account</a>
          </td>
        </tr>
      </table>
    ` : '<p style="margin: 30px 0; text-align: center; font-size: 16px; color: #333333;">Please contact us for assistance accessing your Customer Portal account.</p>';

    const bodyHtml = `
      <!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
        <!--[if mso]>
        <style type="text/css">
          .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; font-family: Arial, sans-serif;">
                <tr>
                  <td style="padding: 20px;">
                    <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Dear ${contactName || 'Customer'},</p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">We hope you're doing well.</p>
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">This is to inform you that the scheduled payment for your Proforma Invoice <strong>#PI ${q_payment_id || quotepaymentId}</strong>, due on <strong>${dueDateStr}</strong>, could not be processed.</p>

                    <!-- Alert Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f8f9fa" style="border-left: 4px solid #dc3545; margin: 20px 0;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="margin: 0; font-size: 16px; color: #333333;"><strong>Amount:</strong> AED ${payment_amount || 'N/A'}</p>
                          <p style="margin: 5px 0 0 0; font-size: 16px; color: #333333;"><strong>Reason:</strong> ${reasonText}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">We kindly request you update your payment information to avoid service discontinuation:</p>

                    ${paymentLinkButton}

                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">You may also reply to this email should you need any assistance.</p>
                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Please note that timely payments help us ensure smooth continuation of your services without disruption.</p>
                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Thank you for your attention to this matter.</p>
                    <p style="margin: 40px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
                    
                    <!-- Footer -->
                    ${getEmailFooter()}
                    <!--[if mso]></div><![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: opp_email,
      ...(ccRecipients.length > 0 && { cc: ccRecipients }),
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject,
      html: bodyHtml
    };

    const result = await sendEmailViaMailgun(mailOptions);
    const recipients = {
      to: opp_email,
      cc: ccRecipients,
      bcc: devTechBccEmail ? [devTechBccEmail] : []
    };
    return { success: true, messageId: result.messageId, recipients };
  } catch (error) {
    console.error('❌ Failed to send payment failure notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send successful payment notification to customer, devtech, opp owner, and AR team
 */
export const sendPaymentSuccessNotificationEmail = async (data) => {
  try {
    const {
      quotepaymentId,
      q_payment_id,
      contactName,
      opp_email,
      opp_owner,
      payment_amount,
      payment_date,
      installment_number,
      total_installments,
      payment_method,
      salesPersonDetails,
      installmentSchedule // New parameter for payment schedule
    } = data;

    const subject = `Virtuzone | Payment Received`;
    
    const oppOwnerEmail =
      salesPersonDetails?.salesPersonEmail ||
      (typeof opp_owner === 'string' && opp_owner.includes('@') ? opp_owner : undefined);

    const ccRecipientsSet = new Set(
      [
        ...getDevTechCcEmails(),
        oppOwnerEmail,
        salesPersonDetails?.salesPersonEmail,
        'maryia.vinahradava1@virtuzone.com',
        'arteam1@vz.ae'
      ].filter(Boolean)
    );
    const ccRecipients = Array.from(ccRecipientsSet);

    const devTechBccEmail = getDevTechBccEmail();

    const paymentDateStr = payment_date ? new Date(payment_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const installmentText = installment_number && total_installments ? 
      `${installment_number} of ${total_installments}` : 
      'N/A';

    // Generate payment schedule table rows
    let paymentScheduleRows = '';
    if (installmentSchedule && Array.isArray(installmentSchedule)) {
      installmentSchedule.forEach((installment, index) => {
        const paymentDate = new Date(installment.date || installment.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Determine status and styling
        const isPaid = installment.status === 'paid' || installment.status === 'completed' || 
                      (installment_number && index + 1 <= installment_number);
        const statusText = isPaid ? 'Paid' : 'Pending';
        const statusColor = isPaid ? '#28a745' : '#6c757d';
        const rowBgColor = '#ffffff';
        
        paymentScheduleRows += `
          <tr style="background-color: ${rowBgColor};">
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${paymentDate}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatAmount(installment.amount || payment_amount)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
              <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </td>
          </tr>
        `;
      });
    } else {
      // Fallback if no schedule provided
      for (let i = 0; i < (total_installments || 1); i++) {
        const isPaid = installment_number && i + 1 <= installment_number;
        const statusText = isPaid ? 'Paid' : 'Pending';
        const statusColor = isPaid ? '#28a745' : '#6c757d';
        const rowBgColor = '#ffffff';

        // Derive a schedule date if possible: monthly from payment_date
        const baseDate = payment_date ? new Date(payment_date) : new Date();
        const installmentDateObj = new Date(baseDate);
        installmentDateObj.setMonth(installmentDateObj.getMonth() + i);
        const installmentDateStr = installmentDateObj.toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        
        paymentScheduleRows += `
          <tr style="background-color: ${rowBgColor};">
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${installmentDateStr}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatAmount(payment_amount)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
              <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </td>
          </tr>
        `;
      }
    }

    const bodyHtml = `
      <!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
        <!--[if mso]>
        <style type="text/css">
          .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; font-family: Arial, sans-serif;">
                <tr>
                  <td style="padding: 20px;">
                    <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Dear ${contactName || 'Customer'},</p>
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">We are pleased to confirm that your scheduled payment of <strong>AED ${formatAmount(payment_amount)}</strong> for your Proforma Invoice <strong>#PI ${q_payment_id || quotepaymentId}</strong> has been successfully processed on <strong>${paymentDateStr}</strong>.</p>

                    <!-- Payment Details Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 2px solid #6c757d; margin: 20px 0;">
                      <tr>
                        <td bgcolor="#f5f5f5" style="padding: 10px; border-bottom: 1px solid #6c757d;">
                          <h3 style="margin: 0; text-align: center; color: #6c757d; font-size: 18px;">Payment Details</h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 40%;">Invoice Number</td>
                              <td style="border: 1px solid #ddd; padding: 12px;">PI ${q_payment_id || quotepaymentId}</td>
                            </tr>
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Installment</td>
                              <td style="border: 1px solid #ddd; padding: 12px;">${installmentText}</td>
                            </tr>
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Amount Paid</td>
                              <td style="border: 1px solid #ddd; padding: 12px;"><strong>AED ${formatAmount(payment_amount)}</strong></td>
                            </tr>
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Date</td>
                              <td style="border: 1px solid #ddd; padding: 12px;">${paymentDateStr}</td>
                            </tr>
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Method</td>
                              <td style="border: 1px solid #ddd; padding: 12px;">${payment_method || 'Card'}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Payment Schedule Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 2px solid #6c757d; margin: 20px 0;">
                      <tr>
                        <td bgcolor="#f5f5f5" style="padding: 10px; border-bottom: 1px solid #6c757d;">
                          <h3 style="margin: 0; text-align: center; color: #6c757d; font-size: 18px;">Payment Schedule</h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                            <tr>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Installment No.</td>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Date</td>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Amount (AED)</td>
                              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Status</td>
                            </tr>
                            ${paymentScheduleRows}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Your continued support is greatly appreciated, and we remain committed to delivering a smooth and hassle-free service delivery.</p>
                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Should you have any questions or require further assistance, please feel free to reach out to us directly.</p>
                    <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Thank you once again for choosing Virtuzone.</p>
                    <p style="margin: 40px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
                    
                    <!-- Footer -->
                    ${getEmailFooter()}
                    <!--[if mso]></div><![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: opp_email,
      ...(ccRecipients.length > 0 && { cc: ccRecipients }),
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject,
      html: bodyHtml
    };

    const result = await sendEmailViaMailgun(mailOptions);
    const recipients = {
      to: opp_email,
      cc: ccRecipients,
      bcc: devTechBccEmail ? [devTechBccEmail] : []
    };
    return { success: true, messageId: result.messageId, recipients };
  } catch (error) {
    console.error('❌ Failed to send payment success notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification for payment failure
 */
// export const sendPaymentFailureEmail = async (failureData) => {
//   try {
//     const transporter = createTransporter();
    
//     const {
//       quotepaymentId,
//       OpportunityId,
//       QuoteId,
//       error_message,
//       payment_amount,
//       attempt_date,
//       payments_completed,
//       total_installments,
//       afs_response
//     } = failureData;

//     const mailOptions = {
//       from: {
//         name: EMAIL_CONFIG.sender.name,
//         address: EMAIL_CONFIG.sender.email
//       },
//       to: EMAIL_CONFIG.recipients.operations_team,
//       subject: `🚨 URGENT: Payment Failure - ${quotepaymentId}`,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
//             <h1>🚨 Payment Failure Alert</h1>
//           </div>
          
//           <div style="padding: 20px; background-color: #f8f9fa;">
//             <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
//               <h3 style="color: #721c24; margin-top: 0;">⚠️ Immediate Action Required</h3>
//               <p style="color: #721c24; margin-bottom: 0;">
//                 A recurring payment has failed and requires immediate attention from the operations team.
//               </p>
//             </div>
            
//             <h2>Payment Failure Details</h2>
            
//             <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
//               <tr style="background-color: #e9ecef;">
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote Payment ID</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;">${quotepaymentId}</td>
//               </tr>
//               <tr>
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Opportunity ID</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;">${OpportunityId}</td>
//               </tr>
//               <tr style="background-color: #e9ecef;">
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote ID</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;">${QuoteId}</td>
//               </tr>
//               <tr>
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Failed Amount</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;"><strong style="color: #dc3545;">${payment_amount} AED</strong></td>
//               </tr>
//               <tr style="background-color: #e9ecef;">
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Failure Date</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;">${attempt_date ? new Date(attempt_date).toLocaleString() : new Date().toLocaleString()}</td>
//               </tr>
//               <tr>
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Payment Progress</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6;">${payments_completed}/${total_installments} completed</td>
//               </tr>
//               <tr style="background-color: #e9ecef;">
//                 <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Error Message</td>
//                 <td style="padding: 12px; border: 1px solid #dee2e6; color: #dc3545;"><strong>${error_message}</strong></td>
//               </tr>
//             </table>
            
//             ${afs_response ? `
//             <h3>AFS Response Details</h3>
//             <div style="background-color: #f1f1f1; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; overflow-x: auto;">
//               <pre>${JSON.stringify(afs_response, null, 2)}</pre>
//             </div>
//             ` : ''}
            
//             <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
//               <h3 style="color: #856404; margin-top: 0;">📋 Recommended Actions</h3>
//               <ul style="color: #856404;">
//                 <li>Verify customer's payment method status</li>
//                 <li>Check if card has expired or insufficient funds</li>
//                 <li>Contact customer to update payment information</li>
//                 <li>Review AFS transaction logs for detailed error analysis</li>
//                 <li>Consider rescheduling payment or offering alternative payment methods</li>
//               </ul>
//             </div>
            
//             <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
//               <p style="color: #6c757d; font-size: 12px;">
//                 This is an automated alert from Recurring Payment System<br>
//                 Generated on: ${new Date().toLocaleString()}<br>
//                 Please address this issue promptly to maintain customer satisfaction.
//               </p>
//             </div>
//           </div>
//         </div>
//       `
//     };

//     const result = await transporter.sendMail(mailOptions);
//     return { success: true, messageId: result.messageId };
    
//   } catch (error) {
//     console.error('❌ Failed to send payment failure email:', error);
//     return { success: false, error: error.message };
//   }
// };

/**
 * Send PDF via email from Salesforce webhook
 */
export const sendPdfEmail = async (emailData) => {
  try {
    const {
      Quote_payment_number,
      Total_After_VAT_Currency,
      quote_email,
      quotepaymentId,
      paymentLink,
      Installment_amount,
      Total_Installments,
      quotePdf,
      contactName,
      opp_owner,
      salesPersonDetails,
      installmentSchedule // New parameter for dynamic payment schedule
    } = emailData;

    // Get base URL from environment
    const baseUrl = process.env.BASE_URL || 'https://vzatnew.yeepeey.com';
    
    // Construct payment link with proper base URL
    const fullPaymentLink = paymentLink.startsWith('http') ? paymentLink : `${baseUrl}${paymentLink.startsWith('/') ? '' : '/'}${paymentLink}`;

  // Process PDF attachments for Nodemailer (temporarily replacing Mailgun)
const attachments = [];

if (quotePdf && Array.isArray(quotePdf)) {
  for (const pdf of quotePdf) {
    if (pdf.pdfContent && pdf.name) {
      const cleanBase64 = pdf.pdfContent
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s/g, '');

      attachments.push({
        filename: `${pdf.name}.pdf`,
        content: Buffer.from(cleanBase64, 'base64'),
        contentType: 'application/pdf'
      });
    }
  }
}

    // Generate payment schedule table rows
    let paymentScheduleRows = '';
    if (installmentSchedule && Array.isArray(installmentSchedule)) {
      installmentSchedule.forEach((installment, index) => {
        const paymentDate = new Date(installment.date || installment.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        paymentScheduleRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${paymentDate}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatAmount(installment.amount || Installment_amount)}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${index === 0 ? 'Upfront Payment' : index === installmentSchedule.length - 1 ? 'Final Installment' : 'Monthly Installment'}</td>
          </tr>
        `;
      });
    } else {
      // Fallback if no schedule provided
      for (let i = 0; i < (Total_Installments || 1); i++) {
        paymentScheduleRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">TBD</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatAmount(Installment_amount || Total_After_VAT_Currency)}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${i === 0 ? 'Upfront Payment' : i === (Total_Installments - 1) ? 'Final Installment' : 'Monthly Installment'}</td>
          </tr>
        `;
      }
    }

    const salesPersonEmail = salesPersonDetails?.salesPersonEmail;
    const ccRecipients = [...getDevTechCcEmails()];
    if (salesPersonEmail) {
      ccRecipients.push(salesPersonEmail);
    }

    const devTechBccEmail = getDevTechBccEmail();

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: quote_email,
      ...(ccRecipients.length > 0 && { cc: ccRecipients }),
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject: `Virtuzone | Proforma Invoice & Payment Link – PI ${Quote_payment_number}`,
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="700" style="max-width: 700px; font-family: Arial, sans-serif;">
                  <tr>
                    <td style="padding: 20px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Hello ${contactName || 'Sir/Madam'},</p>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">Thank you for choosing Virtuzone as your preferred Corporate Services Provider.</p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Based on your requirements and our discussions, we are pleased to attach the Proforma Invoice along with the Payment Link embedded therein for your reference. A summary of the Proforma Invoice is as below:</p>
                      
                      <!-- Proforma Invoice Summary -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 2px solid #000000; margin: 20px 0;">
                        <tr>
                          <td bgcolor="#f5f5f5" style="padding: 10px; border-bottom: 1px solid #000000;">
                            <h3 style="margin: 0; text-align: center; font-size: 18px; color: #000000;">Proforma Invoice Summary</h3>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 40%;">Details</td>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Information</td>
                              </tr>
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px;">Quote Payment Number #</td>
                                <td style="border: 1px solid #ddd; padding: 12px;">PI ${Quote_payment_number || quotepaymentId}</td>
                              </tr>
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px;">Invoice Value with VAT</td>
                                <td style="border: 1px solid #ddd; padding: 12px;">AED ${formatAmount(Installment_amount)}</td>
                              </tr>
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px;">Total Amount</td>
                                <td style="border: 1px solid #ddd; padding: 12px;">AED ${formatAmount(Total_After_VAT_Currency)}</td>
                              </tr>
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px;">Payment Link</td>
                                <td style="border: 1px solid #ddd; padding: 12px;">
                                  <a href="${fullPaymentLink}" style="color: #007bff; text-decoration: none; word-break: break-all;">${fullPaymentLink}</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Payment Schedule -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 2px solid #000000; margin: 20px 0;">
                        <tr>
                          <td bgcolor="#f5f5f5" style="padding: 10px; border-bottom: 1px solid #000000;">
                            <h3 style="margin: 0; text-align: center; font-size: 18px; color: #000000;">Payment Schedule</h3>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                              <tr>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Installment No.</td>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Date</td>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Amount (AED)</td>
                                <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Type</td>
                              </tr>
                              ${paymentScheduleRows}
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">You may also click on the below button to proceed with payment.</p>
                      
                      <!-- Payment Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
                        <tr>
                          <td align="center" bgcolor="#dc3545" style="background-color: #dc3545; padding: 12px 24px;">
                            <a href="${fullPaymentLink}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Click Here To Pay</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Please feel free to contact us anytime in case you have any queries on this payment or the service(s) offered.</p>
                      <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">Thank you!</p>
                      <p style="margin: 40px 0 0 0; font-size: 16px; color: #333333; line-height: 1.6;">
                        Regards,<br>
                        ${(salesPersonDetails && salesPersonDetails.salesPersonName) || opp_owner || 'Rodney Raymond Lewis'}
                      </p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachment: attachments
    };

    const result = await sendEmailViaMailgun(mailOptions);
    console.log(`✅ PDF email sent successfully to ${quote_email}: ${result.messageId}`);
    return { success: true, messageId: result.messageId, recipient: quote_email };
    
  } catch (error) {
    console.error('❌ Failed to send PDF email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new customer with login credentials
 */
export const sendCustomerWelcomeEmail = async (customerData) => {

  console.log('📧 EMAIL SERVICE - Input data:', JSON.stringify(customerData, null, 2));
  
  try {
    console.log('📧 EMAIL SERVICE - Using Nodemailer...');
    
    const {
      customerName,
      email,
      temporaryPassword,
      quotepaymentId,
      loginUrl
    } = customerData;
    
    console.log('📧 EMAIL SERVICE - Extracted data:', {
      customerName,
      email,
      temporaryPassword: temporaryPassword ? '***' : 'MISSING',
      quotepaymentId,
      loginUrl
    });

    const devTechBccEmail = getDevTechBccEmail();
    const devTechCcEmails = getDevTechCcEmails();

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      cc: devTechCcEmails,
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject: 'Welcome to  Customer Portal - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 30px !important; }
            .outlook-header { padding-left: 10px !important; padding-right: 30px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; font-family: Arial, sans-serif; border: 1px solid #ddd;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#f8f9fa" style="padding: 30px; text-align: center; border-bottom: 3px solid #007bff;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <h1 style="margin: 0; font-size: 24px; color: #000000; font-weight: bold;">Welcome to Customer Portal!</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Your Customer Portal Account is Ready</p>
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#f9f9f9" style="padding: 30px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">
                        Dear <strong>${customerName}</strong>,
                      </p>
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">
                        Congratulations! Your first payment has been successfully processed, and we've created your customer portal account. 
                        You can now access your account to view payment schedules, manage services, and more.
                      </p>
                      
                      <!-- Credentials Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#ffffff" style="border: 2px solid #e3f2fd; margin: 25px 0;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">Your Login Credentials</h3>
                            <p style="margin: 10px 0; color: #333333; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 10px 0; color: #333333; font-size: 16px;"><strong>Temporary Password:</strong> <span style="background-color: #f5f5f5; padding: 4px 8px; font-family: monospace; color: #000000; font-weight: bold;">${temporaryPassword}</span></p>
                            <p style="margin: 10px 0; color: #333333; font-size: 16px;"><strong>Quote Payment ID:</strong> ${quotepaymentId}</p>
                            <p style="margin: 15px 0 5px 0; color: #333333; font-size: 16px;"><strong>Portal Login URL:</strong></p>
                            <p style="margin: 5px 0; word-break: break-all; color: #333333; font-size: 14px;"><a href="${loginUrl}" style="color: #007bff; text-decoration: underline;">${loginUrl}</a></p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Login Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
                        <tr>
                          <td align="center" bgcolor="#ff0000" style="background-color: #ff0000; padding: 15px 30px; border: 2px solid #ff0000;">
                            <a href="${loginUrl}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Login to Your Account</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Security Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#fff3cd" style="border: 1px solid #ffeaa7; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">Important Security Notice:</h4>
                            <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                              This is a temporary password. For your security, please change it immediately after your first login. 
                              You'll be prompted to create a new password when you sign in.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#e8f5e8" style="border: 1px solid #c3e6c3; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #2d5a2d; margin: 0 0 10px 0; font-size: 16px;">What You Can Do in Your Portal:</h4>
                            <ul style="color: #2d5a2d; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                              <li>View your payment schedules and due dates</li>
                              <li>Update your saved payment methods</li>
                              <li>Get help and support</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 30px 0 0 0;">
                        If you have any questions or need assistance, please don't hesitate to contact our support team. 
                        We're here to help you make the most of your Recurring experience.
                      </p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    console.log('📧 EMAIL SERVICE - Sending email...');
    console.log('📧 EMAIL SERVICE - Mail options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length || 0
    });
    
    const result = await sendEmailViaMailgun(mailOptions);
    
    console.log('📧 EMAIL SERVICE - Email sent successfully!');
    console.log('📧 EMAIL SERVICE - Result:', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
    
    return { success: true, messageId: result.messageId, recipient: email };
    
  } catch (error) {
    console.error('❌ 📧 EMAIL SERVICE - Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message, details: error };
  }
};

/**
 * Send email to existing customer with login reminder
 */
export const sendExistingCustomerEmail = async (customerData) => {
  try {
    const {
      customerName,
      email,
      quotepaymentId,
      existingQuotePaymentId,
      loginUrl
    } = customerData;

    const devTechBccEmail = getDevTechBccEmail();
    const devTechCcEmails = getDevTechCcEmails();

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      cc: devTechCcEmails,
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject: 'Welcome Back! Your Customer Portal account is Ready to Use',
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 30px !important; }
            .outlook-header { padding-left: 10px !important; padding-right: 30px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; font-family: Arial, sans-serif; border: 1px solid #ddd;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#f8f9fa" style="padding: 30px; text-align: center; border-bottom: 3px solid #28a745;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <h1 style="margin: 0; font-size: 24px; color: #000000; font-weight: bold;">Welcome Back!</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Your Customer Portal Account is already active</p>
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#f9f9f9" style="padding: 30px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">Dear <strong>${customerName}</strong>,</p>
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">
                        We noticed you've made another payment. Since you already have an active account with us, no need to create a new account - you can continue using your existing credentials.
                      </p>
                      
                      <!-- Account Info Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#ffffff" style="border: 2px solid #e8f5e8; margin: 25px 0;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">Account Information</h3>
                            <p style="margin: 10px 0; color: #333333; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 15px 0 5px 0; color: #333333; font-size: 16px;"><strong>Portal Login URL:</strong></p>
                            <p style="margin: 5px 0; word-break: break-all; color: #333333; font-size: 14px;"><a href="${loginUrl}" style="color: #28a745; text-decoration: underline;">${loginUrl}</a></p>
                          </td>
                        </tr>
                      </table>

                      <!-- Password Reset Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#e3f2fd" style="border: 1px solid #90caf9; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">Forgot Your Password?</h4>
                            <p style="color: #1565c0; margin: 0; font-size: 14px; line-height: 1.6;">If you've forgotten your password, click "Forgot Password?" on the login page to reset it securely.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#fff3e0" style="border: 1px solid #ffcc02; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #f57c00; margin: 0 0 10px 0; font-size: 16px;">Your Customer Portal Features:</h4>
                            <ul style="color: #f57c00; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                              <li>View all your payment schedules and history</li>
                              <li>Access your active services across all payments</li>
                              <li>Manage your saved payment methods</li>
                              <li>Download invoices and receipts</li>
                              <li>Get help and support when needed</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 30px 0 0 0;">If you have any questions or need assistance accessing your account, please don't hesitate to contact our support team.</p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const result = await sendEmailViaMailgun(mailOptions);
    return { success: true, messageId: result.messageId, recipient: email };
    
  } catch (error) {
    console.error('❌ Failed to send existing customer email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (customerData) => {
  try {
    const {
      customerName,
      email,
      resetToken,
      resetUrl
    } = customerData;

    const devTechCcEmails = getDevTechCcEmails();

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      cc: devTechCcEmails,
      subject: 'Reset Your Recurring Account Password',
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 30px !important; }
            .outlook-header { padding-left: 10px !important; padding-right: 30px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; font-family: Arial, sans-serif; border: 1px solid #ddd;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#ee5a52" style="padding: 30px; text-align: center;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: bold;">Password Reset</h1>
                      <p style="margin: 10px 0 0 0; font-size: 16px; color: #ffffff;">Reset Your Recurring Account Password</p>
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td bgcolor="#f9f9f9" style="padding: 30px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 30px;"><![endif]-->
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">
                        Dear <strong>${customerName}</strong>,
                      </p>
                      <p style="font-size: 16px; color: #333333; margin: 0 0 30px 0; line-height: 1.6;">
                        We received a request to reset your password for your Recurring customer account. 
                        Click the button below to set a new password:
                      </p>
                      
                      <!-- Reset Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
                        <tr>
                          <td align="center" bgcolor="#ee5a52" style="background-color: #ee5a52; padding: 15px 30px;">
                            <a href="${resetUrl}" target="_blank" style="display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">Reset My Password</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Important Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#fff3cd" style="border: 1px solid #ffeaa7; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">Important:</h4>
                            <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                              This password reset link will expire in <strong>1 hour</strong> for security reasons. 
                              If you don't reset your password within this time, you'll need to request a new reset link.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Security Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f8d7da" style="border: 1px solid #f5c6cb; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #721c24; margin: 0 0 10px 0; font-size: 16px;">Security Notice:</h4>
                            <p style="color: #721c24; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                              If you didn't request this password reset, please ignore this email. Your account will remain secure.
                            </p>
                            <p style="color: #721c24; margin: 0; font-size: 14px; line-height: 1.6;">
                              For additional security, we recommend using a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Method -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#e8f4f8" style="border: 1px solid #bee5eb; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">Alternative Method:</h4>
                            <p style="color: #0c5460; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                              If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="color: #0c5460; margin: 0; font-size: 12px; word-break: break-all; background-color: #f1f9fc; padding: 8px;">
                              ${resetUrl}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 30px 0 0 0;">
                        If you continue to have problems accessing your account, please contact our support team for assistance.
                      </p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const result = await sendEmailViaMailgun(mailOptions);
    return { success: true, messageId: result.messageId, recipient: email };
    
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async () => {
  try {
    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: EMAIL_CONFIG.recipients.business_team,
      subject: 'Recurring Email Service Test',
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
          <!--[if mso]>
          <style type="text/css">
            .outlook-content { padding-left: 10px !important; padding-right: 20px !important; }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; font-family: Arial, sans-serif;">
                  <tr>
                    <td style="padding: 20px;">
                      <!--[if mso]><div style="padding-left: 10px; padding-right: 20px;"><![endif]-->
                      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #333333;">Email Service Test Successful</h2>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;">This is a test email to verify that the Recurring payment system email service is working correctly.</p>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                      <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; line-height: 1.6;"><strong>Sender:</strong> ${mailgunConfig.fromEmail}</p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">If you receive this email, the configuration is working properly.</p>
                      
                      <!-- Footer -->
                      ${getEmailFooter()}
                      <!--[if mso]></div><![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const result = await sendEmailViaMailgun(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  sendSubscriptionCompletedEmail,
  // sendPaymentFailureEmail,
  sendPdfEmail,
  sendCustomerWelcomeEmail,
  sendExistingCustomerEmail,
  sendPasswordResetEmail,
  sendFinalRenewalEmail,
  sendPaymentFailureNotificationEmail,
  sendPaymentSuccessNotificationEmail,
  testEmailConfiguration
};
