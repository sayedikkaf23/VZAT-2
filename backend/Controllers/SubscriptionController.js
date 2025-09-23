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
      paymentBrand,
      timestamp 
    } = req.body;

    console.log('🔔 AFS WEBHOOK RECEIVED:');
    console.log('   - ID:', id);
    console.log('   - Payment Type:', paymentType);
    console.log('   - Result:', result);
    console.log('   - Registration ID:', registrationId);
    console.log('   - Payment Brand:', paymentBrand);
    console.log('   - Merchant Transaction ID:', merchantTransactionId);
    
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
    // Support both DB (Direct Bank) and PA (Pre-Authorization) for recurring payments
    if ((paymentType ***REMOVED***= 'DB' || paymentType ***REMOVED***= 'PA') && result.code.startsWith('000.')) {
      // Check if this is the first payment (payments_completed is 0 or 1, and we have a registrationId)
      const isFirstPayment = (subscriptionRecord.payments_completed || 0) <= 1 && registrationId;
      
    console.log('🔍 WEBHOOK PAYMENT ANALYSIS:');
    console.log('   - Subscription Status:', subscriptionRecord.subscription_status);
    console.log('   - Payments Completed:', subscriptionRecord.payments_completed || 0);
    console.log('   - Registration ID:', registrationId);
    console.log('   - Is First Payment:', isFirstPayment);
    console.log('   - Payment Type:', paymentType);
    console.log('   - Transaction ID:', id);
    
    // 🆕 DUPLICATE PAYMENT DETECTION
    // Check if this payment has already been processed by checking the payment schedule
    const existingPayment = subscriptionRecord.payment_schedule?.find(
      payment => payment.transaction_id ***REMOVED***= id
    );
    
    if (existingPayment) {
      console.log('⚠️ DUPLICATE PAYMENT DETECTED:');
      console.log(`   - Transaction ID ${id} already processed`);
      console.log(`   - Payment #${existingPayment.installment_number} already completed`);
      console.log('ℹ️ Skipping webhook processing to prevent duplicate emails');
      
      // Log the duplicate detection
      Post_Common_DB_Log_Data('/webhook/afs-duplicate', req.body, { 
        message: 'Duplicate payment detected - skipping processing',
        subscriptionId: subscriptionRecord._id,
        transactionId: id,
        existingPayment: existingPayment
      });
      
      return res.status(200).json({ 
        message: 'Duplicate payment detected - already processed',
        transactionId: id,
        status: 'skipped'
      });
    }
      
      if (isFirstPayment) {
        // First payment successful - activate subscription
        
        // Calculate next charge date for the next installment
        let nextChargeDate = null;
        if (subscriptionRecord.payment_schedule && subscriptionRecord.payment_schedule.length > 1) {
          // Find the next installment date
          const nextPayment = subscriptionRecord.payment_schedule.find(
            payment => payment.installment_number ***REMOVED***= 2
          );
          if (nextPayment && nextPayment.due_date) {
            nextChargeDate = new Date(nextPayment.due_date);
          }
        }
        
        console.log('💾 WEBHOOK SAVING FIRST PAYMENT DATA:');
        console.log('   - afs_registration_id:', registrationId);
        console.log('   - afs_payment_brand:', paymentBrand);
        console.log('   - next_charge_date:', nextChargeDate);
        console.log('   - last_payment_date:', new Date(timestamp));
        
        const updateResult = await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionRecord._id, {
          subscription_status: 'active',
          afs_registration_id: registrationId,
          afs_payment_brand: paymentBrand, // Save the payment brand for recurring payments
          payments_completed: 1,
          last_payment_date: new Date(timestamp),
          next_charge_date: nextChargeDate // Set to next installment date
        }, { new: true });
        
        console.log('✅ WEBHOOK UPDATE SUCCESS:');
        console.log('   - Updated afs_registration_id:', updateResult.afs_registration_id);
        console.log('   - Updated afs_payment_brand:', updateResult.afs_payment_brand);
        console.log('   - Updated next_charge_date:', updateResult.next_charge_date);
        console.log('   - Updated last_payment_date:', updateResult.last_payment_date);
        
        
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
        console.log('🔄 WEBHOOK PROCESSING RECURRING PAYMENT:');
        console.log('   - This is NOT the first payment');
        console.log('   - Payments completed:', subscriptionRecord.payments_completed);
        console.log('   - Registration ID:', registrationId);
        console.log('   - Payment Brand:', paymentBrand);
      
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
      // try {
      //   const emailResult = await sendPaymentFailureEmail({
      //     quotepaymentId: subscriptionRecord.quotepaymentId,
      //     OpportunityId: subscriptionRecord.OpportunityId,
      //     QuoteId: subscriptionRecord.QuoteId,
      //     error_message: result.description || 'Payment processing failed',
      //     payment_amount: amount,
      //     attempt_date: new Date(timestamp),
      //     payments_completed: subscriptionRecord.payments_completed || 0,
      //     total_installments: subscriptionRecord.InstallmentLeft,
      //     afs_response: result
      //   });
        
      //   if (emailResult.success) {
      //     console.log('📧 Payment failure email sent successfully');
      //   } else {
      //     console.error('📧 Failed to send failure email:', emailResult.error);
      //   }
      // } catch (emailError) {
      //   console.error('📧 Error sending failure email:', emailError);
      // }

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
      // Prevent duplicate processing: Skip if already processed today AND no retries needed
      $and: [
        {
          $or: [
            // Never processed
            { last_processed_date: { $exists: false } },
            // Last processed before today
            { last_processed_date: { $lt: today } },
            // Processed today but has retry count (failed payment - allow retry)
            { 
              $and: [
                { last_processed_date: { $gte: today } },
                { payment_retry_count: { $exists: true, $gt: 0, $lt: 3 } }
              ]
            }
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
          console.log(`      - Reason excluded: ${processedToday && !hasRetryCount ? 'Already processed today' : 
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
                console.warn('⚠️ Salesforce update failed:', salesforceResult.error);
              }
              
            } catch (salesforceError) {
              console.error('❌ Error calling Salesforce API:', salesforceError);
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
                console.error('📧 Failed to send customer success notification:', successResult.error);
              }
            } catch (emailError) {
              console.error('📧 Error sending customer success notification:', emailError);
            }
            
            // Check if subscription is complete
            if (updatedRecord.payments_completed >= updatedRecord.InstallmentLeft) {
              console.log(`🎉 SUBSCRIPTION COMPLETED for ${subscription.quotepaymentId}!`);
              
              // Update status to completed
              await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
                subscription_status: 'completed'
              });
              
              // Send completion email
              try {
                const emailResult = await sendSubscriptionCompletedEmail({
                  quotepaymentId: subscription.quotepaymentId,
                  OpportunityId: subscription.OpportunityId,
                  QuoteId: subscription.QuoteId,
                  Total_After_VAT_Currency: subscription.Total_After_VAT_Currency,
                  InstallmentLeft: subscription.InstallmentLeft,
                  payments_completed: updatedRecord.payments_completed,
                  last_payment_date: updatedRecord.last_payment_date
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
        
        // Don't mark as processed on failure - allow retry
        // Only mark as processed if we've exceeded retry limit
        const retryCount = subscription.payment_retry_count || 0;
        const maxRetries = 3; // Allow 3 retries
        
        if (retryCount >= maxRetries) {
          console.log(`🚫 MAX RETRIES EXCEEDED for ${subscription.quotepaymentId} (${retryCount}/${maxRetries}), marking as processed`);
          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date(),
            payment_retry_count: 0 // Reset for next day
          });
        } else {
          // Increment retry count and remove last_processed_date to allow retry
          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            $unset: { last_processed_date: 1 },
            $set: { payment_retry_count: retryCount + 1 }
          });
          console.log(`🔄 RETRY SCHEDULED for ${subscription.quotepaymentId} - Retry ${retryCount + 1}/${maxRetries}`);
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
        
        // Send customer notification email for payment failure
        try {
          // Calculate installment amount (handle missing InstallmentLeft)
          let installmentLeft = subscription.InstallmentLeft;
          if (!installmentLeft && subscription.payment_schedule) {
            installmentLeft = subscription.payment_schedule.length;
          }
          
          // Get the current payment schedule to find due date
          const currentPayment = subscription.payment_schedule?.find(
            payment => payment.installment_number ***REMOVED***= (subscription.payments_completed || 0) + 1
          );
          
          const installmentAmount = installmentLeft ? parseFloat((subscription.Total_After_VAT_Currency / installmentLeft).toFixed(2)) : 0;
          
          const customerNotificationResult = await sendPaymentFailureNotificationEmail({
            quotepaymentId: subscription.quotepaymentId,
            Customer_name: subscription.Customer_name,
            opp_email: subscription.opp_email,
            payment_amount: installmentAmount,
            due_date: currentPayment?.due_date || subscription.next_charge_date,
            failure_reason: error.message,
            payment_link: `${process.env.BASE_URL || 'https://vzatnew.yeepeey.com'}/payment-schedule?quotepaymentId=${subscription.quotepaymentId}`,
            salesPersonDetails: subscription.salesPersonDetails
          });
          
          if (customerNotificationResult.success) {
            console.log('📧 Customer payment failure notification sent successfully');
            console.log('📧 Recipients:', customerNotificationResult.recipients);
          } else {
            console.error('📧 Failed to send customer notification:', customerNotificationResult.error);
          }
        } catch (customerNotificationError) {
          console.error('📧 Error sending customer notification:', customerNotificationError);
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
  
  // First, try to get the customer's default saved card
  const savedCard = await getCustomerDefaultCard(subscription);
  
  if (!savedCard) {
    const errorMsg = `No valid saved card found for customer ${subscription.opp_email || subscription.quotepaymentId}. Customer needs to add a payment method.`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  console.log(`💳 Using saved card for payment: ${savedCard.maskedCardNumber} (${savedCard.cardBrand})`);
  
  // Use server-to-server payment with full card details
  return await processServerToServerPayment(subscription, savedCard);
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
    const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });
    
    console.log('📡 AFS Registration Payment Response:');
    console.log('- Status:', response.status);
    console.log('- Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.result && response.data.result.code.startsWith('000.')) {
      // Payment successful
      console.log('✅ AFS Registration Payment successful');
      
      // Update card's last used date
      await SavedCard.findByIdAndUpdate(savedCard._id, {
        lastUsedDate: new Date()
      });
      
      return response.data;
    } else {
      const errorMsg = `Payment failed: ${response.data?.result?.description || 'Unknown error'}`;
      console.error('❌ AFS Registration Payment failed:', errorMsg);
      throw new Error(errorMsg);
    }
  } catch (axiosError) {
    console.error('🚨 AFS Registration Payment API Error:');
    console.error('- Status:', axiosError.response?.status);
    console.error('- Status Text:', axiosError.response?.statusText);
    console.error('- Response Data:', JSON.stringify(axiosError.response?.data, null, 2));
    console.error('- Error Message:', axiosError.message);
    
    if (axiosError.response?.status ***REMOVED***= 400) {
      throw new Error(`AFS API Bad Request (400): ${JSON.stringify(axiosError.response.data)}`);
    } else if (axiosError.response?.status ***REMOVED***= 401) {
      throw new Error(`AFS API Unauthorized (401): Check access token`);
    } else if (axiosError.response?.status ***REMOVED***= 403) {
      throw new Error(`AFS API Forbidden (403): Check entity ID and permissions`);
    } else if (axiosError.response?.status ***REMOVED***= 404) {
      throw new Error(`AFS API Not Found (404): Registration ID ${savedCard.afs_registration_id} not found or expired`);
    } else {
      throw new Error(`AFS API Error (${axiosError.response?.status || 'Network'}): ${axiosError.message}`);
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

