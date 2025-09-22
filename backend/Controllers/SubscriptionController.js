import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { sendSubscriptionCompletedEmail, sendPaymentFailureEmail, sendFinalRenewalEmail, sendPaymentFailureNotificationEmail, sendPaymentSuccessNotificationEmail } from "../services/emailService.js";
import { createCustomerAccount, saveCustomerCard } from "./CustomerRegistration.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Update payment schedule status when a payment is completed
 */
async function updatePaymentScheduleStatus(subscriptionId, paymentNumber, transactionId) {
  try {
    
    const subscription = await Vzat_Recurring_Data.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
      subscription.payment_schedule.forEach((payment, index) => {
      });
    } else {
      // No payment schedule found in subscription
    }

    // Update the specific payment in the payment_schedule array
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscriptionId,
        'payment_schedule.installment_number': paymentNumber
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

    if (updateResult) {
      
      // Find the updated payment in the schedule
      const updatedPayment = updateResult.payment_schedule.find(p => p.installment_number ***REMOVED***= paymentNumber);
      if (updatedPayment) {

      }
      
      // Update the next payment status to 'due' if it exists
      const nextPaymentNumber = paymentNumber + 1;
      
      const nextPaymentUpdate = await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          _id: subscriptionId,
          'payment_schedule.installment_number': nextPaymentNumber,
          'payment_schedule.status': 'pending'
        },
        {
          $set: {
            'payment_schedule.$.status': 'due'
          }
        },
        { new: true }
      );
      
      if (nextPaymentUpdate) {
        
        // Log updated schedule
        nextPaymentUpdate.payment_schedule.forEach((payment, index) => {
        });
      } else {
      }
    } else {
      const currentSub = await Vzat_Recurring_Data.findById(subscriptionId);
      if (currentSub && currentSub.payment_schedule) {
        currentSub.payment_schedule.forEach(payment => {
        });
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle AFS webhook notifications for subscription events
 */
export const handleAFSWebhook = async (req, res) => {
  // Using persistent connection - no need to connect/disconnect
  
  try {
    
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
      
      const allSubscriptions = await Vzat_Recurring_Data.find({}).select('quotepaymentId Customer_name opp_email').limit(5);
      console.log('📋 Found these subscriptions:', allSubscriptions.map(sub => ({
        quotepaymentId: sub.quotepaymentId,
        customer: sub.Customer_name,
        email: sub.opp_email
      })));
      
      return res.status(404).json({ message: 'Subscription not found' });
    }

   

    // Handle different payment types
   
    
    if (paymentType ***REMOVED***= 'DB' && result.code.startsWith('000.')) {
      // Check if this is the first payment (subscription status is pending)
      const isFirstPayment = subscriptionRecord.subscription_status ***REMOVED***= 'pending' && (subscriptionRecord.payments_completed || 0) ***REMOVED***= 0;
      
      if (isFirstPayment) {
        // First payment successful - activate subscription
        
        const updateResult = await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionRecord._id, {
          subscription_status: 'active',
          afs_registration_id: registrationId,
          payments_completed: 1,
          last_payment_date: new Date(timestamp)
        }, { new: true });
        
        
        // Update payment schedule status for the first payment
        const scheduleUpdateResult = await updatePaymentScheduleStatus(subscriptionRecord._id, 1, id);
        
        // Call Salesforce API for successful payment
        try {
          
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
            console.log(`✅ Salesforce has been notified of ${statusText} first payment`);
          } else {
            console.warn('⚠️ Salesforce update failed for first payment:', salesforceResult.error);
          }
          
        } catch (salesforceError) {
          console.error('❌ Error calling Salesforce API for first payment:', salesforceError);
        }
        
        // 🆕 CREATE CUSTOMER ACCOUNT AFTER FIRST SUCCESSFUL PAYMENT
        // Skip customer creation if this is an auto-triggered webhook (already done in payment result)
        if (!req.body.skipCustomerCreation) {
          try {
            const customerCreationResult = await createCustomerAccount(subscriptionRecord);
            
            if (customerCreationResult.success) {
              console.log('✅ Customer account created successfully');
            } else {
              console.error('❌ Failed to create customer account:', customerCreationResult.error);
            }
          } catch (customerError) {
          }
        } else {
          console.log('ℹ️ Skipping customer creation (auto-triggered webhook - already done in payment result)');
        }
        
        // 🆕 SAVE CUSTOMER CARD DETAILS AFTER FIRST SUCCESSFUL PAYMENT
        // Skip card saving if this is an auto-triggered webhook (already done in payment result)
        if (!req.body.skipCustomerCreation) {
          try {
            const cardSaveResult = await saveCustomerCard({
              ...subscriptionRecord.toObject(),
              result: result // Pass AFS result for card details
            });
            
            if (cardSaveResult.success) {
            } else {
            }
          } catch (cardError) {
            console.error('❌ Error saving customer card:', cardError);
          }
        } else {
          console.log('ℹ️ Skipping card saving (auto-triggered webhook - already done in payment result)');
        }
        
        // Schedule next payment if this is a subscription with multiple installments
        if (subscriptionRecord.InstallmentLeft > 1) {
          await scheduleNextPayment(subscriptionRecord._id);
        }
        
      } else {
        // Recurring payment successful
      
      const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscriptionRecord._id,
        {
          $inc: { payments_completed: 1 },
          last_payment_date: new Date(timestamp)
        },
        { new: true }
      );

     

      // Update payment schedule status for the current payment
      const scheduleUpdateResult = await updatePaymentScheduleStatus(subscriptionRecord._id, updatedRecord.payments_completed, id);

      // Call Salesforce API for successful recurring payment
      try {
        
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
        } else {
          console.warn('⚠️ Salesforce update failed for recurring payment:', salesforceResult.error);
        }
        
      } catch (salesforceError) {
        console.error('❌ Error calling Salesforce API for recurring payment:', salesforceError);
      }

      // Send customer notification email for successful payment
      try {
        const successResult = await sendPaymentSuccessNotificationEmail({
          quotepaymentId: updatedRecord.quotepaymentId,
          Customer_name: updatedRecord.Customer_name,
          opp_email: updatedRecord.opp_email,
          payment_amount: amount,
          payment_date: new Date(timestamp),
          installment_number: updatedRecord.payments_completed,
          total_installments: updatedRecord.InstallmentLeft,
          payment_method: 'Card',
          salesPersonDetails: updatedRecord.salesPersonDetails
        });
        
        if (successResult.success) {
          console.log('📧 Customer payment success notification sent successfully');
        } else {
          console.error('📧 Failed to send customer success notification:', successResult.error);
        }
      } catch (successNotificationError) {
        console.error('📧 Error sending customer success notification:', successNotificationError);
      }

      // Check if subscription is complete
      if (updatedRecord.payments_completed >= updatedRecord.InstallmentLeft) {
        // Only update status if not already completed (prevents duplicate emails)
        const currentStatus = await Vzat_Recurring_Data.findById(subscriptionRecord._id).select('subscription_status');
        
        if (currentStatus.subscription_status !***REMOVED*** 'completed') {
          await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionRecord._id, {
            subscription_status: 'completed'
          });
          
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
            } else {
              console.error('📧 Failed to send completion email:', emailResult.error);
            }
            // Also send final renewal email to customer, devtech, and opp owner
            try {
              await sendFinalRenewalEmail({
                quotepaymentId: updatedRecord.quotepaymentId,
                Customer_name: updatedRecord.Customer_name,
                opp_email: updatedRecord.opp_email,
                payments_completed: updatedRecord.payments_completed,
                InstallmentLeft: updatedRecord.InstallmentLeft,
                last_payment_date: updatedRecord.last_payment_date,
                salesPersonDetails: updatedRecord.salesPersonDetails
              });
            } catch (finalEmailError) {
              console.error('📧 Error sending final renewal email:', finalEmailError);
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
      }
      
    } else {
      // Payment failed
      
      // Call Salesforce API for failed payment
      try {
        
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

      // Send customer notification email for payment failure
      try {
        // Get the current payment schedule to find due date
        const currentPayment = subscriptionRecord.payment_schedule?.find(
          payment => payment.installment_number ***REMOVED***= (subscriptionRecord.payments_completed || 0) + 1
        );
        
        const notificationResult = await sendPaymentFailureNotificationEmail({
          quotepaymentId: subscriptionRecord.quotepaymentId,
          Customer_name: subscriptionRecord.Customer_name,
          opp_email: subscriptionRecord.opp_email,
          payment_amount: amount,
          due_date: currentPayment?.due_date || subscriptionRecord.next_charge_date,
          failure_reason: result.description || 'Payment processing failed',
          payment_link: `${process.env.BASE_URL || 'https://vzatnew.yeepeey.com'}/payment-schedule?quotepaymentId=${subscriptionRecord.quotepaymentId}`,
          salesPersonDetails: subscriptionRecord.salesPersonDetails
        });
        
        if (notificationResult.success) {
          console.log('📧 Customer payment failure notification sent successfully');
        } else {
          console.error('📧 Failed to send customer notification:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('📧 Error sending customer notification:', notificationError);
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
    if (!subscription || subscription.subscription_status !***REMOVED*** 'active') {
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
    
    
    // First, let's check what subscriptions exist for today (debugging)
    const allActiveSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: 'active',
      next_charge_date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
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
    const errorResponse = { 
      message: 'Recurring payments processing failed', 
      error: error.message 
    };
    
    if (res) {
      res.status(500).json(errorResponse);
    } else {
      return errorResponse;
    }
  }
};

/**
 * Process a single subscription payment
 */
async function processSubscriptionPayment(subscription) {
  
  if (!subscription.afs_registration_id) {
    throw new Error('No registration ID found for subscription');
  }
  
  // Check if we're using mock data for testing
  if (subscription.afs_registration_id.includes('mock')) {
    
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
  
  
  if (response.data && response.data.result && response.data.result.code.startsWith('000.')) {
    // Payment successful - webhook will handle the rest
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
    
    
    res.json({ 
      message: 'Next charge date updated successfully',
      quotepaymentId,
      next_charge_date: subscription.next_charge_date
    });
    
  } catch (error) {
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
    
    
    // First, check what's currently in the database
    const currentSub = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    const subscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      { InstallmentLeft: installment_left },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    
    res.json({ 
      message: 'InstallmentLeft field updated successfully',
      quotepaymentId,
      InstallmentLeft: subscription.InstallmentLeft,
      remaining_payments: subscription.InstallmentLeft && subscription.payments_completed !***REMOVED*** undefined ? 
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
