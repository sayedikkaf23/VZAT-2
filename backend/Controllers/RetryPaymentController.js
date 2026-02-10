import mongoose from 'mongoose';
import Vzat_Recurring_Data from '../model/VzatRecurringDataModel.js';
import SavedCard from '../model/SavedCardModel.js';
import Customer from '../model/CustomerLoginModel.js';
import { sendPaymentFailureNotificationEmail, sendPaymentSuccessNotificationEmail } from '../services/emailService.js';
import { updateQuotePaymentStatus } from '../services/salesforceService.js';

/**
 * Retry a failed payment for a customer
 * This allows customers to manually retry failed payments from their portal
 */
export const retryPayment = async (req, res) => {
  try {
    console.log('🔄 =============== PAYMENT RETRY REQUEST ===============');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌐 Request IP:', req.ip);
    console.log('👤 User Agent:', req.get('User-Agent'));
    console.log('📋 Request Body:', req.body);

    const { quotepaymentId, customerEmail } = req.body;

    // Validate required fields
    if (!quotepaymentId || !customerEmail) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Quote Payment ID and Customer Email are required'
      });
    }

    console.log(`🔍 Looking up subscription: ${quotepaymentId}`);
    console.log(`📧 Customer email: ${customerEmail}`);

    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ 
      quotepaymentId: quotepaymentId,
      opp_email: customerEmail 
    });

    if (!subscription) {
      console.log('❌ Subscription not found');
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or you do not have permission to retry this payment'
      });
    }

    console.log('✅ Subscription found:', {
      quotepaymentId: subscription.quotepaymentId,
      subscription_status: subscription.subscription_status,
      payments_completed: subscription.payments_completed,
      next_charge_date: subscription.next_charge_date
    });

    // Check if subscription is active
    if (subscription.subscription_status !== 'active') {
      console.log('❌ Subscription is not active');
      return res.status(400).json({
        success: false,
        message: 'Subscription is not active. Please contact support.'
      });
    }

    // Find the customer's saved card
    const savedCard = await SavedCard.findOne({ 
      quotepaymentId: quotepaymentId,
      customerEmail: customerEmail,
      isActive: true 
    });

    if (!savedCard) {
      console.log('❌ No active saved card found');
      return res.status(404).json({
        success: false,
        message: 'No active payment method found. Please add a new card.'
      });
    }

    console.log('✅ Saved card found:', {
      cardholderName: savedCard.cardholderName,
      maskedCardNumber: savedCard.maskedCardNumber,
      cardBrand: savedCard.cardBrand,
      afs_registration_id: savedCard.afs_registration_id
    });

    // Find the failed payment to retry
    const failedPayment = subscription.payment_schedule.find(p => 
      p.status === 'failed'
    );
    
    // Debug: Log the exact failed payment found
    if (failedPayment) {
      console.log('🎯 Found failed payment:', {
        installment_number: failedPayment.installment_number,
        status: failedPayment.status,
        amount: failedPayment.amount,
        _id: failedPayment._id
      });
    }

    if (!failedPayment) {
      console.log('❌ No failed payments found to retry');
      return res.status(400).json({
        success: false,
        message: 'No failed payments found to retry. All payments are completed.'
      });
    }

    console.log('✅ Failed payment found for retry:', {
      installment_number: failedPayment.installment_number,
      due_date: failedPayment.due_date,
      amount: failedPayment.amount,
      status: failedPayment.status
    });

    // Debug: Log all payments in the schedule
    console.log('📋 All payments in schedule:');
    subscription.payment_schedule.forEach(p => {
      console.log(`  - Payment ${p.installment_number}: ${p.status} (${p.amount})`);
    });

    // Validate AFS registration ID format (must be UUID format)
    if (!savedCard.afs_registration_id) {
      console.log('❌ No AFS registration ID found');
      return res.status(400).json({
        success: false,
        message: 'Payment method is not properly configured. Please contact support.'
      });
    }

    // Check if registration ID is in UUID format (32 characters, alphanumeric)
    const uuidRegex = /^[a-f0-9]{32}$/i;
    if (!uuidRegex.test(savedCard.afs_registration_id)) {
      console.log('❌ Invalid AFS registration ID format:', savedCard.afs_registration_id);
      return res.status(400).json({
        success: false,
        message: 'Payment method configuration error. Please contact support to update your payment method.'
      });
    }

    // Attempt the payment
    console.log('💳 Attempting payment retry...');
    const paymentResult = await attemptPaymentRetry(subscription, savedCard, failedPayment);

    if (paymentResult.success) {
      console.log('✅ Payment retry successful');
      
      // Update subscription and payment schedule
      const updatedSubscription = await updateSubscriptionAfterRetry(subscription, failedPayment, paymentResult.transactionId);
      
      // Send retry success email (same as regular payment success)
      await sendRetrySuccessEmail(updatedSubscription, failedPayment, paymentResult.transactionId);
      
      // Check if subscription is now complete and send completion email if needed
      await checkAndHandleSubscriptionCompletion(updatedSubscription);
      
      return res.status(200).json({
        success: true,
        message: 'Payment retry successful!',
        transactionId: paymentResult.transactionId,
        amount: failedPayment.amount
      });
    } else {
      console.log('❌ Payment retry failed:', paymentResult.error);
      
      // Mark the payment as failed with failure_date
      await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          _id: subscription._id,
          'payment_schedule.installment_number': failedPayment.installment_number
        },
        {
          $set: {
            'payment_schedule.$.status': 'failed',
            'payment_schedule.$.failure_date': new Date()
          }
        }
      );
      console.log(`❌ Payment #${failedPayment.installment_number} marked as failed in payment schedule`);
      
      // Send failure email to customer
      await sendRetryFailureEmail(subscription, failedPayment, paymentResult.error);
      
      return res.status(400).json({
        success: false,
        message: 'Payment retry failed. Please try again or contact support.',
        error: paymentResult.error
      });
    }

  } catch (error) {
    console.error('💥 Error in retryPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Attempt to retry a payment using AFS Registration API (same as processServerToServerPayment)
 */
async function attemptPaymentRetry(subscription, savedCard, payment) {
  try {
    // Validate that we have the registration ID
    if (!savedCard.afs_registration_id) {
      throw new Error(`No AFS registration ID found for card ${savedCard._id}. Cannot process recurring payment.`);
    }

    const afsUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}/payments`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;
    
    // Calculate installment amount
    const installmentAmount = parseFloat(payment.amount.toFixed(2));
    
    const afsData = new URLSearchParams();
    afsData.append('entityId', entityId);
    afsData.append('amount', installmentAmount.toString());
    afsData.append('currency', 'AED');
    afsData.append('paymentType', 'DB'); // Pre-Authorization for recurring payments
    afsData.append('merchantTransactionId', `${subscription.quotepaymentId}_retry_${Date.now()}`);
    
    // Add standing instruction parameters for recurring payments
    afsData.append('standingInstruction.mode', 'REPEATED');
    afsData.append('standingInstruction.type', 'UNSCHEDULED');
    afsData.append('standingInstruction.source', 'CIT'); // Merchant Initiated Transaction
    
    const afsHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    
    console.log('🔗 AFS Registration Payment Retry Request Details:');
    console.log('- URL:', afsUrl);
    console.log('- Registration ID:', savedCard.afs_registration_id);
    console.log('- Entity ID:', entityId);
    console.log('- Amount:', installmentAmount);
    console.log('- Currency:', 'AED');
    console.log('- Payment Type:', 'PA (Pre-Authorization)');
    console.log('- Standing Instruction Mode:', 'REPEATED');
    console.log('- Standing Instruction Type:', 'UNSCHEDULED');
    console.log('- Standing Instruction Source:', 'MIT');
    console.log('- Merchant Transaction ID:', `${subscription.quotepaymentId}_retry_${Date.now()}`);
    console.log('- Card Details:', {
      maskedCardNumber: savedCard.maskedCardNumber,
      cardBrand: savedCard.cardBrand,
      cardholderName: savedCard.cardholderName,
      expiryMonth: savedCard.expiryMonth,
      expiryYear: savedCard.expiryYear
    });

    console.log('🚀 INITIATING AFS DEBIT FUND OPERATION FOR RETRY:');
    const response = await fetch(afsUrl, {
      method: 'POST',
      headers: afsHeaders,
      body: afsData
    });

    const result = await response.json();
    console.log('💳 AFS Retry Response:', result);

    if (result.result && result.result.code && result.result.code.startsWith('000.')) {
      return {
        success: true,
        transactionId: result.id,
        registrationId: result.registrationId
      };
    } else {
      return {
        success: false,
        error: result.result ? result.result.description : 'Payment failed'
      };
    }
  } catch (error) {
    console.error('💥 AFS Payment Retry Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update subscription after successful retry
 */
async function updateSubscriptionAfterRetry(subscription, payment, transactionId) {
  try {
    console.log('🔄 Updating subscription after successful retry...');
    console.log('📋 Payment details:', {
      installment_number: payment.installment_number,
      status: payment.status,
      amount: payment.amount,
      transactionId: transactionId,
      paymentId: payment._id
    });
    
    // Debug: Log the exact query being used
    console.log('🔍 MongoDB Query:', {
      _id: subscription._id,
      'payment_schedule.installment_number': payment.installment_number
    });

    // Update payment schedule
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscription._id, 
        'payment_schedule.installment_number': payment.installment_number 
      },
      { 
        $set: { 
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': transactionId,
          'payment_schedule.$.payment_date': new Date()
        } 
      },
      { new: true }
    );

    console.log('✅ Payment schedule updated:', updateResult ? 'Success' : 'Failed');
    
    // Verify the update by checking the payment schedule
    const updatedSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    const updatedPayment = updatedSubscription.payment_schedule.find(p => 
      p.installment_number === payment.installment_number
    );
    console.log('🔍 Verification - Updated payment status:', updatedPayment?.status);
    console.log('🔍 Verification - Updated payment transaction_id:', updatedPayment?.transaction_id);
    
    // Debug: Show all payments after update
    console.log('📋 All payments after update:');
    updatedSubscription.payment_schedule.forEach(p => {
      console.log(`  - Payment ${p.installment_number}: ${p.status} (Transaction: ${p.transaction_id || 'N/A'})`);
    });

    // Update subscription
    const nextDuePayment = subscription.payment_schedule.find(p => 
      p.installment_number === payment.installment_number + 1
    );

    let nextChargeDate = null;
    if (nextDuePayment) {
      nextChargeDate = new Date(nextDuePayment.due_date);
    } else {
      // If this was the last payment, set next charge date to null
      nextChargeDate = null;
    }

    await Vzat_Recurring_Data.findByIdAndUpdate(
      subscription._id,
      {
        $inc: { payments_completed: 1 },
        last_payment_date: new Date(),
        next_charge_date: nextChargeDate,
        payment_retry_count: 0 // Reset retry count on successful payment
      }
    );

    console.log('✅ Subscription updated successfully');
    
    // Call Salesforce API for successful retry payment
    try {
      console.log('🔍 Debug payment for Salesforce:', {
        installment_number: payment.installment_number,
        q_payment_id: payment.q_payment_id,
        status: payment.status,
        amount: payment.amount
      });
      
      const salesforcePaymentData = {
        quotepaymentId: subscription.quotepaymentId,
        amount: parseFloat(payment.amount),
        transactionId: transactionId,
        paymentType: 'Online_payment',
        paymentStatus: 'success',
        resultCode: '000.100.110', // Success code for retry
        resultDescription: 'Payment retry successful',
        timestamp: new Date().toISOString(),
        installmentNumber: payment.installment_number,
        nextDueDate: nextChargeDate ? new Date(nextChargeDate).toISOString().slice(0, 10) : null,
        Qp_number: payment.q_payment_id || subscription.Quote_payment_number || null // Add QP number from payment schedule with fallback
      };
      
      console.log('📋 Salesforce payload for retry payment:', {
        quotepaymentId: salesforcePaymentData.quotepaymentId,
        Qp_number: salesforcePaymentData.Qp_number,
        installmentNumber: salesforcePaymentData.installmentNumber,
        amount: salesforcePaymentData.amount
      });

      const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
      
      console.log('📊 Salesforce API result:', {
        success: salesforceResult.success,
        message: salesforceResult.message,
        error: salesforceResult.error || null
      });
      
      if (salesforceResult.success) {
        console.log(`✅ Salesforce updated successfully for retry payment #${payment.installment_number}`);
      } else {
        console.warn('⚠️ Salesforce update failed but retry payment was successful:', salesforceResult.error);
      }
      
    } catch (salesforceError) {
      console.error('❌ Error calling Salesforce API but retry payment was successful:', salesforceError);
      // Don't fail the retry if Salesforce fails - it's not critical
    }
    
    // Return the updated subscription
    const finalSubscription = await Vzat_Recurring_Data.findById(subscription._id);
    return finalSubscription;
  } catch (error) {
    console.error('💥 Error updating subscription:', error);
    throw error;
  }
}

