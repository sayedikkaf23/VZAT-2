import mailgun from 'mailgun-js';
import dotenv from 'dotenv';
// import envConfig from '../config.env.js';

dotenv.config();

// Initialize Mailgun
const mailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN || 'vz.ae',
  fromEmail: process.env.SMTP_USER || `noreply@${process.env.MAILGUN_DOMAIN || 'vz.ae'}`
};

console.log('📧 Mailgun Configuration Check:', {
  hasApiKey: !!mailgunConfig.apiKey,
  apiKeyLength: mailgunConfig.apiKey ? mailgunConfig.apiKey.length : 0,
  apiKeyPrefix: mailgunConfig.apiKey ? mailgunConfig.apiKey.substring(0, 10) + '...' : 'NOT SET',
  domain: mailgunConfig.domain,
  fromEmail: mailgunConfig.fromEmail,
  envApiKey: !!process.env.MAILGUN_API_KEY,
  envDomain: process.env.MAILGUN_DOMAIN,
  envSmtpUser: process.env.SMTP_USER
});

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
  console.warn('⚠️ Missing:', {
    apiKey: !mailgunConfig.apiKey,
    domain: !mailgunConfig.domain
  });
}

/**
 * Generic email sending function
 */
const sendEmail = async (emailData) => {
  console.log('📧 sendEmail called with data:', {
    to: emailData.to,
    from: emailData.from,
    subject: emailData.subject,
    hasHtml: !!emailData.html,
    hasAttachments: !!emailData.attachment,
    attachmentCount: emailData.attachment ? (Array.isArray(emailData.attachment) ? emailData.attachment.length : 1) : 0
  });

  if (!mailgunClient) {
    console.error('❌ Mailgun client not initialized');
    console.error('❌ Cannot send email - Mailgun client is null');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    console.log('📤 Attempting to send email via Mailgun...');
    console.log('📤 Email payload:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      htmlLength: emailData.html ? emailData.html.length : 0
    });

    const result = await mailgunClient.messages().send(emailData);
    
    console.log('✅ Email sent successfully!', {
      messageId: result.id,
      message: result.message,
      result: result
    });

    return {
      success: true,
      messageId: result.id,
      message: result.message
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response',
      stack: error.stack
    });
    return {
      success: false,
      error: error.message || 'Failed to send email',
      errorDetails: error.response?.data || error
    };
  }
};

/**
 * Send PDF email with payment link
 */
