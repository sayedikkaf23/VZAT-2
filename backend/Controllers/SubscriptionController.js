import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { sendSubscriptionCompletedEmail, sendPaymentFailureEmail } from "../services/emailService.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Handle AFS webhook notifications for subscription events
 */
export const handleAFSWebhook = async (req, res) => {
  // Using persistent connection - no need to connect/disconnect
  
  try {
    console.log('🔔 AFS Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { 
      id, 
      paymentType, 
      result, 
      amount, 
      currency,
      merchantTransactionId,
      registrationId,
      timestamp 
    } = req.body;

    // Find the subscription record
    const subscriptionRecord = await Vzat_Recurring_Data.findOne({ 
      quotepaymentId: merchantTransactionId 
    });

    if (!subscriptionRecord) {
      console.log(' Subscription record not found for merchantTransactionId:', merchantTransactionId);
      return res.status(404).json({ message: 'Subscription not found' });
    }

    console.log(`📋 Found subscription record: ${subscriptionRecord._id}`);

    // Handle different payment types
    if (paymentType === 'PA' && result.code.startsWith('000.')) {
      // Initial subscription setup successful
      console.log('Initial subscription setup successful');
      
      await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionRecord._id, {
        subscription_status: 'active',
        afs_registration_id: registrationId,
        payments_completed: 1,
        last_payment_date: new Date(timestamp)
      });
      
      // Call Salesforce API for successful payment
      try {
        console.log('🔄 Calling Salesforce API for initial subscription payment...');
        
        const salesforcePaymentData = {
          quotepaymentId: subscriptionRecord.quotepaymentId,
          amount: amount,
          transactionId: id,
          paymentType: 'Online_payment',
          paymentStatus: 'success',
          resultCode: result.code,
          resultDescription: result.description,
          timestamp: timestamp
        };

        const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
        
        if (salesforceResult.success) {
          const statusText = salesforceResult.payment_was_successful ? 'successful' : 'failed';
          console.log(`✅ Salesforce has been notified of ${statusText} initial payment`);
        } else {
          console.warn('⚠️ Salesforce update failed for initial payment:', salesforceResult.error);
        }
        
      } catch (salesforceError) {
        console.error('❌ Error calling Salesforce API for initial payment:', salesforceError);
      }
      
      // Schedule next payment
      await scheduleNextPayment(subscriptionRecord._id);
      
    } else if (paymentType === 'DB' && result.code.startsWith('000.')) {
      // Recurring payment successful
      console.log('Recurring payment successful');
      
      const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscriptionRecord._id,
        {
          $inc: { payments_completed: 1 },
          last_payment_date: new Date(timestamp)
        },
        { new: true }
      );

      // Call Salesforce API for successful recurring payment
      try {
        console.log('🔄 Calling Salesforce API for recurring payment...');
        
        const salesforcePaymentData = {
          quotepaymentId: subscriptionRecord.quotepaymentId,
          amount: amount,
          transactionId: id,
          paymentType: 'Online_payment',
          paymentStatus: 'success',
          resultCode: result.code,
          resultDescription: result.description,
          timestamp: timestamp
        };

        const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
        
        if (salesforceResult.success) {
          const statusText = salesforceResult.payment_was_successful ? 'successful' : 'failed';
          console.log(`✅ Salesforce has been notified of ${statusText} recurring payment`);
        } else {
          console.warn('⚠️ Salesforce update failed for recurring payment:', salesforceResult.error);
        }
        
      } catch (salesforceError) {
        console.error('❌ Error calling Salesforce API for recurring payment:', salesforceError);
      }

      // Check if subscription is complete
      if (updatedRecord.payments_completed >= updatedRecord.InstallmentLeft) {
        // Only update status if not already completed (prevents duplicate emails)
        const currentStatus = await Vzat_Recurring_Data.findById(subscriptionRecord._id).select('subscription_status');
        
        if (currentStatus.subscription_status !== 'completed') {
          await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionRecord._id, {
            subscription_status: 'completed'
          });
          console.log('🎉 Subscription completed!');
          
          // Send completion email to business team (only for newly completed subscriptions)
          try {
            const emailResult = await sendSubscriptionCompletedEmail({
              quotepaymentId: updatedRecord.quotepaymentId,
              OpportunityId: updatedRecord.OpportunityId,
              QuoteId: updatedRecord.QuoteId,
              Total_After_VAT_Currency: updatedRecord.Total_After_VAT_Currency,
              InstallmentLeft: updatedRecord.InstallmentLeft,
              payments_completed: updatedRecord.payments_completed,
              last_payment_date: updatedRecord.last_payment_date
            });
            
            if (emailResult.success) {
              console.log('📧 Subscription completion email sent successfully');
            } else {
              console.error('📧 Failed to send completion email:', emailResult.error);
            }
          } catch (emailError) {
            console.error('📧 Error sending completion email:', emailError);
          }
        } else {
          console.log('ℹ️ Subscription already marked as completed - skipping duplicate completion email');
        }
      } else {
        // Schedule next payment
        await scheduleNextPayment(subscriptionRecord._id);
      }
      
    } else {
      // Payment failed
      console.log('❌ Payment failed:', result);
      
      // Call Salesforce API for failed payment
      try {
        console.log('🔄 Calling Salesforce API for failed payment...');
        
        const salesforcePaymentData = {
          quotepaymentId: subscriptionRecord.quotepaymentId,
          amount: amount,
          transactionId: id,
          paymentType: 'Online_payment',
          paymentStatus: 'failed',
          resultCode: result.code,
          resultDescription: result.description || 'Payment processing failed',
          timestamp: timestamp
        };

        const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
        
        if (salesforceResult.success) {
          console.log('✅ Salesforce has been called and updated successfully for failed payment');
        } else {
          console.warn('⚠️ Salesforce update failed for failed payment:', salesforceResult.error);
        }
        
      } catch (salesforceError) {
        console.error('❌ Error calling Salesforce API for failed payment:', salesforceError);
      }
      
      // Send failure email to operations team
      try {
        const emailResult = await sendPaymentFailureEmail({
          quotepaymentId: subscriptionRecord.quotepaymentId,
          OpportunityId: subscriptionRecord.OpportunityId,
          QuoteId: subscriptionRecord.QuoteId,
          error_message: result.description || 'Payment processing failed',
          payment_amount: amount,
          attempt_date: new Date(timestamp),
          payments_completed: subscriptionRecord.payments_completed || 0,
          total_installments: subscriptionRecord.InstallmentLeft,
          afs_response: result
        });
        
        if (emailResult.success) {
          console.log('📧 Payment failure email sent successfully');
        } else {
          console.error('📧 Failed to send failure email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('📧 Error sending failure email:', emailError);
      }
      
      // Log the failure but don't cancel subscription immediately
      // You might want to implement retry logic here
    }

    // Log the webhook event
    Post_Common_DB_Log_Data('/webhook/afs', req.body, { 
      message: 'Webhook processed successfully',
      subscriptionId: subscriptionRecord._id 
    });

    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error(' Webhook processing error:', error);
    Post_Common_DB_Log_Data('/webhook/afs', req.body, { 
      error: error.message 
    });
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

/**
 * Schedule next payment based on the date logic
 */
async function scheduleNextPayment(subscriptionId) {
  try {
    const subscription = await Vzat_Recurring_Data.findById(subscriptionId);
    if (!subscription || subscription.subscription_status !== 'active') {
      return;
    }

    // Calculate next charge date using the same logic as creation
    const currentDate = new Date();
    const day = currentDate.getDate();
    
    let chargeDay = day <= 15 ? 10 : 25;
    let chargeMonth = currentDate.getMonth() + 1;
    let chargeYear = currentDate.getFullYear();
    
    if (chargeMonth > 11) {
      chargeMonth = 0;
      chargeYear += 1;
    }
    
    const nextChargeDate = new Date(Date.UTC(chargeYear, chargeMonth, chargeDay, 0, 0, 0, 0));
    
    await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionId, {
      next_charge_date: nextChargeDate
    });
    
    console.log(`📅 Next payment scheduled for ${subscription.quotepaymentId}: ${nextChargeDate.toISOString().slice(0, 10)}`);
    
  } catch (error) {
    console.error(' Error scheduling next payment:', error);
  }
}

/**
 * Process recurring payments (called by cron job)
 */
export const processRecurringPayments = async (req, res) => {
  // Using persistent connection - no need to connect/disconnect
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // End of day
    
    console.log(`🔄 Processing recurring payments for: ${today.toISOString().slice(0, 10)}`);
    
    // First, let's check what subscriptions exist for today (debugging)
    const allActiveSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: 'active',
      next_charge_date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    console.log(`🔍 Debug: Found ${allActiveSubscriptions.length} active subscriptions for today`);
    allActiveSubscriptions.forEach(sub => {
      console.log(`📋 Subscription ${sub.quotepaymentId}: payments_completed=${sub.payments_completed}, InstallmentLeft=${sub.InstallmentLeft}, last_processed_date=${sub.last_processed_date}`);
    });
    
    // Find all active subscriptions due for payment today
    // IMPORTANT: Exclude subscriptions already processed today to prevent duplicate emails
    const dueSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: 'active',
      next_charge_date: {
        $gte: today,
        $lt: tomorrow
      },
      InstallmentLeft: { $exists: true, $ne: null },
      $expr: { 
        $lt: ['$payments_completed', '$InstallmentLeft'] 
      },
      // Prevent duplicate processing: Skip if already processed today
      $or: [
        { last_processed_date: { $exists: false } }, // Never processed
        { 
          last_processed_date: {
            $lt: today // Last processed before today
          }
        }
      ]
    });
    
    console.log(`📋 Found ${dueSubscriptions.length} subscriptions due for payment (excluding already processed today)`);
    
    const results = [];
    
    for (const subscription of dueSubscriptions) {
      try {
        // Mark as processed today to prevent duplicate processing
        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          last_processed_date: new Date()
        });
        
        const paymentResult = await processSubscriptionPayment(subscription);
        results.push({
          quotepaymentId: subscription.quotepaymentId,
          status: 'processed',
          result: paymentResult
        });
      } catch (error) {
        console.error(`❌ Failed to process payment for ${subscription.quotepaymentId}:`, error);
        
        // Send failure email to operations team
        try {
          const emailResult = await sendPaymentFailureEmail({
            quotepaymentId: subscription.quotepaymentId,
            OpportunityId: subscription.OpportunityId,
            QuoteId: subscription.QuoteId,
            error_message: error.message,
            payment_amount: parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)),
            attempt_date: new Date(),
            payments_completed: subscription.payments_completed || 0,
            total_installments: subscription.InstallmentLeft,
            afs_response: null
          });
          
          if (emailResult.success) {
            console.log('📧 Payment failure email sent successfully');
          } else {
            console.error('📧 Failed to send failure email:', emailResult.error);
          }
        } catch (emailError) {
          console.error('📧 Error sending failure email:', emailError);
        }
        
        results.push({
          quotepaymentId: subscription.quotepaymentId,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    const response = {
      message: 'Recurring payments processing completed',
      date: today.toISOString().slice(0, 10),
      total_processed: results.length,
      results
    };
    
    Post_Common_DB_Log_Data('/cron/recurring-payments', { date: today }, response);
    
    if (res) {
      res.json(response);
    } else {
      console.log('✅ Cron job completed:', response);
      return response;
    }
    
  } catch (error) {
    console.error('❌ Recurring payments processing error:', error);
    const errorResponse = { 
      message: 'Recurring payments processing failed', 
      error: error.message 
    };
    
    if (res) {
      res.status(500).json(errorResponse);
    } else {
      console.error('❌ Cron job failed:', errorResponse);
      return errorResponse;
    }
  }
};