/**
 * Send success email after retry attempt (same as regular payment success)
 */
async function sendRetrySuccessEmail(subscription, payment, transactionId) {
  try {
    console.log('📧 Sending retry success email...');
    
    const emailData = {
      quotepaymentId: subscription.quotepaymentId,
      q_payment_id: payment.q_payment_id || subscription.Quote_payment_number || subscription.quotepaymentId,
      Customer_name: subscription.Customer_name || 'Customer',
      contactName: subscription.contactName,
      opp_email: subscription.opp_email,
      opp_owner: subscription.opp_owner,
      payment_amount: payment.amount,
      payment_date: new Date(),
      installment_number: payment.installment_number,
      total_installments: subscription.InstallmentLeft,
      payment_method: 'Saved Card (Retry)',
      salesPersonDetails: subscription.salesPersonDetails
    };
    
    const emailResult = await sendPaymentSuccessNotificationEmail(emailData);
    
    if (emailResult.success) {
      console.log('📧 Retry success email sent successfully');
    } else {
      console.error('📧 Failed to send retry success email:', emailResult.error);
    }
  } catch (emailError) {
    console.error('📧 Error sending retry success email:', emailError);
  }
}

/**
 * Check if subscription is complete and send completion email if needed
 */
async function checkAndHandleSubscriptionCompletion(subscription) {
  try {
    console.log('🔍 Checking if subscription is complete...');
    
    // Check if ALL payments are completed (not just payments_completed count)
    const allPaymentsCompleted = subscription.payment_schedule.every(p => 
      p.status === 'completed' || p.status === 'paid'
    );
    
    console.log('📋 Payment completion status:', {
      payments_completed: subscription.payments_completed,
      total_installments: subscription.InstallmentLeft,
      all_payments_completed: allPaymentsCompleted,
      payment_schedule: subscription.payment_schedule.map(p => ({
        installment: p.installment_number,
        status: p.status
      }))
    });
    
    if (subscription.payments_completed >= subscription.InstallmentLeft && allPaymentsCompleted) {
      console.log(`🎉 SUBSCRIPTION COMPLETED via retry for ${subscription.quotepaymentId}!`);
      console.log(`✅ All ${subscription.payment_schedule.length} payments are completed`);
      
      // Check if already completed to prevent duplicate emails
      const currentStatus = await Vzat_Recurring_Data.findById(subscription._id).select('subscription_status');
      
      if (currentStatus.subscription_status !== 'completed') {
        // Update status to completed and set next_charge_date to null
        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          subscription_status: 'completed',
          next_charge_date: null,
          renewal_email_sent: true,
          renewal_email_sent_date: new Date()
        });
        
        // Send completion email to business team
        try {
          const { sendFinalRenewalEmail } = await import('../services/emailService.js');
          
          const emailResult = await sendFinalRenewalEmail({
            quotepaymentId: subscription.quotepaymentId,
            Quote_payment_number: subscription.Quote_payment_number,
            Customer_name: subscription.Customer_name,
            contactName: subscription.contactName,
            opp_email: subscription.opp_email,
            opp_owner: subscription.opp_owner,
            payments_completed: subscription.payments_completed,
            InstallmentLeft: subscription.InstallmentLeft,
            last_payment_date: subscription.last_payment_date,
            salesPersonDetails: subscription.salesPersonDetails
          });
          
          if (emailResult.success) {
            console.log('📧 Subscription completion email sent successfully');
          } else {
            console.error('📧 Failed to send completion email:', emailResult.error);
          }
        } catch (completionEmailError) {
          console.error('📧 Error sending completion email:', completionEmailError);
        }
      } else {
        console.log('📧 Subscription already marked as completed, skipping completion email');
      }
    } else {
      console.log('📋 Subscription not yet complete - some payments still pending/failed');
    }
  } catch (error) {
    console.error('💥 Error checking subscription completion:', error);
  }
}

