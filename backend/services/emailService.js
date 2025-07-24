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
    operations_team: process.env.OPERATIONS_TEAM_EMAIL || 'saeedikkaf@gmail.com'
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
    console.log(`✅ Subscription completion email sent successfully: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Failed to send subscription completion email:', error);
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
    console.log(`✅ Payment failure email sent successfully: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
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
    console.log(`✅ Test email sent successfully: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendSubscriptionCompletedEmail,
  sendPaymentFailureEmail,
  testEmailConfiguration
};
