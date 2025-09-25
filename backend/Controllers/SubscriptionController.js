import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import SavedCard from "../model/SavedCardModel.js";
import Customer from "../model/CustomerLoginModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { sendSubscriptionCompletedEmail, sendFinalRenewalEmail, sendPaymentFailureNotificationEmail, sendPaymentSuccessNotificationEmail } from "../services/emailService.js";
import { createCustomerAccount, saveCustomerCard } from "./CustomerRegistration.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Check if subscription is complete and handle completion logic
 * This function ensures consistent completion handling across all payment flows
 */
async function checkAndHandleSubscriptionCompletion(subscription) {
  try {
    console.log('🔍 Checking if subscription is complete...');
    
    // Check if ALL payments are completed (not just payments_completed count)
    const allPaymentsCompleted = subscription.payment_schedule.every(p => 
      p.status ***REMOVED***= 'completed' || p.status ***REMOVED***= 'paid'
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
      console.log(`🎉 SUBSCRIPTION COMPLETED for ${subscription.quotepaymentId}!`);
      console.log(`✅ All ${subscription.payment_schedule.length} payments are completed`);
      
      // Check if already completed to prevent duplicate emails
      const currentStatus = await Vzat_Recurring_Data.findById(subscription._id).select('subscription_status');
      
      if (currentStatus.subscription_status !***REMOVED*** 'completed') {
        // Update status to completed and set next_charge_date to null
        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          subscription_status: 'completed',
          next_charge_date: null
        });
        
        // Send completion email to business team
        try {
          const emailResult = await sendSubscriptionCompletedEmail({
            quotepaymentId: subscription.quotepaymentId,
            OpportunityId: subscription.OpportunityId,
            QuoteId: subscription.QuoteId,
            Total_After_VAT_Currency: subscription.Total_After_VAT_Currency,
            InstallmentLeft: subscription.InstallmentLeft,
            payments_completed: subscription.payments_completed,
            last_payment_date: subscription.last_payment_date
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
      
      return true; // Subscription is complete
    } else {
      console.log('📋 Subscription not yet complete - some payments still pending/failed');
      return false; // Subscription is not complete
    }
  } catch (error) {
    console.error('💥 Error checking subscription completion:', error);
    return false;
  }
}

/**
 * Update payment schedule status when a payment is completed
 */
async function updatePaymentScheduleStatus(subscriptionId, paymentNumber, transactionId) {
  try {
    console.log(`📅 Updating payment schedule for payment #${paymentNumber} with transaction ID: ${transactionId}`);
    
    const subscription = await Vzat_Recurring_Data.findById(subscriptionId);
    if (!subscription) {
      console.log('❌ Subscription not found');
      return { success: false, error: 'Subscription not found' };
    }

    console.log(`📅 Subscription has ${subscription.payment_schedule?.length || 0} payments in schedule`);

    if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
      subscription.payment_schedule.forEach((payment, index) => {
        console.log(`📅 Payment ${payment.installment_number}: ${payment.status} (${payment.amount} AED)`);
      });
    } else {
      console.log('⚠️ No payment schedule found in subscription - skipping schedule update');
      return { success: true, message: 'No payment schedule to update' };
    }

    // Check if the payment number exists in the schedule
    const targetPayment = subscription.payment_schedule.find(p => p.installment_number ***REMOVED***= paymentNumber);
    if (!targetPayment) {
      console.log(`⚠️ Payment #${paymentNumber} not found in schedule - skipping schedule update`);
      return { success: true, message: `Payment #${paymentNumber} not found in schedule` };
    }

    console.log(`📅 Found payment #${paymentNumber} in schedule: ${targetPayment.status}`);

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
      console.log(`✅ Payment #${paymentNumber} marked as completed in schedule`);
      
      // Find the updated payment in the schedule
      const updatedPayment = updateResult.payment_schedule.find(p => p.installment_number ***REMOVED***= paymentNumber);
      if (updatedPayment) {
        console.log(`📅 Updated payment details:`, {
          installment_number: updatedPayment.installment_number,
          status: updatedPayment.status,
          transaction_id: updatedPayment.transaction_id,
          payment_date: updatedPayment.payment_date
        });
      }
      
      // Update the next payment status to 'due' if it exists
      const nextPaymentNumber = paymentNumber + 1;
      const nextPayment = subscription.payment_schedule.find(p => p.installment_number ***REMOVED***= nextPaymentNumber);
      
      if (nextPayment && nextPayment.status ***REMOVED***= 'pending') {
        console.log(`📅 Updating next payment #${nextPaymentNumber} to 'due' status`);
        
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
          console.log(`✅ Next payment #${nextPaymentNumber} marked as due`);
        } else {
          console.log(`⚠️ Next payment #${nextPaymentNumber} not found or already updated`);
        }
      } else {
        console.log(`ℹ️ Next payment #${nextPaymentNumber} not found or not pending (status: ${nextPayment?.status || 'N/A'})`);
      }

      return { success: true, updatedPayment, nextPaymentNumber };
    } else {
      console.log(`⚠️ Payment schedule update failed - no matching installment #${paymentNumber} found`);
      return { success: false, error: `No matching installment #${paymentNumber} found` };
    }
    
  } catch (error) {
    console.error('❌ Error updating payment schedule status:', error);
    console.error('❌ Error details:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handle AFS webhook notifications for subscription events
 */
export const handleAFSWebhook = async (req, res) => {
  // Using persistent connection - no need to connect/disconnect
  
  console.log('🔔 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= AFS WEBHOOK RECEIVED ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 Request IP:', req.ip);
  console.log('🌐 User Agent:', req.get('User-Agent'));
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  
  const { paymentType, merchantTransactionId, id, result } = req.body;
  
  console.log('🔍 WEBHOOK ANALYSIS:');
  console.log(`   - Payment Type: ${paymentType}`);
  console.log(`   - Merchant Transaction ID: ${merchantTransactionId}`);
  console.log(`   - Transaction ID: ${id}`);
  console.log(`   - Result Code: ${result?.code || 'N/A'}`);
  console.log(`   - Result Description: ${result?.description || 'N/A'}`);
  
  // Only process successful payments - disable failed payment processing to prevent failure emails
  if (!result || !result.code || !result.code.startsWith('000.')) {
    console.log('🚫 WEBHOOK DISABLED FOR FAILED PAYMENTS:');
  console.log(`   - Payment Type: ${paymentType}`);
  console.log(`   - Merchant Transaction ID: ${merchantTransactionId || 'N/A'}`);
  console.log(`   - Transaction ID: ${id || 'N/A'}`);
  console.log(`   - Result Code: ${result?.code || 'N/A'}`);
    console.log('ℹ️ Failed payment webhook processing disabled to prevent failure emails');
    console.log('ℹ️ Only successful payments are processed');
  
  // Log the disabled webhook
    Post_Common_DB_Log_Data('/webhook/afs-disabled-failed', req.body, { 
      message: 'Webhook disabled for failed payment - preventing failure emails',
    paymentType: paymentType,
    merchantTransactionId: merchantTransactionId,
    transactionId: id,
    result: result,
      reason: 'Failed payment processing disabled'
  });
  
  return res.status(200).json({ 
      message: 'Webhook disabled for failed payment - preventing failure emails',
    paymentType: paymentType,
    merchantTransactionId: merchantTransactionId,
    transactionId: id,
      status: 'disabled_failed_payment'
    });
  }
  
  // Process successful payments only
  console.log('✅ PROCESSING SUCCESSFUL PAYMENT WEBHOOK');
  console.log(`   - Payment Type: ${paymentType}`);
  console.log(`   - Merchant Transaction ID: ${merchantTransactionId}`);
  console.log(`   - Transaction ID: ${id}`);
  console.log(`   - Result Code: ${result.code}`);
  
  try {
    // Find the subscription record
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId: merchantTransactionId });
    
    if (!subscription) {
      console.log('❌ Subscription not found for quotepaymentId:', merchantTransactionId);
      return res.status(404).json({ 
        message: 'Subscription not found',
        quotepaymentId: merchantTransactionId
      });
    }
    
    console.log('✅ Subscription found:', {
      quotepaymentId: subscription.quotepaymentId,
      Customer_name: subscription.Customer_name,
      subscription_status: subscription.subscription_status,
      payments_completed: subscription.payments_completed
    });
    
    // Check if this is the first payment
    const isFirstPayment = (subscription.payments_completed || 0) ***REMOVED***= 0;
    
    if (isFirstPayment) {
      console.log('🎉 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= PROCESSING FIRST PAYMENT WEBHOOK ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
      
      // 1. Update subscription status to active
      console.log('🔄 Activating subscription...');
      const subscriptionUpdate = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscription._id,
        {
          subscription_status: 'active',
          afs_registration_id: id,
          payments_completed: 1,
          last_payment_date: new Date()
        },
        { new: true }
      );
      
      console.log('✅ Subscription activated:');
      console.log(`  - Status: ${subscriptionUpdate.subscription_status}`);
      console.log(`  - Payments Completed: ${subscriptionUpdate.payments_completed}`);
      console.log(`  - Registration ID: ${subscriptionUpdate.afs_registration_id}`);
      console.log(`  - Last Payment: ${subscriptionUpdate.last_payment_date}`);
      
      // 2. Mark payment #1 as completed
      console.log('🔄 Updating payment schedule...');
      const payment1Update = await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          _id: subscription._id,
          'payment_schedule.installment_number': 1
        },
        {
          $set: {
            'payment_schedule.$.status': 'completed',
            'payment_schedule.$.transaction_id': id,
            'payment_schedule.$.payment_date': new Date()
          }
        },
        { new: true }
      );
      
      if (payment1Update) {
        console.log('✅ Payment #1 marked as completed in schedule');
        
        // Update the next payment status to 'due' if it exists
        const nextPaymentUpdate = await Vzat_Recurring_Data.findOneAndUpdate(
          { 
            _id: subscription._id,
            'payment_schedule.installment_number': 2,
            'payment_schedule.status': 'pending'
          },
          {
            $set: {
              'payment_schedule.$.status': 'due'
            }
          }
        );
        
        if (nextPaymentUpdate) {
          console.log('✅ Next payment #2 marked as due');
        }
      }
      
      console.log('🎉 ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***= FIRST PAYMENT WEBHOOK COMPLETE ***REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED******REMOVED***=');
      console.log('✅ First payment successfully processed via webhook');
      console.log('✅ Subscription is now ACTIVE');
      
    } else {
      console.log('ℹ️ This appears to be a recurring payment');
      console.log(`   Current status: ${subscription.subscription_status}`);
      console.log(`   Payments completed: ${subscription.payments_completed || 0}`);
      
      // Update payments_completed count
      const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscription._id,
        {
          $inc: { payments_completed: 1 },
          last_payment_date: new Date()
        },
        { new: true }
      );
      
      console.log(`📊 Updated payments_completed to: ${updatedRecord.payments_completed}`);
      
      // Update payment schedule status
      const scheduleUpdateResult = await updatePaymentScheduleStatus(subscription._id, updatedRecord.payments_completed, id);
      console.log(`📅 Payment schedule updated:`, scheduleUpdateResult);
      
      // Check if subscription is complete after this payment
      const finalRecord = await Vzat_Recurring_Data.findById(subscription._id);
      const isComplete = await checkAndHandleSubscriptionCompletion(finalRecord);
      
      if (!isComplete) {
        console.log('📋 Subscription not yet complete - scheduling next payment');
        // Schedule next payment
        await scheduleNextPayment(subscription._id);
        console.log(`📅 Next payment scheduled for ${subscription.quotepaymentId}`);
      }
    }
    
    // Log successful webhook processing
    Post_Common_DB_Log_Data('/webhook/afs-success', req.body, { 
      message: 'Successful payment webhook processed',
      paymentType: paymentType,
      merchantTransactionId: merchantTransactionId,
      transactionId: id,
      result: result,
      isFirstPayment: isFirstPayment,
      subscriptionStatus: subscription.subscription_status
    });
    
    return res.status(200).json({ 
      message: 'Successful payment webhook processed',
      paymentType: paymentType,
      merchantTransactionId: merchantTransactionId,
      transactionId: id,
      status: 'processed',
      isFirstPayment: isFirstPayment
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Log webhook error
    Post_Common_DB_Log_Data('/webhook/afs-error', req.body, { 
      message: 'Error processing webhook',
      error: error.message,
      paymentType: paymentType,
      merchantTransactionId: merchantTransactionId,
      transactionId: id
    });
    
    return res.status(500).json({ 
      message: 'Error processing webhook',
      error: error.message
    });
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
    
    
    console.log('🔍 CRON JOB DEBUG - Checking subscriptions for:', today.toISOString().slice(0, 10));
    
    // First, let's check what subscriptions exist for today (debugging)
    const allActiveSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: 'active',
      next_charge_date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    console.log(`📊 Found ${allActiveSubscriptions.length} active subscriptions due today:`);
    allActiveSubscriptions.forEach(sub => {
      console.log(`📋 Subscription ${sub.quotepaymentId}: payments_completed=${sub.payments_completed}, InstallmentLeft=${sub.InstallmentLeft}, payment_retry_count=${sub.payment_retry_count || 0}, last_processed_date=${sub.last_processed_date}, next_charge_date=${sub.next_charge_date}`);
    });
    
    // Find all active subscriptions due for payment today
    // IMPORTANT: Exclude subscriptions already processed today to prevent duplicate emails
    const dueSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: 'active',
      next_charge_date: {
        $gte: today,
        $lt: tomorrow
      },
      // Handle both InstallmentLeft field and payment_schedule array
      $or: [
        // Case 1: InstallmentLeft field exists and is valid
        {
          InstallmentLeft: { $exists: true, $ne: null },
          $expr: { 
            $lt: ['$payments_completed', '$InstallmentLeft'] 
          }
        },
        // Case 2: InstallmentLeft missing but payment_schedule exists
        {
          InstallmentLeft: { $exists: false },
          payment_schedule: { $exists: true, $ne: null },
          $expr: { 
            $lt: ['$payments_completed', { $size: '$payment_schedule' }] 
          }
        }
      ],
      // Prevent duplicate processing: Skip if already processed today
      $and: [
        {
          $or: [
            // Never processed
            { last_processed_date: { $exists: false } },
            // Last processed before today
            { last_processed_date: { $lt: today } }
          ]
        }
      ]
    });
    
    console.log(`🎯 CRON JOB QUERY RESULT - Found ${dueSubscriptions.length} subscriptions to process:`);
    dueSubscriptions.forEach(sub => {
      console.log(`✅ Will process: ${sub.quotepaymentId} (payments_completed: ${sub.payments_completed}/${sub.InstallmentLeft})`);
    });
    
    if (dueSubscriptions.length ***REMOVED***= 0) {
      console.log('❌ No subscriptions found to process. Reasons could be:');
      console.log('   - No subscriptions due today');
      console.log('   - All subscriptions already processed today');
      console.log('   - All subscriptions exceeded max retry count');
      console.log('   - Missing retry fields (payment_retry_count, last_processed_date)');
      
      // Show which subscriptions were excluded and why
      if (allActiveSubscriptions.length > 0) {
        console.log('\n🔍 EXCLUDED SUBSCRIPTIONS ANALYSIS:');
        allActiveSubscriptions.forEach(sub => {
          const hasRetryCount = sub.payment_retry_count !***REMOVED*** undefined && sub.payment_retry_count > 0;
          const processedToday = sub.last_processed_date && new Date(sub.last_processed_date).toDateString() ***REMOVED***= today.toDateString();
          const maxRetriesExceeded = sub.payment_retry_count >= 3;
          
          console.log(`   📋 ${sub.quotepaymentId}:`);
          console.log(`      - Processed today: ${processedToday}`);
          console.log(`      - Has retry count: ${hasRetryCount} (${sub.payment_retry_count || 0})`);
          console.log(`      - Max retries exceeded: ${maxRetriesExceeded}`);
          console.log(`      - Reason excluded: ${processedToday ? 'Already processed today' : 
                                              maxRetriesExceeded ? 'Max retries exceeded' : 
                                              'Other criteria not met'}`);
        });
      }
    }
    
    const results = [];
    
    for (const subscription of dueSubscriptions) {
      try {
        console.log(`\n🔄 PROCESSING PAYMENT #${subscription.payments_completed + 1} for subscription: ${subscription.quotepaymentId}`);
        console.log(`   - Customer: ${subscription.Customer_name}`);
        console.log(`   - Email: ${subscription.opp_email}`);
        console.log(`   - Amount: ${parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2))} AED`);
        console.log(`   - Retry count: ${subscription.payment_retry_count || 0}`);
        
        const paymentResult = await processSubscriptionPayment(subscription);
        
        // 🆕 HANDLE SUCCESSFUL PAYMENT DIRECTLY IN CRON JOB
        if (paymentResult && paymentResult.result && paymentResult.result.code.startsWith('000.')) {
          console.log(`✅ PAYMENT SUCCESS for ${subscription.quotepaymentId} - Processing database updates and emails...`);
          
          try {
            // Update subscription record
            const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
              subscription._id,
              {
                $inc: { payments_completed: 1 },
                last_payment_date: new Date(paymentResult.timestamp || new Date())
              },
              { new: true }
            );
            
            console.log(`📊 Updated payments_completed to: ${updatedRecord.payments_completed}`);
            
            // Update payment schedule status
            const scheduleUpdateResult = await updatePaymentScheduleStatus(subscription._id, updatedRecord.payments_completed, paymentResult.id);
            console.log(`📅 Payment schedule updated:`, scheduleUpdateResult);
            
            // Don't fail the payment if schedule update fails - it's not critical
            if (!scheduleUpdateResult.success) {
              console.log(`⚠️ Payment schedule update failed but payment was successful: ${scheduleUpdateResult.error}`);
            }
            
            // Call Salesforce API for successful payment
            try {
              const salesforcePaymentData = {
                quotepaymentId: subscription.quotepaymentId,
                amount: parseFloat(paymentResult.amount),
                transactionId: paymentResult.id,
                paymentType: 'Online_payment',
                paymentStatus: 'success',
                resultCode: paymentResult.result.code,
                resultDescription: paymentResult.result.description,
                timestamp: paymentResult.timestamp || new Date().toISOString()
              };

              const salesforceResult = await updateQuotePaymentStatus(salesforcePaymentData);
              
              if (salesforceResult.success) {
                console.log(`✅ Salesforce updated successfully for payment #${updatedRecord.payments_completed}`);
              } else {
                console.warn('⚠️ Salesforce update failed but payment was successful:', salesforceResult.error);
              }
              
            } catch (salesforceError) {
              console.error('❌ Error calling Salesforce API but payment was successful:', salesforceError);
              // Don't fail the payment if Salesforce fails - it's not critical
            }

            // Send customer notification email for successful payment
            try {
              const successResult = await sendPaymentSuccessNotificationEmail({
                quotepaymentId: subscription.quotepaymentId,
                Customer_name: subscription.Customer_name,
                opp_email: subscription.opp_email,
                payment_amount: parseFloat(paymentResult.amount),
                payment_date: new Date(paymentResult.timestamp || new Date()),
                installment_number: updatedRecord.payments_completed,
                total_installments: subscription.InstallmentLeft,
                payment_method: 'Card',
                salesPersonDetails: subscription.salesPersonDetails
              });
              
              if (successResult.success) {
                console.log('📧 Customer payment success notification sent successfully');
              } else {
                console.warn('⚠️ Failed to send customer success notification but payment was successful:', successResult.error);
              }
            } catch (emailError) {
              console.error('❌ Error sending customer success notification but payment was successful:', emailError);
              // Don't fail the payment if email fails - it's not critical
            }
            
            // Check if subscription is complete - verify ALL payments are completed
            const isComplete = await checkAndHandleSubscriptionCompletion(updatedRecord);
            
            if (!isComplete) {
              // Schedule next payment
              await scheduleNextPayment(subscription._id);
              console.log(`📅 Next payment scheduled for ${subscription.quotepaymentId}`);
            }
            
          } catch (updateError) {
            console.error(`❌ Error updating database for ${subscription.quotepaymentId}:`, updateError);
            throw updateError; // Re-throw to trigger failure handling
          }
        } else {
          // Payment failed - throw error to trigger failure handling
          throw new Error(`Payment failed: ${paymentResult?.result?.description || 'Unknown error'}`);
        }
        
        // Only mark as processed if payment was successful
        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          last_processed_date: new Date()
        });
        
        results.push({
          quotepaymentId: subscription.quotepaymentId,
          status: 'processed',
          result: paymentResult
        });
        
        console.log(`✅ PAYMENT SUCCESS for ${subscription.quotepaymentId} - Payment #${subscription.payments_completed + 1} completed!`);
        
      } catch (error) {
        console.error(`\n❌ PAYMENT FAILED for ${subscription.quotepaymentId}:`, error.message);
        console.error(`   - Error details:`, error);
        
        // Handle failed payment retry logic
        const retryCount = subscription.payment_retry_count || 0;
        const maxRetries = 3; // Allow retries for 3 days
        
        if (retryCount >= maxRetries) {
          console.log(`🚫 MAX RETRIES EXCEEDED for ${subscription.quotepaymentId} (${retryCount}/${maxRetries}), marking as processed`);
          
          // Mark the current payment as failed in payment_schedule
          const currentPaymentNumber = (subscription.payments_completed || 0) + 1;
          await Vzat_Recurring_Data.findOneAndUpdate(
            { 
              _id: subscription._id,
              'payment_schedule.installment_number': currentPaymentNumber
            },
            {
              $set: {
                'payment_schedule.$.status': 'failed',
                'payment_schedule.$.failure_date': new Date()
              }
            }
          );
          console.log(`❌ Payment #${currentPaymentNumber} marked as failed in payment schedule`);
          
          // Mark as processed and reset retry count for next day
          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date(),
            payment_retry_count: 0 // Reset for next day
          });
        } else {
          // Increment retry count and mark as processed for today
          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date(),
            payment_retry_count: retryCount + 1
          });
          console.log(`🔄 RETRY SCHEDULED for ${subscription.quotepaymentId} - Retry ${retryCount + 1}/${maxRetries} (will retry tomorrow)`);
        }
        
        // Send failure email to operations team
        // try {
        //   // Calculate installment amount (handle missing InstallmentLeft)
        //   let installmentLeft = subscription.InstallmentLeft;
        //   if (!installmentLeft && subscription.payment_schedule) {
        //     installmentLeft = subscription.payment_schedule.length;
        //   }
          
        //   const emailResult = await sendPaymentFailureEmail({
        //     quotepaymentId: subscription.quotepaymentId,
        //     OpportunityId: subscription.OpportunityId,
        //     QuoteId: subscription.QuoteId,
        //     error_message: error.message,
        //     payment_amount: installmentLeft ? parseFloat((subscription.Total_After_VAT_Currency / installmentLeft).toFixed(2)) : 0,
        //     attempt_date: new Date(),
        //     payments_completed: subscription.payments_completed || 0,
        //     total_installments: installmentLeft,
        //     afs_response: null,
        //     retry_count: retryCount + 1,
        //     max_retries: maxRetries
        //   });
          
        //   if (emailResult.success) {
        //     console.log('📧 Payment failure email sent successfully to operations team');
        //   } else {
        //     console.error('📧 Failed to send failure email to operations team:', emailResult.error);
        //   }
        // } catch (emailError) {
        //   console.error('📧 Error sending failure email to operations team:', emailError);
        // }
        
        // 📧 SEND FAILURE EMAIL TO CUSTOMER AND OPERATIONS TEAM (only once per day)
        try {
          // Check if we already sent a failure email today
          const lastFailureEmailDate = subscription.last_failure_email_date;
          const today = new Date().toDateString();
          const shouldSendEmail = !lastFailureEmailDate || new Date(lastFailureEmailDate).toDateString() !***REMOVED*** today;
          
          if (shouldSendEmail) {
            console.log('📧 Sending payment failure email...');
            
            // Calculate installment amount for email
            const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2));
            
            // Import email service
            const { sendPaymentFailureNotificationEmail } = await import('../services/emailService.js');
            
            // Extract clean error message from AFS response
            let cleanErrorMessage = error.message;
            
            // If it's an AFS error, extract just the description
            if (error.message.includes('"description":"')) {
              try {
                const match = error.message.match(/"description":"([^"]+)"/);
                if (match && match[1]) {
                  cleanErrorMessage = match[1];
                }
              } catch (parseError) {
                // Keep original error if parsing fails
                console.log('⚠️ Could not parse AFS error message, using original');
              }
            }
            
            // Prepare email data
            const emailData = {
              quotepaymentId: subscription.quotepaymentId,
              Customer_name: subscription.Customer_name || 'Customer',
              opp_email: subscription.opp_email,
              payment_amount: installmentAmount,
              due_date: today.toISOString().slice(0, 10),
              failure_reason: cleanErrorMessage,
              payment_link: 'https://vzatnew.yeepeey.com/login',
              salesPersonDetails: subscription.salesPersonDetails
            };
            
            // Send failure email
            const emailResult = await sendPaymentFailureNotificationEmail(emailData);
            
            if (emailResult.success) {
              console.log('📧 Payment failure email sent successfully to customer');
              
              // Update last failure email date
              await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
                last_failure_email_date: new Date()
              });
            } else {
              console.error('📧 Failed to send failure email to customer:', emailResult.error);
            }
          } else {
            console.log('📧 Failure email already sent today, skipping...');
          }
        } catch (emailError) {
          console.error('📧 Error sending failure email to customer:', emailError);
        }
        
        results.push({
          quotepaymentId: subscription.quotepaymentId,
          status: 'failed',
          error: error.message,
          retry_count: retryCount + 1,
          max_retries: maxRetries
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
    
    console.log('\n📊 CRON JOB SUMMARY:');
    console.log(`   - Date: ${today.toISOString().slice(0, 10)}`);
    console.log(`   - Total subscriptions processed: ${results.length}`);
    
    const successCount = results.filter(r => r.status ***REMOVED***= 'processed').length;
    const failedCount = results.filter(r => r.status ***REMOVED***= 'failed').length;
    
    console.log(`   - Successful payments: ${successCount}`);
    console.log(`   - Failed payments: ${failedCount}`);
    
    if (results.length > 0) {
      console.log('\n📋 DETAILED RESULTS:');
      results.forEach(result => {
        if (result.status ***REMOVED***= 'processed') {
          console.log(`   ✅ ${result.quotepaymentId}: SUCCESS`);
        } else {
          console.log(`   ❌ ${result.quotepaymentId}: FAILED - ${result.error}`);
        }
      });
    }
    
    if (res) {
      res.json(response);
    } else {
      console.log('\n✅ Recurring payments processing completed');
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
 * Process a single subscription payment using server-to-server logic with saved card details
 */
async function processSubscriptionPayment(subscription) {
  console.log('🔄 STARTING SUBSCRIPTION PAYMENT PROCESSING:');
  console.log(`   - Subscription ID: ${subscription.quotepaymentId}`);
  console.log(`   - Customer: ${subscription.Customer_name}`);
  console.log(`   - Email: ${subscription.opp_email}`);
  console.log(`   - Payments Completed: ${subscription.payments_completed || 0}`);
  console.log(`   - Total Installments: ${subscription.InstallmentLeft}`);
  console.log(`   - Next Payment: #${(subscription.payments_completed || 0) + 1}`);
  
  // First, try to get the customer's default saved card
  const savedCard = await getCustomerDefaultCard(subscription);
  
  if (!savedCard) {
    const errorMsg = `No valid saved card found for customer ${subscription.opp_email || subscription.quotepaymentId}. Customer needs to add a payment method.`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  console.log(`💳 USING SAVED CARD FOR PAYMENT:`);
  console.log(`   - Card: ${savedCard.maskedCardNumber} (${savedCard.cardBrand})`);
  console.log(`   - Cardholder: ${savedCard.cardholderName}`);
  console.log(`   - Expiry: ${savedCard.expiryMonth}/${savedCard.expiryYear}`);
  console.log(`   - AFS Registration ID: ${savedCard.afs_registration_id}`);
  console.log(`   - Card ID: ${savedCard._id}`);
  console.log(`   - Last Used: ${savedCard.lastUsedDate || 'Never'}`);
  
  // Use server-to-server payment with full card details
  console.log('🚀 INITIATING AFS DEBIT FUND OPERATION...');
  const result = await processServerToServerPayment(subscription, savedCard);
  
  console.log('✅ SUBSCRIPTION PAYMENT PROCESSING COMPLETED:');
  console.log(`   - Result: ${result.result?.description || 'Success'}`);
  console.log(`   - Transaction ID: ${result.id}`);
  console.log(`   - Amount: ${result.amount} ${result.currency}`);
  
  return result;
}

/**
 * Get customer's default saved card for recurring payments
 */
async function getCustomerDefaultCard(subscription) {
  try {
    // Find customer by email or quotepaymentId
    const customer = await Customer.findOne({
      $or: [
        { email: subscription.opp_email },
        { quotepaymentId: subscription.quotepaymentId }
      ]
    });
    
    if (!customer) {
      console.log(`❌ Customer not found for subscription: ${subscription.quotepaymentId}`);
      return null;
    }
    
    // First, try to get the default active card for this customer
    let savedCard = await SavedCard.findOne({
      customerId: customer._id,
      isActive: true,
      isDefault: true
    });
    
    // If no default card found, get the most recently used active card
    if (!savedCard) {
      console.log(`⚠️ No default card found, looking for most recent active card for customer: ${customer.email}`);
      savedCard = await SavedCard.findOne({
        customerId: customer._id,
        isActive: true
      }).sort({ lastUsedDate: -1, cardAddedDate: -1 });
    }
    
    // If still no card found, get any active card
    if (!savedCard) {
      console.log(`⚠️ No recently used card found, getting any active card for customer: ${customer.email}`);
      savedCard = await SavedCard.findOne({
        customerId: customer._id,
        isActive: true
      }).sort({ cardAddedDate: -1 });
    }
    
    if (!savedCard) {
      console.log(`❌ No active card found for customer: ${customer.email}`);
      return null;
    }
    
    // Validate that the card has AFS registration ID for recurring payments
    if (!savedCard.afs_registration_id) {
      console.log(`❌ Card missing AFS registration ID for customer: ${customer.email}`);
      console.log(`❌ Cannot process recurring payments without registration ID`);
      return null;
    }
    
    console.log(`✅ Found card for customer: ${savedCard.maskedCardNumber} (${savedCard.cardBrand})`);
    console.log(`✅ AFS Registration ID: ${savedCard.afs_registration_id}`);
    return savedCard;
    
  } catch (error) {
    console.error('❌ Error retrieving customer default card:', error);
    return null;
  }
}

/**
 * Process recurring payment using AFS Registration API
 */
async function processServerToServerPayment(subscription, savedCard) {
  
  // Calculate InstallmentLeft if missing (fallback for older records)
  let installmentLeft = subscription.InstallmentLeft;
  if (!installmentLeft && subscription.payment_schedule) {
    installmentLeft = subscription.payment_schedule.length;
    console.log(`🔧 InstallmentLeft missing, calculated from payment_schedule: ${installmentLeft}`);
  }
  
  if (!installmentLeft) {
    throw new Error('Cannot determine total installments for subscription');
  }
  
  // Check if we're using mock data for testing
  if (subscription.afs_registration_id && subscription.afs_registration_id.includes('mock')) {
    console.log('🧪 Using mock payment for testing');
    
    // Simulate successful payment response for testing
    const mockResponse = {
      id: `mock-payment-${Date.now()}`,
      result: {
        code: "000.100.110",
        description: "Request successfully processed in 'Merchant in Integrator Test Mode'"
      },
      amount: parseFloat((subscription.Total_After_VAT_Currency / installmentLeft).toFixed(2)),
      currency: "AED",
      paymentType: "PA",
      merchantTransactionId: `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`,
      card: {
        maskedPan: savedCard.maskedCardNumber,
        brand: savedCard.cardBrand,
        holder: savedCard.cardholderName,
        expiryMonth: savedCard.expiryMonth,
        expiryYear: savedCard.expiryYear
      }
    };
    
    return mockResponse;
  }
  
  // Validate that we have the registration ID
  if (!savedCard.afs_registration_id) {
    throw new Error(`No AFS registration ID found for card ${savedCard._id}. Cannot process recurring payment.`);
  }
  
  // Use AFS Registration API for recurring payments
  const afsUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}/payments`;
  const entityId = process.env.AFS_ENTITY_ID;
  const accessToken = process.env.AFS_ACCESS_TOKEN;
  
  // Calculate installment amount
  const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / installmentLeft).toFixed(2));
  
  const afsData = new URLSearchParams();
  afsData.append('entityId', entityId);
  afsData.append('amount', installmentAmount.toString());
  afsData.append('currency', 'AED');
  afsData.append('paymentType', 'PA'); // Pre-Authorization for recurring payments
  afsData.append('merchantTransactionId', `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`);
  
  // Add standing instruction parameters for recurring payments
  afsData.append('standingInstruction.mode', 'REPEATED');
  afsData.append('standingInstruction.type', 'UNSCHEDULED');
  afsData.append('standingInstruction.source', 'CIT'); // Merchant Initiated Transaction
  
  const afsHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/x-www-form-urlencoded"
  };
  
  console.log('🔗 AFS Registration Payment Request Details:');
  console.log('- URL:', afsUrl);
  console.log('- Registration ID:', savedCard.afs_registration_id);
  console.log('- Entity ID:', entityId);
  console.log('- Amount:', installmentAmount);
  console.log('- Currency:', 'AED');
  console.log('- Payment Type:', 'PA (Pre-Authorization)');
  console.log('- Standing Instruction Mode:', 'REPEATED');
  console.log('- Standing Instruction Type:', 'UNSCHEDULED');
  console.log('- Standing Instruction Source:', 'MIT');
  console.log('- Merchant Transaction ID:', `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`);
  console.log('- Card Details:', {
    maskedCardNumber: savedCard.maskedCardNumber,
    cardBrand: savedCard.cardBrand,
    cardholderName: savedCard.cardholderName,
    expiryMonth: savedCard.expiryMonth,
    expiryYear: savedCard.expiryYear
  });
  
  try {
    console.log('🚀 INITIATING AFS DEBIT FUND OPERATION:');
    console.log(`   - Registration ID: ${savedCard.afs_registration_id}`);
    console.log(`   - Amount: ${installmentAmount} AED`);
    console.log(`   - Payment Type: PA (Pre-Authorization)`);
    console.log(`   - Merchant Transaction ID: ${subscription.quotepaymentId}_${subscription.payments_completed + 1}`);
    console.log(`   - Timestamp: ${new Date().toISOString()}`);
    
    const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });
    
    console.log('📡 AFS DEBIT FUND RESPONSE RECEIVED:');
    console.log('- Status Code:', response.status);
    console.log('- Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('- Response Data:', JSON.stringify(response.data, null, 2));
    
    // Log specific AFS response details
    if (response.data) {
      console.log('🔍 AFS RESPONSE ANALYSIS:');
      console.log(`   - Transaction ID: ${response.data.id || 'N/A'}`);
      console.log(`   - Payment Type: ${response.data.paymentType || 'N/A'}`);
      console.log(`   - Amount: ${response.data.amount || 'N/A'} ${response.data.currency || 'N/A'}`);
      console.log(`   - Result Code: ${response.data.result?.code || 'N/A'}`);
      console.log(`   - Result Description: ${response.data.result?.description || 'N/A'}`);
      console.log(`   - Merchant Transaction ID: ${response.data.merchantTransactionId || 'N/A'}`);
      console.log(`   - Registration ID: ${response.data.registrationId || 'N/A'}`);
      console.log(`   - Timestamp: ${response.data.timestamp || 'N/A'}`);
      
      if (response.data.resultDetails) {
        console.log('📋 AFS RESULT DETAILS:');
        console.log(`   - Auth Code: ${response.data.resultDetails.AuthCode || 'N/A'}`);
        console.log(`   - Acquirer Response: ${response.data.resultDetails.AcquirerResponse || 'N/A'}`);
        console.log(`   - Reconciliation ID: ${response.data.resultDetails.reconciliationId || 'N/A'}`);
        console.log(`   - Extended Description: ${response.data.resultDetails.ExtendedDescription || 'N/A'}`);
      }
      
      if (response.data.standingInstruction) {
        console.log('🔄 AFS STANDING INSTRUCTION:');
        console.log(`   - Mode: ${response.data.standingInstruction.mode || 'N/A'}`);
        console.log(`   - Type: ${response.data.standingInstruction.type || 'N/A'}`);
        console.log(`   - Source: ${response.data.standingInstruction.source || 'N/A'}`);
        console.log(`   - Initial Transaction ID: ${response.data.standingInstruction.initialTransactionId || 'N/A'}`);
      }
    }
    
    if (response.data && response.data.result && response.data.result.code.startsWith('000.')) {
      // Payment successful
      console.log('✅ AFS DEBIT FUND OPERATION SUCCESSFUL:');
      console.log(`   - Funds debited successfully from registration ID: ${savedCard.afs_registration_id}`);
      console.log(`   - Amount debited: ${response.data.amount} ${response.data.currency}`);
      console.log(`   - Transaction ID: ${response.data.id}`);
      console.log(`   - Result: ${response.data.result.description}`);
      
      // Update card's last used date
      await SavedCard.findByIdAndUpdate(savedCard._id, {
        lastUsedDate: new Date()
      });
      
      console.log('💳 Card last used date updated successfully');
      
      return response.data;
    } else {
      const errorMsg = `AFS Debit Fund failed: ${response.data?.result?.description || 'Unknown error'}`;
      console.error('❌ AFS DEBIT FUND OPERATION FAILED:');
      console.error(`   - Registration ID: ${savedCard.afs_registration_id}`);
      console.error(`   - Amount attempted: ${installmentAmount} AED`);
      console.error(`   - Error: ${errorMsg}`);
      console.error(`   - Result Code: ${response.data?.result?.code || 'N/A'}`);
      throw new Error(errorMsg);
    }
  } catch (axiosError) {
    console.error('🚨 AFS DEBIT FUND API ERROR:');
    console.error(`   - Registration ID: ${savedCard.afs_registration_id}`);
    console.error(`   - Amount attempted: ${installmentAmount} AED`);
    console.error(`   - URL: ${afsUrl}`);
    console.error(`   - Status Code: ${axiosError.response?.status || 'Network Error'}`);
    console.error(`   - Status Text: ${axiosError.response?.statusText || 'N/A'}`);
    console.error(`   - Error Message: ${axiosError.message}`);
    console.error(`   - Request Headers: ${JSON.stringify(afsHeaders, null, 2)}`);
    console.error(`   - Request Data: ${afsData.toString()}`);
    
    if (axiosError.response?.data) {
      console.error('📋 AFS ERROR RESPONSE DETAILS:');
      console.error(`   - Response Data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
      
      if (axiosError.response.data.result) {
        console.error(`   - Result Code: ${axiosError.response.data.result.code || 'N/A'}`);
        console.error(`   - Result Description: ${axiosError.response.data.result.description || 'N/A'}`);
      }
    }
    
    // Enhanced error handling with specific AFS error codes
    if (axiosError.response?.status ***REMOVED***= 400) {
      const errorMsg = `AFS Debit Fund Bad Request (400): ${JSON.stringify(axiosError.response.data)}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else if (axiosError.response?.status ***REMOVED***= 401) {
      const errorMsg = `AFS Debit Fund Unauthorized (401): Check access token for registration ID ${savedCard.afs_registration_id}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else if (axiosError.response?.status ***REMOVED***= 403) {
      const errorMsg = `AFS Debit Fund Forbidden (403): Check entity ID and permissions for registration ID ${savedCard.afs_registration_id}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else if (axiosError.response?.status ***REMOVED***= 404) {
      const errorMsg = `AFS Debit Fund Not Found (404): Registration ID ${savedCard.afs_registration_id} not found or expired`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else if (axiosError.response?.status ***REMOVED***= 422) {
      const errorMsg = `AFS Debit Fund Unprocessable Entity (422): Invalid payment data for registration ID ${savedCard.afs_registration_id}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else if (axiosError.response?.status >= 500) {
      const errorMsg = `AFS Debit Fund Server Error (${axiosError.response.status}): AFS server issue`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      const errorMsg = `AFS Debit Fund Error (${axiosError.response?.status || 'Network'}): ${axiosError.message}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
}

/**
 * Test AFS Registration payment with a specific subscription
 * This endpoint can be used to test the new recurring payment logic
 */
export const testServerToServerPayment = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    
    if (!quotepaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Quote payment ID is required'
      });
    }
    
    console.log(`🧪 Testing server-to-server payment for subscription: ${quotepaymentId}`);
    
    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Test card retrieval
    const savedCard = await getCustomerDefaultCard(subscription);
    
    if (!savedCard) {
      return res.status(400).json({
        success: false,
        message: 'No valid saved card with AFS registration ID found for customer',
        subscription: {
          quotepaymentId: subscription.quotepaymentId,
          customerEmail: subscription.opp_email,
          customerName: subscription.Customer_name
        }
      });
    }
    
    // Return test information (don't actually process payment)
    res.json({
      success: true,
      message: 'AFS Registration payment test successful',
      subscription: {
        quotepaymentId: subscription.quotepaymentId,
        customerEmail: subscription.opp_email,
        customerName: subscription.Customer_name,
        totalAmount: subscription.Total_After_VAT_Currency,
        installmentLeft: subscription.InstallmentLeft,
        paymentsCompleted: subscription.payments_completed
      },
      card: {
        cardId: savedCard._id,
        maskedCardNumber: savedCard.maskedCardNumber,
        cardBrand: savedCard.cardBrand,
        cardholderName: savedCard.cardholderName,
        expiryMonth: savedCard.expiryMonth,
        expiryYear: savedCard.expiryYear,
        afsRegistrationId: savedCard.afs_registration_id,
        isDefault: savedCard.isDefault,
        isActive: savedCard.isActive
      },
      paymentDetails: {
        installmentAmount: parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)),
        currency: 'AED',
        paymentType: 'PA',
        standingInstruction: {
          mode: 'REPEATED',
          type: 'UNSCHEDULED',
          source: 'MIT'
        },
        merchantTransactionId: `${subscription.quotepaymentId}_${subscription.payments_completed + 1}`,
        afsUrl: `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}/payments`
      }
    });
    
  } catch (error) {
    console.error('❌ Test server-to-server payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};

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
    
    // const emailResult = await sendPaymentFailureEmail(mockFailureData);
    
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