/**
 * Send failure email after retry attempt
 */
async function sendRetryFailureEmail(subscription, payment, error) {
  try {
    console.log('📧 Sending retry failure email...');
    
    const installmentAmount = payment.amount;
    
    // Extract clean error message
    let cleanErrorMessage = error;
    if (error.includes('"description":"')) {
      try {
        const match = error.match(/"description":"([^"]+)"/);
        if (match && match[1]) {
          cleanErrorMessage = match[1];
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse error message, using original');
      }
    }
    
    const emailData = {
      quotepaymentId: subscription.quotepaymentId,
      q_payment_id: payment.q_payment_id || subscription.Quote_payment_number || subscription.quotepaymentId,
      Customer_name: subscription.Customer_name || 'Customer',
      contactName: subscription.contactName,
      opp_email: subscription.opp_email,
      opp_owner: subscription.opp_owner,
      payment_amount: installmentAmount,
      due_date: payment.due_date,
      failure_reason: cleanErrorMessage,
      payment_link: 'https://installment.virtuzone.com/login',
      salesPersonDetails: subscription.salesPersonDetails
    };
    
    const emailResult = await sendPaymentFailureNotificationEmail(emailData);
    
    if (emailResult.success) {
      console.log('📧 Retry failure email sent successfully');
    } else {
      console.error('📧 Failed to send retry failure email:', emailResult.error);
    }
  } catch (emailError) {
    console.error('📧 Error sending retry failure email:', emailError);
  }
}
