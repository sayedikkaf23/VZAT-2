import mailgun from 'mailgun-js';
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
    business_team: process.env.BUSINESS_TEAM_EMAIL || 'saeedikkaf3@gmail.com',
    operations_team: process.env.OPERATIONS_TEAM_EMAIL || 'saeedikkaf3@gmail.com',
    devtech_team: process.env.DEVTECH_TEAM_EMAIL || 'devtec3h@virtuzone.com',
    ar_team: process.env.AR_TEAM_EMAIL || 'ar3@virtuzone.com'
  }
};

const getDevTechBccEmail = () => process.env.DEV_TECH_BCC_EMAIL || 'dev.tech1@vz.ae';

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

// Helper function to send email via Mailgun
const sendEmailViaMailgun = async (mailData) => {
  if (!mailgunClient) {
    throw new Error('Mailgun client not initialized');
  }

  // Convert Mailgun format
  const mailgunData = {
    from: mailData.from?.address ? `${mailData.from.name || 'Virtuzone'} <${mailData.from.address}>` : mailData.from || `${EMAIL_CONFIG.sender.name} <${mailgunConfig.fromEmail}>`,
    to: Array.isArray(mailData.to) ? mailData.to.join(', ') : mailData.to,
    subject: mailData.subject,
    html: mailData.html,
    ...(mailData.cc && { cc: Array.isArray(mailData.cc) ? mailData.cc.join(', ') : mailData.cc }),
    ...(mailData.bcc && { bcc: Array.isArray(mailData.bcc) ? mailData.bcc.join(', ') : mailData.bcc }),
    ...(mailData.attachment && { attachment: mailData.attachment })
  };

  const result = await mailgunClient.messages().send(mailgunData);
  return { messageId: result.id || result.message, accepted: [mailgunData.to], rejected: [] };
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
      Customer_name,
      opp_email,
      salesPersonDetails
    } = subscriptionData;

    // Send to both customer and business team
    const recipientList = [
      opp_email, // Customer email
      EMAIL_CONFIG.recipients.business_team, // Business team
      (salesPersonDetails && salesPersonDetails.salesPersonEmail) || undefined // Sales person
    ].filter(Boolean);

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: recipientList,
      subject: `Subscription Successfully Completed - ${Quote_payment_number || quotepaymentId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Subscription Successfully Completed</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8f9fa;">
            <p>Dear ${Customer_name || 'Valued Customer'},</p>
            
            <p>Congratulations! We are pleased to inform you that your subscription with Virtuzone has been <strong>successfully completed</strong>.</p>
            
            <h2>Subscription Summary</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #e9ecef;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Quote Payment ID</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${Quote_payment_number || quotepaymentId}</td>
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
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Total Amount Paid</td>
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
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Final Payment Date</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${last_payment_date ? new Date(last_payment_date).toLocaleDateString() : 'N/A'}</td>
              </tr>
            </table>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">Payment Complete!</h3>
              <p style="color: #155724; margin-bottom: 0;">
                All installment payments have been successfully processed. 
                <strong>No further charges will be processed</strong> for this subscription.
              </p>
            </div>
            
            <p>Thank you for choosing Virtuzone for your corporate services. We appreciate your business and look forward to serving you in the future.</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 12px;">
                This is an automated notification from Recurring Payment System<br>
                Generated on: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
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
      Customer_name,
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

    const ccRecipients = oppOwnerEmail ? [oppOwnerEmail] : [];

    const devTechBccEmail = getDevTechBccEmail();

    const finalDate = last_payment_date ? new Date(last_payment_date) : new Date();
    const finalDateStr = finalDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We hope this message finds you well.</p>

        <p>This is a gentle reminder that your current corporate service package with Virtuzone, is nearing the end of its term. Your final installment was successfully processed on <strong>${finalDateStr}</strong>.</p>

        <p>We thank you sincerely for placing your trust in Virtuzone. Your corporate services consultant is added in CC to this e-mail to assist you with  tailoring a new plan for next year that fits your current needs.</p>

        

        <p style="margin-top: 40px;">Warm regards,<br>${(salesPersonDetails && salesPersonDetails.salesPersonName) || 'Virtuzone Team'}</p>
      </div>
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
      Customer_name,
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
    const paymentLinkHtml = payment_link ? 
      `<a href="${payment_link}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Click here to access your Customer Portal account</a>` :
      'Please contact us for assistance accessing your Customer Portal account.';

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We hope you're doing well.</p>

        <p>This is to inform you that the scheduled payment for your Proforma Invoice <strong>#PI ${q_payment_id || quotepaymentId}</strong>, due on <strong>${dueDateStr}</strong>, could not be processed.</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <p style="margin: 0;"><strong>Amount:</strong> AED ${payment_amount || 'N/A'}</p>
          <p style="margin: 5px 0 0 0;"><strong>Reason:</strong> ${reasonText}</p>
        </div>

        <p>We kindly request you update your payment information to avoid service discontinuation:</p>

      

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
      Customer_name,
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
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <p>Dear ${Customer_name || 'Customer'},</p>

        <p>We are pleased to confirm that your scheduled payment of <strong>AED ${formatAmount(payment_amount)}</strong> for your Proforma Invoice <strong>#PI ${q_payment_id || quotepaymentId}</strong> has been successfully processed on <strong>${paymentDateStr}</strong>.</p>

        <div style="border: 2px solid #6c757d; margin: 20px 0;">
          <div style="background-color: #f5f5f5; padding: 10px; border-bottom: 1px solid #6c757d;">
            <h3 style="margin: 0; text-align: center; color: #6c757d;">Payment Details</h3>
          </div>
          <table style="border-collapse: collapse; width: 100%;">
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
        </div>

        <div style="border: 2px solid #6c757d; margin: 20px 0;">
          <div style="background-color: #f5f5f5; padding: 10px; border-bottom: 1px solid #6c757d;">
            <h3 style="margin: 0; text-align: center; color: #6c757d;">Payment Schedule</h3>
          </div>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Installment No.</td>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold;">Payment Date</td>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Amount (AED)</td>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f8f9fa; font-weight: bold; text-align: center;">Status</td>
            </tr>
            ${paymentScheduleRows}
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
      Customer_name,
      opp_owner,
      salesPersonDetails,
      installmentSchedule // New parameter for dynamic payment schedule
    } = emailData;

    // Get base URL from environment
    const baseUrl = process.env.BASE_URL || 'https://vzatnew.yeepeey.com';
    
    // Construct payment link with proper base URL
    const fullPaymentLink = paymentLink.startsWith('http') ? paymentLink : `${baseUrl}${paymentLink.startsWith('/') ? '' : '/'}${paymentLink}`;

  // Process PDF attachments for Mailgun (CORRECT)