/**
 * Process a single subscription payment
 */
async function processSubscriptionPayment(subscription) {
  console.log(`💳 Processing payment for subscription: ${subscription.quotepaymentId}`);
  
  if (!subscription.afs_registration_id) {
    throw new Error('No registration ID found for subscription');
  }
  
  // Check if we're using mock data for testing
  if (subscription.afs_registration_id.includes('mock')) {
    console.log(`🧪 Mock mode detected - simulating successful payment`);
    
    // Simulate successful AFS response for testing
    const mockResponse = {
      id: `mock-payment-${Date.now()}`,
      result: {
        code: "000.100.110",
        description: "Request successfully processed in 'Merchant in Integrator Test Mode'"
      },
      amount: parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)),
      currency: "AED",
      paymentType: "DB",
      merchantTransactionId: `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`
    };
    
    console.log(`Mock payment initiated successfully for ${subscription.quotepaymentId}`);
    return mockResponse;
  }
  
  // Real AFS API call for production
  const afsUrl = `${process.env.AFS_DOMAIN}/v1/payments`;
  const entityId = process.env.AFS_ENTITY_ID;
  const accessToken = process.env.AFS_ACCESS_TOKEN;
  
  // Calculate installment amount
  const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2));
  
  const afsData = new URLSearchParams();
  afsData.append('entityId', entityId);
  afsData.append('amount', installmentAmount.toString());
  afsData.append('currency', 'AED');
  afsData.append('paymentType', 'DB');
  afsData.append('recurringType', 'REPEATED'); // Mark as recurring payment
  afsData.append('registrationId', subscription.afs_registration_id);
  afsData.append('merchantTransactionId', `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`);
  
  const afsHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/x-www-form-urlencoded"
  };
  
  const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });
  
  console.log(`📋 AFS payment response:`, response.data);
  
  if (response.data && response.data.result && response.data.result.code.startsWith('000.')) {
    // Payment successful - webhook will handle the rest
    console.log(`Payment initiated successfully for ${subscription.quotepaymentId}`);
    return response.data;
  } else {
    throw new Error(`Payment failed: ${response.data?.result?.description || 'Unknown error'}`);
  }
}

