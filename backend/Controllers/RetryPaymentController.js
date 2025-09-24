import mongoose from 'mongoose';
import Vzat_Recurring_Data from '../model/VzatRecurringDataModel.js';
import SavedCard from '../model/SavedCardModel.js';
import Customer from '../model/CustomerLoginModel.js';
import { sendPaymentFailureNotificationEmail } from '../services/emailService.js';

/**
 * Retry a failed payment for a customer
 * This allows customers to manually retry failed payments from their portal
 */
export const retryPayment = async (req, res) => {
  try {
    console.log('🔄 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= PAYMENT RETRY REQUEST ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
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
    if (subscription.subscription_status !***REMOVED*** 'active') {
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
      p.status ***REMOVED***= 'failed'
    );

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
      await updateSubscriptionAfterRetry(subscription, failedPayment, paymentResult.transactionId);
      
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
    afsData.append('paymentType', 'PA'); // Pre-Authorization for recurring payments
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

    // Update payment schedule
    await Vzat_Recurring_Data.findOneAndUpdate(
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
      }
    );

    // Update subscription
    const nextDuePayment = subscription.payment_schedule.find(p => 
      p.installment_number ***REMOVED***= payment.installment_number + 1
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
  } catch (error) {
    console.error('💥 Error updating subscription:', error);
    throw error;
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
      Customer_name: subscription.Customer_name || 'Customer',
      opp_email: subscription.opp_email,
      payment_amount: installmentAmount,
      due_date: payment.due_date,
      failure_reason: cleanErrorMessage,
      payment_link: 'https://vzatnew.yeepeey.com/login',
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