const attachments = [];

if (quotePdf && Array.isArray(quotePdf)) {
  for (const pdf of quotePdf) {
    if (pdf.pdfContent && pdf.name) {
      const cleanBase64 = pdf.pdfContent
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s/g, '');

      attachments.push(
        new mailgun.Attachment({
          data: Buffer.from(cleanBase64, 'base64'),
          filename: `${pdf.name}.pdf`,
          contentType: 'application/pdf'
        })
      );
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
    const ccRecipients = [];
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
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Quote Payment Number #</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">PI ${Quote_payment_number || quotepaymentId}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Invoice Value with VAT</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">AED ${formatAmount(Installment_amount)}</td>
                </tr>
               
                  <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Total Amount</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">AED ${formatAmount(Total_After_VAT_Currency)}</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">Payment Link</td>
                  <td style="border: 1px solid #ddd; padding: 12px; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                    <a href="${fullPaymentLink}" style="color: #007bff; text-decoration: none; word-break: break-all;">${fullPaymentLink}</a>
                  </td>
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
    console.log('📧 EMAIL SERVICE - Using Mailgun...');
    
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

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject: 'Welcome to  Customer Portal - Your Account is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background-color: #f8f9fa; color: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 3px solid #007bff;">
            <h1 style="margin: 0; font-size: 28px; color: #000000;">Welcome to Customer Portal!</h1>
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
              <h3 style="color: #000000; margin-top: 0;">Your Login Credentials</h3>
              <p style="margin: 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0; color: #333;"><strong>Temporary Password:</strong> <code style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #000000; font-weight: bold;">${temporaryPassword}</code></p>
              <p style="margin: 10px 0; color: #333;"><strong>Quote Payment ID:</strong> ${quotepaymentId}</p>
              <p style="margin: 15px 0 5px 0; color: #333;"><strong>Portal Login URL:</strong></p>
              <p style="margin: 5px 0; word-break: break-all; color: #333;"><a href="${loginUrl}" style="color: #007bff; text-decoration: underline; font-size: 14px;">${loginUrl}</a></p>
            </div>
            

           <div style="text-align: center; margin: 30px 0;">
  <a href="${loginUrl}" style="background-color: #ff0000; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; border: 2px solid #ff0000;">
     Login to Your Account
  </a>
</div>

            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Important Security Notice:</h4>
              <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
                This is a temporary password. For your security, please change it immediately after your first login. 
                You'll be prompted to create a new password when you sign in.
              </p>
            </div>
            
            <div style="background-color: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #2d5a2d; margin-top: 0;">What You Can Do in Your Portal:</h4>
              <ul style="color: #2d5a2d; margin-bottom: 0; padding-left: 20px;">
                <li>View your payment schedules and due dates</li>
              
                <li>Update your saved payment methods</li>
                <li>Get help and support</li>
              
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team. 
              We're here to help you make the most of your Recurring experience.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #888; margin: 0;">
                Best regards,<br>
                <strong>TaxReady Team</strong>
              </p>
            </div>
          </div>
        </div>
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

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      ...(devTechBccEmail && { bcc: devTechBccEmail }),
      subject: 'Welcome Back! Your Customer Portal account is Ready to Use',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background-color: #f8f9fa; color: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 3px solid #28a745;">
            <h1 style="margin: 0; font-size: 28px; color: #000000;">Welcome Back!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Your Customer Portal Account is already active</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              We noticed you've made another payment. Since you already have an active account with us, no need to create a new account - you can continue using your existing credentials.
            </p>
            
            <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #e8f5e8;">
              <h3 style="color: #000000; margin-top: 0;">Account Information</h3>
              <p style="margin: 10px 0; color: #333;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 15px 0 5px 0; color: #333;"><strong>Portal Login URL:</strong></p>
              <p style="margin: 5px 0; word-break: break-all; color: #333;"><a href="${loginUrl}" style="color: #28a745; text-decoration: underline; font-size: 14px;">${loginUrl}</a></p>
            </div>

            <div style="background-color: #e3f2fd; border: 1px solid #90caf9; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #1565c0; margin-top: 0;">Forgot Your Password?</h4>
              <p style="color: #1565c0; margin-bottom: 0; font-size: 14px;">If you've forgotten your password, click "Forgot Password?" on the login page to reset it securely.</p>
            </div>
            
            <div style="background-color: #fff3e0; border: 1px solid #ffcc02; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #f57c00; margin-top: 0;">Your Customer Portal Features:</h4>
              <ul style="color: #f57c00; margin-bottom: 0; padding-left: 20px;">
                <li>View all your payment schedules and history</li>
                <li>Access your active services across all payments</li>
                <li>Manage your saved payment methods</li>
                <li>Download invoices and receipts</li>
                <li>Get help and support when needed</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">If you have any questions or need assistance accessing your account, please don't hesitate to contact our support team.</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 14px; color: #888; margin: 0;">Best regards,<br><strong>TaxReady Team</strong></p>
            </div>
          </div>
        </div>
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

    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.sender.name,
        address: mailgunConfig.fromEmail
      },
      to: email,
      subject: 'Reset Your Recurring Account Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Reset Your Recurring Account Password</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Dear <strong>${customerName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              We received a request to reset your password for your Recurring customer account. 
              Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset My Password
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Important:</h4>
              <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
                This password reset link will expire in <strong>1 hour</strong> for security reasons. 
                If you don't reset your password within this time, you'll need to request a new reset link.
              </p>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #721c24; margin-top: 0;">Security Notice:</h4>
              <p style="color: #721c24; margin-bottom: 5px; font-size: 14px;">
                If you didn't request this password reset, please ignore this email. Your account will remain secure.
              </p>
              <p style="color: #721c24; margin-bottom: 0; font-size: 14px;">
                For additional security, we recommend using a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            
            <div style="background-color: #e8f4f8; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #0c5460; margin-top: 0;">Alternative Method:</h4>
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
                <strong>TaxReady Team</strong>
              </p>
            </div>
          </div>
        </div>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Email Service Test Successful</h2>
          <p>This is a test email to verify that the Recurring payment system email service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Sender:</strong> ${mailgunConfig.fromEmail}</p>
          <p>If you receive this email, the configuration is working properly.</p>
        </div>
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