/**
 * Get subscription status
 */
export const getSubscriptionStatus = async (req, res) => {
  
  
  try {
    const { quotepaymentId } = req.params;
    
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Debug logging
    console.log(`🔍 Debug subscription data for ${quotepaymentId}:`);
    console.log(`  InstallmentLeft: ${subscription.InstallmentLeft}`);
    console.log(`  payments_completed: ${subscription.payments_completed}`);
    console.log(`  Total_After_VAT_Currency: ${subscription.Total_After_VAT_Currency}`);
    
    const response = {
      quotepaymentId: subscription.quotepaymentId,
      subscription_status: subscription.subscription_status,
      is_subscription: subscription.is_subscription,
      total_installments: subscription.InstallmentLeft,
      payments_completed: subscription.payments_completed,
      remaining_payments: subscription.InstallmentLeft && subscription.payments_completed ? 
        subscription.InstallmentLeft - subscription.payments_completed : null,
      next_charge_date: subscription.next_charge_date,
      last_payment_date: subscription.last_payment_date,
      installment_amount: subscription.InstallmentLeft && subscription.Total_After_VAT_Currency ? 
        parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)) : null,
      total_amount: subscription.Total_After_VAT_Currency,
      created_date: subscription.CreatedDate,
      afs_checkout_id: subscription.afs_checkout_id,
      afs_registration_id: subscription.afs_registration_id
    };
    
    res.json(response);
    
  } catch (error) {
    console.error(' Error getting subscription status:', error);
    res.status(500).json({ message: 'Failed to get subscription status' });
  } finally {
    
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  
  
  try {
    const { quotepaymentId } = req.params;
    
    const subscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      { subscription_status: 'cancelled' },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    console.log(`🚫 Subscription cancelled: ${quotepaymentId}`);
    
    Post_Common_DB_Log_Data('/subscription/cancel', { quotepaymentId }, { 
      message: 'Subscription cancelled successfully',
      subscriptionId: subscription._id 
    });
    
    res.json({ 
      message: 'Subscription cancelled successfully',
      quotepaymentId,
      status: 'cancelled'
    });
    
  } catch (error) {
    console.error(' Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  } finally {
    
  }
};

/**
 * Update subscription next charge date (for testing purposes)
 */
export const updateNextChargeDate = async (req, res) => {
  
  
  try {
    const { quotepaymentId } = req.params;
    const { next_charge_date } = req.body;
    
    const subscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      { next_charge_date: new Date(next_charge_date) },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    console.log(`📅 Updated next charge date for ${quotepaymentId}: ${next_charge_date}`);
    
    res.json({ 
      message: 'Next charge date updated successfully',
      quotepaymentId,
      next_charge_date: subscription.next_charge_date
    });
    
  } catch (error) {
    console.error(' Error updating next charge date:', error);
    res.status(500).json({ message: 'Failed to update next charge date' });
  } finally {
    
  }
};

/**
 * Fix missing InstallmentLeft field (for testing purposes)
 */
export const fixInstallmentLeft = async (req, res) => {
  
  
  try {
    const { quotepaymentId } = req.params;
    const { installment_left } = req.body;
    
    console.log(`🔧 Attempting to fix InstallmentLeft for ${quotepaymentId} with value: ${installment_left}`);
    
    // First, check what's currently in the database
    const currentSub = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    console.log(`🔍 Current InstallmentLeft value: ${currentSub?.InstallmentLeft}`);
    
    const subscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      { InstallmentLeft: installment_left },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    console.log(`🔧 Fixed InstallmentLeft for ${quotepaymentId}: ${installment_left}`);
    console.log(`🔍 After update - InstallmentLeft: ${subscription.InstallmentLeft}, payments_completed: ${subscription.payments_completed}`);
    
    res.json({ 
      message: 'InstallmentLeft field updated successfully',
      quotepaymentId,
      InstallmentLeft: subscription.InstallmentLeft,
      remaining_payments: subscription.InstallmentLeft && subscription.payments_completed !== undefined ? 
        subscription.InstallmentLeft - subscription.payments_completed : null
    });
    
  } catch (error) {
    console.error(' Error updating InstallmentLeft:', error);
    res.status(500).json({ message: 'Failed to update InstallmentLeft' });
  } finally {
    
  }
};

/**
 * Test email notifications - FOR TESTING ONLY
 */
export const testSubscriptionCompletionEmail = async (req, res) => {
  try {
    const { quotepaymentId } = req.body;
    
    if (!quotepaymentId) {
      return res.status(400).json({ message: 'quotepaymentId is required for testing' });
    }
    
    // Mock subscription data for testing
    const mockSubscriptionData = {
      quotepaymentId: quotepaymentId,
      OpportunityId: 'TEST-OPP-123',
      QuoteId: 'TEST-QUOTE-123',
      Total_After_VAT_Currency: 1800,
      InstallmentLeft: 6,
      payments_completed: 6,
      last_payment_date: new Date()
    };
    
    const emailResult = await sendSubscriptionCompletedEmail(mockSubscriptionData);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Subscription completion email sent successfully',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailResult.error
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing email',
      error: error.message
    });
  }
};

/**
 * Test payment failure email - FOR TESTING ONLY
 */
export const testPaymentFailureEmail = async (req, res) => {
  try {
    const { quotepaymentId } = req.body;
    
    if (!quotepaymentId) {
      return res.status(400).json({ message: 'quotepaymentId is required for testing' });
    }
    
    // Mock failure data for testing
    const mockFailureData = {
      quotepaymentId: quotepaymentId,
      OpportunityId: 'TEST-OPP-123',
      QuoteId: 'TEST-QUOTE-123',
      error_message: 'TEST: Insufficient funds in customer account',
      payment_amount: 300,
      attempt_date: new Date(),
      payments_completed: 3,
      total_installments: 6,
      afs_response: {
        result: {
          code: '800.100.162',
          description: 'Transaction declined (not enough funds)'
        },
        id: 'TEST123456789',
        paymentType: 'DB'
      }
    };
    
    const emailResult = await sendPaymentFailureEmail(mockFailureData);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Payment failure email sent successfully',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailResult.error
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing email',
      error: error.message
    });
  }
};

export default {
  handleAFSWebhook,
  processRecurringPayments,
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft,
  testSubscriptionCompletionEmail,
  testPaymentFailureEmail
};
