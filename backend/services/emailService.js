import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration
const EMAIL_CONFIG = {
  sender: {
    email: process.env.EMAIL_SENDER || 'workerappzpayments@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'voib cvgx tuko hcxs', // Use app password
    name: 'VZAT Payment System'
  },
  recipients: {
    business_team: process.env.BUSINESS_TEAM_EMAIL || 'saeedikkaf@gmail.com',
    operations_team: process.env.OPERATIONS_TEAM_EMAIL || 'saeedikkaf@gmail.com',
    devtech_team: process.env.DEVTECH_TEAM_EMAIL || 'devtech@virtuzone.com',
    ar_team: process.env.AR_TEAM_EMAIL || 'ar@virtuzone.com'
  }
};

// Create transporter
const createTransporter = () => {
  // For Gmail (requires app password)
  if (EMAIL_CONFIG.sender.email.includes('gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_CONFIG.sender.email,
        pass: EMAIL_CONFIG.sender.password
      }
    });
  }
  
  // For other email providers (generic SMTP)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: EMAIL_CONFIG.sender.email,
      pass: EMAIL_CONFIG.sender.password
    }
  });
};

/**
 * Send email notification for completed subscription
 */
export const sendSubscriptionCompletedEmail = async (subscriptionData) => {
  try {
    const transporter = createTransporter();
    
    const {
      quotepaymentId,
      OpportunityId,
      QuoteId,
      Total_After_VAT_Currency,
      InstallmentLeft,
      payments_completed,
      last_payment_date
    } = subscriptionData;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: EMAIL_CONFIG.recipients.business_team,
      subject: `🎉 Subscription Completed - ${quotepaymentId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>✅ Subscription Successfully Completed</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8f9fa;">
            <h2>Customer Subscription Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote Payment ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${quotepaymentId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Opportunity ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${OpportunityId}</td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${QuoteId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Total Amount Collected</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>${Total_After_VAT_Currency} AED</strong></td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Total Installments</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${InstallmentLeft}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Payments Completed</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${payments_completed}</td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Last Payment Date</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${last_payment_date ? new Date(last_payment_date).toLocaleDateString() : 'N/A'}</td>
              </tr>
            </table>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">✅ Action Completed</h3>
              <p style="color: #155724; margin-bottom: 0;">
                This customer has successfully completed all installment payments. 
                <strong>No further charges will be processed</strong> for this subscription.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px;">
                This is an automated notification from VZAT Payment System<br>
                Generated on: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);

    return { success: true, messageId: result.messageId };
    
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
    const transporter = createTransporter();
    const {
      quotepaymentId,
      Customer_name,
      opp_email,
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
    const recipientList = [
      opp_email,
      EMAIL_CONFIG.recipients.devtech_team,
      (salesPersonDetails && salesPersonDetails.salesPersonEmail) || undefined
    ].filter(Boolean);

    const finalDate = last_payment_date ? new Date(last_payment_date) : new Date();
    const finalDateStr = finalDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We hope this message finds you well.</p>

        <p>This is a gentle reminder that your current corporate service package with Virtuzone, under Proforma Invoice <strong>#PI QP-No-${quotepaymentId}</strong>, is nearing the end of its term. Your final installment was successfully processed on <strong>${finalDateStr}</strong>.</p>

        <p>We thank you sincerely for placing your trust in Virtuzone over the past year.</p>

        <p>We would be delighted to assist you with renewing your services and tailoring a new plan that fits your current needs.</p>

        <p style="margin-top: 40px;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
      </div>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: recipientList,
      subject,
      html: bodyHtml
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId, recipients: recipientList };
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
    const transporter = createTransporter();
    const {
      quotepaymentId,
      Customer_name,
      opp_email,
      payment_amount,
      due_date,
      failure_reason,
      payment_link,
      salesPersonDetails
    } = data;

    const subject = `Action Required: Virtuzone | Payment Attempt Unsuccessful for Your Scheduled Installment`;
    
    // Recipients: customer, devtech, opp owner, AR team
    const recipientList = [
      opp_email,
      EMAIL_CONFIG.recipients.devtech_team,
      EMAIL_CONFIG.recipients.ar_team,
      (salesPersonDetails && salesPersonDetails.salesPersonEmail) || undefined
    ].filter(Boolean);

    const dueDateStr = due_date ? new Date(due_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';

    const reasonText = failure_reason || 'Payment processing failed';
    const paymentLinkHtml = payment_link ? 
      `<a href="${payment_link}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Click here to complete the payment</a>` :
      'Please contact us for payment assistance.';

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We hope you're doing well.</p>

        <p>This is to inform you that the scheduled payment for your Proforma Invoice <strong>#PI QP-No-${quotepaymentId}</strong>, due on <strong>${dueDateStr}</strong>, could not be processed successfully.</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <p style="margin: 0;"><strong>Amount:</strong> AED ${payment_amount || 'N/A'}</p>
          <p style="margin: 5px 0 0 0;"><strong>Reason:</strong> ${reasonText}</p>
        </div>

        <p>We kindly request you to take the following action at your earliest convenience:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          ${paymentLinkHtml}
        </div>

        <p>You may also reply to this email should you need any assistance.</p>

        <p>Please note that timely payments help us ensure smooth continuation of your services without disruption.</p>

        <p>Thank you for your attention to this matter.</p>

        <p style="margin-top: 40px;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
      </div>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: recipientList,
      subject,
      html: bodyHtml
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId, recipients: recipientList };
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
    const transporter = createTransporter();
    const {
      quotepaymentId,
      Customer_name,
      opp_email,
      payment_amount,
      payment_date,
      installment_number,
      total_installments,
      payment_method,
      salesPersonDetails
    } = data;

    const subject = `Virtuzone | Payment Received`;
    
    // Recipients: customer, devtech, opp owner, AR team
    const recipientList = [
      opp_email,
      EMAIL_CONFIG.recipients.devtech_team,
      EMAIL_CONFIG.recipients.ar_team,
      (salesPersonDetails && salesPersonDetails.salesPersonEmail) || undefined
    ].filter(Boolean);

    const paymentDateStr = payment_date ? new Date(payment_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const installmentText = installment_number && total_installments ? 
      `${installment_number} of ${total_installments}` : 
      'N/A';

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We are pleased to confirm that your scheduled payment of <strong>AED ${payment_amount || 'N/A'}</strong> for your Proforma Invoice <strong>#PI QP-No-${quotepaymentId}</strong> has been successfully processed on <strong>${paymentDateStr}</strong>.</p>

        <div style="border: 2px solid #28a745; margin: 20px 0;">
          <div style="background-color: #f5f5f5; padding: 10px; border-bottom: 1px solid #28a745;">
            <h3 style="margin: 0; text-align: center; color: #28a745;">Payment Details</h3>
          </div>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 40%;">Invoice Number</td>
              <td style="border: 1px solid #ddd; padding: 12px;">PI QP-No-${quotepaymentId}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Installment</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${installmentText}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Amount Paid</td>
              <td style="border: 1px solid #ddd; padding: 12px;"><strong>AED ${payment_amount || 'N/A'}</strong></td>
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
        </div>

        <p>Your continued support is greatly appreciated, and we remain committed to delivering a smooth and hassle-free service delivery.</p>

        <p>Should you have any questions or require further assistance, please feel free to reach out to us directly.</p>

        <p>Thank you once again for choosing Virtuzone.</p>

        <p style="margin-top: 40px;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
      </div>
    `;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: recipientList,
      subject,
      html: bodyHtml
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId, recipients: recipientList };
  } catch (error) {
    console.error('❌ Failed to send payment success notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification for payment failure
 */
export const sendPaymentFailureEmail = async (failureData) => {
  try {
    const transporter = createTransporter();
    
    const {
      quotepaymentId,
      OpportunityId,
      QuoteId,
      error_message,
      payment_amount,
      attempt_date,
      payments_completed,
      total_installments,
      afs_response
    } = failureData;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: EMAIL_CONFIG.recipients.operations_team,
      subject: `🚨 URGENT: Payment Failure - ${quotepaymentId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>🚨 Payment Failure Alert</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
              <h3 style="color: #721c24; margin-top: 0;">⚠️ Immediate Action Required</h3>
              <p style="color: #721c24; margin-bottom: 0;">
                A recurring payment has failed and requires immediate attention from the operations team.
              </p>
            </div>
            
            <h2>Payment Failure Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote Payment ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${quotepaymentId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Opportunity ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${OpportunityId}</td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${QuoteId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Failed Amount</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;"><strong style="color: #dc3545;">${payment_amount} AED</strong></td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Failure Date</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${attempt_date ? new Date(attempt_date).toLocaleString() : new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Payment Progress</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${payments_completed}/${total_installments} completed</td>
              </tr>
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Error Message</td>
                <td style="padding: 12px; border: 1px solid #dee2e6; color: #dc3545;"><strong>${error_message}</strong></td>
              </tr>
            </table>
            
            ${afs_response ? `
            <h3>AFS Response Details</h3>
            <div style="background-color: #f1f1f1; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; overflow-x: auto;">
              <pre>${JSON.stringify(afs_response, null, 2)}</pre>
            </div>
            ` : ''}
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">📋 Recommended Actions</h3>
              <ul style="color: #856404;">
                <li>Verify customer's payment method status</li>
                <li>Check if card has expired or insufficient funds</li>
                <li>Contact customer to update payment information</li>
                <li>Review AFS transaction logs for detailed error analysis</li>
                <li>Consider rescheduling payment or offering alternative payment methods</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px;">
                This is an automated alert from VZAT Payment System<br>
                Generated on: ${new Date().toLocaleString()}<br>
                Please address this issue promptly to maintain customer satisfaction.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send PDF via email from Salesforce webhook
 */
export const sendPdfEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const {
      quote_payment_number,
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
      installmentSchedule // New parameter for dynamic payment schedule
    } = emailData;

    // Get base URL from environment
    const baseUrl = process.env.BASE_URL || 'https://vzatnew.yeepeey.com';
    
    // Construct payment link with proper base URL
    const fullPaymentLink = paymentLink.startsWith('http') ? paymentLink : `${baseUrl}${paymentLink.startsWith('/') ? '' : '/'}${paymentLink}`;

    // Process PDF attachments
    const attachments = [];
    if (quotePdf && Array.isArray(quotePdf)) {
      for (const pdf of quotePdf) {
        if (pdf.pdfContent && pdf.name) {
          attachments.push({
            filename: `${pdf.name}.pdf`,
            content: pdf.pdfContent,
            encoding: 'base64',
            contentType: pdf.ContentType || 'application/pdf'
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
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${installment.amount || Installment_amount}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${index ***REMOVED***= 0 ? 'Upfront Payment' : index ***REMOVED***= installmentSchedule.length - 1 ? 'Final Installment' : 'Monthly Installment'}</td>
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
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Installment_amount || Total_After_VAT_Currency}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${i ***REMOVED***= 0 ? 'Upfront Payment' : i ***REMOVED***= (Total_Installments - 1) ? 'Final Installment' : 'Monthly Installment'}</td>
          </tr>
        `;
      }
    }

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: quote_email,
      subject: `Virtuzone | Proforma Invoice & Payment Link – PI QP- No-${quote_payment_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; overflow-wrap: anywhere; word-break: break-word;">
          <div style="padding: 20px;">
            <p>Hello ${Customer_name || 'Sir/Madam'},</p>
            
            <p>Thank you for choosing Virtuzone as your preferred Corporate Services Provider.</p>
            
            <p>Based on your requirements and our discussions, we are pleased to attach the Proforma Invoice 
            along with the Payment Link embedded therein for your reference. A summary of the Proforma 
            Invoice is as below:</p>
            
            <div style="border: 2px solid #000; margin: 20px 0;">
              <div style="background-color: #f5f5f5; padding: 10px; border-bottom: 1px solid #000;">
                <h3 style="margin: 0; text-align: center;">Proforma Invoice Summary</h3>
              </div>
              <table style="border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-word;">
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 40%; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Details</td>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Information</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Proforma Invoice #</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">${quotepaymentId || quote_payment_number}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Invoice Value with VAT</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">AED ${Total_After_VAT_Currency}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Payment Link</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                    <a href="${fullPaymentLink}" style="color: #007bff; text-decoration: none; word-break: break-all;">${fullPaymentLink}</a>
                  </td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Amount Requested</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">AED ${Total_After_VAT_Currency}</td>
                </tr>
              </table>
            </div>
            
            <div style="border: 2px solid #000; margin: 20px 0;">
              <div style="background-color: #f5f5f5; padding: 10px; border-bottom: 1px solid #000;">
                <h3 style="margin: 0; text-align: center;">Payment Schedule</h3>
              </div>
              <table style="border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-word;">
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Installment No.</td>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Payment Date</td>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Amount (AED)</td>
                  <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Payment Type</td>
                </tr>
                ${paymentScheduleRows}
              </table>
            </div>
            
            <p>You may also click on the below button to proceed with payment.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${fullPaymentLink}" 
                 style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; 
                        border-radius: 4px; display: inline-block; font-weight: bold;">
                Click Here To Pay
              </a>
            </div>
            
            <p>Please feel free to contact us anytime in case you have any queries on this payment or the 
            service(s) offered.</p>
            
            <p>Thank you!</p>
            
            <p style="margin-top: 40px;">
              Regards,<br>
              ${(salesPersonDetails && salesPersonDetails.salesPersonName) || opp_owner || 'Rodney Raymond Lewis'}
            </p>
          </div>
        </div>
      `,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
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

    const transporter = createTransporter();
    
    const {
      customerName,
      email,
      temporaryPassword,
      quotepaymentId,
      loginUrl
    } = customerData;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: email,
      subject: '🎉 Welcome to VZAT Customer Portal - Your Account is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background-color: #f8f9fa; color: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 3px solid #007bff;">
            <h1 style="margin: 0; font-size: 28px; color: #000000;">🎉 Welcome to VZAT!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Your Customer Portal Account is Ready</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Dear <strong>${customerName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Congratulations! Your first payment has been successfully processed, and we've created your customer portal account. 
              You can now access your account to view payment schedules, manage services, and more.
            </p>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e3f2fd;">
              <h3 style="color: #000000; margin-top: 0;">🔐 Your Login Credentials</h3>
              <p style="margin: 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0; color: #333;"><strong>Temporary Password:</strong> <code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #000000; font-weight: bold;">${temporaryPassword}</code></p>
              <p style="margin: 10px 0; color: #333;"><strong>Quote Payment ID:</strong> ${quotepaymentId}</p>
              <p style="margin: 15px 0 5px 0; color: #333;"><strong>🔗 Portal Login URL:</strong></p>
              <p style="margin: 5px 0; word-break: break-all; color: #333;"><a href="${loginUrl}" style="color: #007bff; text-decoration: underline; font-size: 14px;">${loginUrl}</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #007bff; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; border: 2px solid #007bff;">
                🚀 Login to Your Account
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">⚠️ Important Security Notice:</h4>
              <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
                This is a temporary password. For your security, please change it immediately after your first login. 
                You'll be prompted to create a new password when you sign in.
              </p>
            </div>
            
            <div style="background-color: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #2d5a2d; margin-top: 0;">✨ What You Can Do in Your Portal:</h4>
              <ul style="color: #2d5a2d; margin-bottom: 0; padding-left: 20px;">
                <li>View your payment schedules and due dates</li>
                <li>Access your active services</li>
                <li>Update your saved payment methods</li>
                <li>Get help and support</li>
                <li>Download invoices and receipts</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team. 
              We're here to help you make the most of your VZAT experience.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #888; margin: 0;">
                Best regards,<br>
                <strong>The VZAT Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    
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
    const transporter = createTransporter();
    
    const {
      customerName,
      email,
      quotepaymentId,
      existingQuotePaymentId,
      loginUrl
    } = customerData;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: email,
      subject: '🔐 Welcome Back! Your VZAT Account is Ready to Use',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background-color: #f8f9fa; color: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 3px solid #28a745;">
            <h1 style="margin: 0; font-size: 28px; color: #000000;">🔐 Welcome Back!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Your VZAT Account is Already Active</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Dear <strong>${customerName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              We noticed you've made another payment, but you already have an active account with us! 
              No need to create a new account - you can continue using your existing credentials.
            </p>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e8f5e8;">
              <h3 style="color: #000000; margin-top: 0;">📋 Account Information</h3>
              <p style="margin: 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0; color: #333;"><strong>Original Quote Payment ID:</strong> ${existingQuotePaymentId}</p>
              <p style="margin: 10px 0; color: #333;"><strong>New Quote Payment ID:</strong> ${quotepaymentId}</p>
              <p style="margin: 15px 0 5px 0; color: #333;"><strong>🔗 Portal Login URL:</strong></p>
              <p style="margin: 5px 0; word-break: break-all; color: #333;"><a href="${loginUrl}" style="color: #28a745; text-decoration: underline; font-size: 14px;">${loginUrl}</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #28a745; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; border: 2px solid #28a745;">
                🔑 Login to Your Account
              </a>
            </div>
            
            <div style="background-color: #e3f2fd; border: 1px solid #90caf9; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #1565c0; margin-top: 0;">💡 Forgot Your Password?</h4>
              <p style="color: #1565c0; margin-bottom: 0; font-size: 14px;">
                If you've forgotten your password, click "Forgot Password?" on the login page to reset it securely.
              </p>
            </div>
            
            <div style="background-color: #fff3e0; border: 1px solid #ffcc02; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #f57c00; margin-top: 0;">🎯 Your Customer Portal Features:</h4>
              <ul style="color: #f57c00; margin-bottom: 0; padding-left: 20px;">
                <li>View all your payment schedules and history</li>
                <li>Access your active services across all payments</li>
                <li>Manage your saved payment methods</li>
                <li>Download invoices and receipts</li>
                <li>Get help and support when needed</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              If you have any questions or need assistance accessing your account, please don't hesitate to contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #888; margin: 0;">
                Best regards,<br>
                <strong>The VZAT Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
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
    const transporter = createTransporter();
    
    const {
      customerName,
      email,
      resetToken,
      resetUrl
    } = customerData;

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: email,
      subject: '🔐 Reset Your VZAT Account Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Reset Your VZAT Account Password</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Dear <strong>${customerName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              We received a request to reset your password for your VZAT customer account. 
              Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔑 Reset My Password
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">⏰ Important:</h4>
              <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
                This password reset link will expire in <strong>1 hour</strong> for security reasons. 
                If you don't reset your password within this time, you'll need to request a new reset link.
              </p>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #721c24; margin-top: 0;">🛡️ Security Notice:</h4>
              <p style="color: #721c24; margin-bottom: 5px; font-size: 14px;">
                If you didn't request this password reset, please ignore this email. Your account will remain secure.
              </p>
              <p style="color: #721c24; margin-bottom: 0; font-size: 14px;">
                For additional security, we recommend using a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            
            <div style="background-color: #e8f4f8; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #0c5460; margin-top: 0;">🔗 Alternative Method:</h4>
              <p style="color: #0c5460; margin-bottom: 5px; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #0c5460; margin-bottom: 0; font-size: 12px; word-break: break-all; background-color: #f1f9fc; padding: 8px; border-radius: 4px;">
                ${resetUrl}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              If you continue to have problems accessing your account, please contact our support team for assistance.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #888; margin: 0;">
                Best regards,<br>
                <strong>The VZAT Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
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
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: EMAIL_CONFIG.sender.email
      },
      to: EMAIL_CONFIG.recipients.business_team,
      subject: '✅ VZAT Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>✅ Email Service Test Successful</h2>
          <p>This is a test email to verify that the VZAT payment system email service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Sender:</strong> ${EMAIL_CONFIG.sender.email}</p>
          <p>If you receive this email, the configuration is working properly.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  sendSubscriptionCompletedEmail,
  sendPaymentFailureEmail,
  sendPdfEmail,
  sendCustomerWelcomeEmail,
  sendExistingCustomerEmail,
  sendPasswordResetEmail,
  sendFinalRenewalEmail,
  sendPaymentFailureNotificationEmail,
  sendPaymentSuccessNotificationEmail,
  testEmailConfiguration
};