export const sendPdfEmail = async (emailData) => {
  console.log('📧 sendPdfEmail called');
  console.log('📧 Email data received:', {
    Quote_payment_number: emailData.Quote_payment_number,
    quote_email: emailData.quote_email,
    quotepaymentId: emailData.quotepaymentId,
    Customer_name: emailData.Customer_name,
    hasPdf: !!emailData.quotePdf,
    pdfCount: emailData.quotePdf ? emailData.quotePdf.length : 0
  });

  const {
    Quote_payment_number,
    Total_After_VAT_Currency,
    quote_email,
    quotepaymentId,
    paymentLink,
    Installment_amount,
    Total_Installments,
    quotePdf,
    Customer_name,
    opp_owner,
    salesPersonDetails,
    installmentSchedule
  } = emailData;

  // Construct payment link using quotepaymentId (always use quotepaymentId, not checkoutId)
  const frontendUrl = process.env.FRONTEND_URL || 'https://installment.virtuzone.com';
  const paymentLinkWithQuoteId = `${frontendUrl}/payment-schedule/${encodeURIComponent(quotepaymentId)}`;
  console.log('📧 Payment link generated:', paymentLinkWithQuoteId);

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Payment Invoice</h2>
          <p>Dear ${Customer_name || 'Valued Customer'},</p>
          <p>Please find attached your payment invoice.</p>
          <p><strong>Quote Payment Number:</strong> ${Quote_payment_number}</p>
          <p><strong>Total Amount:</strong> AED ${Total_After_VAT_Currency}</p>
          <p><strong>Installment Amount:</strong> AED ${Installment_amount}</p>
          <p><strong>Total Installments:</strong> ${Total_Installments}</p>
          <p style="margin-top: 30px;">
            <a href="${paymentLinkWithQuoteId}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Click here to Pay
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            If you have any questions, please contact your sales representative.
          </p>
        </div>
      </body>
    </html>
  `;

  // Convert PDF attachments
  const attachments = quotePdf.map((pdf, index) => ({
    filename: pdf.name || `invoice_${index + 1}.pdf`,
    data: Buffer.from(pdf.pdfContent, 'base64')
  }));

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: quote_email,
    subject: `Payment Invoice - ${Quote_payment_number}`,
    html: emailContent,
    attachment: attachments
  };

  console.log('📧 Prepared mail data for sendPdfEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject,
    attachmentCount: attachments.length
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendPdfEmail result:', result);
  return result;
};

/**
 * Send customer welcome email
 */
export const sendCustomerWelcomeEmail = async (emailData) => {
  console.log('📧 sendCustomerWelcomeEmail called');
  console.log('📧 Email data:', {
    customerName: emailData.customerName,
    email: emailData.email,
    hasPassword: !!emailData.temporaryPassword
  });

  const {
    customerName,
    email,
    temporaryPassword,
    quotepaymentId,
    loginUrl
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Welcome to Virtuzone Payment Portal</h2>
          <p>Dear ${customerName},</p>
          <p>Your account has been created successfully. You can now access your payment portal using the credentials below:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          <p style="margin-top: 30px;">
            <a href="${loginUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Portal
            </a>
          </p>
          <p style="margin-top: 20px; color: #d9534f;">
            <strong>Important:</strong> Please change your password after first login for security purposes.
          </p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: email,
    subject: 'Welcome to Virtuzone Payment Portal',
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendCustomerWelcomeEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendCustomerWelcomeEmail result:', result);
  return result;
};

/**
 * Send email to existing customer
 */
export const sendExistingCustomerEmail = async (emailData) => {
  console.log('📧 sendExistingCustomerEmail called');
  console.log('📧 Email data:', {
    customerName: emailData.customerName,
    email: emailData.email
  });

  const {
    customerName,
    email,
    loginUrl
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Payment Portal Access</h2>
          <p>Dear ${customerName},</p>
          <p>You already have an account with us. Please use your existing credentials to access the payment portal.</p>
          <p style="margin-top: 30px;">
            <a href="${loginUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Portal
            </a>
          </p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: email,
    subject: 'Payment Portal Access',
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendExistingCustomerEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendExistingCustomerEmail result:', result);
  return result;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (emailData) => {
  console.log('📧 sendPasswordResetEmail called');
  console.log('📧 Email data:', {
    customerName: emailData.customerName,
    email: emailData.email,
    hasResetUrl: !!emailData.resetUrl
  });

  const {
    customerName,
    email,
    resetToken,
    resetUrl
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Dear ${customerName},</p>
          <p>You have requested to reset your password. Click the link below to reset it:</p>
          <p style="margin-top: 30px;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This link will expire in 24 hours. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: email,
    subject: 'Password Reset Request',
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendPasswordResetEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendPasswordResetEmail result:', result);
  return result;
};

/**
 * Send payment success notification email
 */
export const sendPaymentSuccessNotificationEmail = async (emailData) => {
  console.log('📧 sendPaymentSuccessNotificationEmail called');
  console.log('📧 Email data:', {
    quotepaymentId: emailData.quotepaymentId,
    opp_email: emailData.opp_email,
    payment_amount: emailData.payment_amount
  });

  const {
    quotepaymentId,
    q_payment_id,
    Customer_name,
    opp_email,
    payment_amount,
    payment_date,
    installment_number,
    total_installments,
    payment_method,
    salesPersonDetails
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">Payment Successful</h2>
          <p>Dear ${Customer_name || 'Valued Customer'},</p>
          <p>Your payment has been processed successfully.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment ID:</strong> ${q_payment_id || quotepaymentId}</p>
            <p><strong>Amount:</strong> AED ${payment_amount}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment_date).toLocaleDateString()}</p>
            <p><strong>Installment:</strong> ${installment_number} of ${total_installments}</p>
            <p><strong>Payment Method:</strong> ${payment_method || 'Card'}</p>
          </div>
          <p>Thank you for your payment.</p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: opp_email,
    subject: `Payment Successful - ${q_payment_id || quotepaymentId}`,
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendPaymentSuccessNotificationEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendPaymentSuccessNotificationEmail result:', result);
  return result;
};

/**
 * Send payment failure notification email
 */
export const sendPaymentFailureNotificationEmail = async (emailData) => {
  console.log('📧 sendPaymentFailureNotificationEmail called');
  console.log('📧 Email data:', {
    quotepaymentId: emailData.quotepaymentId,
    opp_email: emailData.opp_email,
    failure_reason: emailData.failure_reason
  });

  const {
    quotepaymentId,
    Customer_name,
    opp_email,
    payment_amount,
    failure_reason,
    installment_number,
    salesPersonDetails
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Payment Failed</h2>
          <p>Dear ${Customer_name || 'Valued Customer'},</p>
          <p>Unfortunately, your payment could not be processed.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment ID:</strong> ${quotepaymentId}</p>
            <p><strong>Amount:</strong> AED ${payment_amount}</p>
            <p><strong>Installment:</strong> ${installment_number}</p>
            <p><strong>Reason:</strong> ${failure_reason || 'Payment processing failed'}</p>
          </div>
          <p>Please try again or contact your sales representative for assistance.</p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: opp_email,
    subject: `Payment Failed - ${quotepaymentId}`,
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendPaymentFailureNotificationEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendPaymentFailureNotificationEmail result:', result);
  return result;
};

/**
 * Send final renewal email
 */
export const sendFinalRenewalEmail = async (emailData) => {
  console.log('📧 sendFinalRenewalEmail called');
  console.log('📧 Email data:', {
    quotepaymentId: emailData.quotepaymentId,
    opp_email: emailData.opp_email,
    payments_completed: emailData.payments_completed
  });

  const {
    quotepaymentId,
    Quote_payment_number,
    Customer_name,
    opp_email,
    payments_completed,
    InstallmentLeft,
    last_payment_date,
    salesPersonDetails
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">All Payments Completed</h2>
          <p>Dear ${Customer_name || 'Valued Customer'},</p>
          <p>Congratulations! You have successfully completed all your installment payments.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment ID:</strong> ${Quote_payment_number || quotepaymentId}</p>
            <p><strong>Total Payments:</strong> ${payments_completed}</p>
            <p><strong>Last Payment Date:</strong> ${new Date(last_payment_date).toLocaleDateString()}</p>
          </div>
          <p>Thank you for your business!</p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: opp_email,
    subject: `All Payments Completed - ${Quote_payment_number || quotepaymentId}`,
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendFinalRenewalEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendFinalRenewalEmail result:', result);
  return result;
};

/**
 * Send subscription completed email
 */
export const sendSubscriptionCompletedEmail = async (emailData) => {
  console.log('📧 sendSubscriptionCompletedEmail called');
  console.log('📧 Email data:', {
    quotepaymentId: emailData.quotepaymentId,
    opp_email: emailData.opp_email
  });

  const {
    quotepaymentId,
    Customer_name,
    opp_email,
    total_payments,
    completion_date
  } = emailData;

  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">Subscription Completed</h2>
          <p>Dear ${Customer_name || 'Valued Customer'},</p>
          <p>Your subscription has been completed successfully.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment ID:</strong> ${quotepaymentId}</p>
            <p><strong>Total Payments:</strong> ${total_payments}</p>
            <p><strong>Completion Date:</strong> ${new Date(completion_date).toLocaleDateString()}</p>
          </div>
          <p>Thank you for your business!</p>
        </div>
      </body>
    </html>
  `;

  const mailData = {
    from: `Virtuzone <${mailgunConfig.fromEmail}>`,
    to: opp_email,
    subject: `Subscription Completed - ${quotepaymentId}`,
    html: emailContent
  };

  console.log('📧 Prepared mail data for sendSubscriptionCompletedEmail:', {
    from: mailData.from,
    to: mailData.to,
    subject: mailData.subject
  });

  const result = await sendEmail(mailData);
  console.log('📧 sendSubscriptionCompletedEmail result:', result);
  return result;
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async (req, res) => {
  console.log('📧 testEmailConfiguration called');
  try {
    console.log('📧 Testing email configuration...');
    console.log('📧 Mailgun client status:', {
      isInitialized: !!mailgunClient,
      config: {
        hasApiKey: !!mailgunConfig.apiKey,
        domain: mailgunConfig.domain
      }
    });

    if (!mailgunClient) {
      console.error('❌ Mailgun client not initialized');
      return res.status(500).json({
        success: false,
        error: 'Mailgun not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.'
      });
    }

    const testEmail = req.body.testEmail || 'test@example.com';
    console.log('📧 Test email address:', testEmail);
    
    const mailData = {
      from: `Virtuzone <${mailgunConfig.fromEmail}>`,
      to: testEmail,
      subject: 'Test Email from Virtuzone',
      html: '<p>This is a test email to verify email configuration.</p>'
    };

    console.log('📧 Sending test email...');
    const result = await sendEmail(mailData);
    console.log('📧 Test email result:', result);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error testing email configuration:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

