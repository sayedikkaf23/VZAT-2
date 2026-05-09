import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import SavedCard from "../model/SavedCardModel.js";
import Customer from "../model/CustomerLoginModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import {
  sendFinalRenewalEmail,
  sendPaymentFailureNotificationEmail,
  sendPaymentSuccessNotificationEmail
} from "../services/emailService.js";
import { createCustomerAccount, saveCustomerCard } from "./CustomerRegistration.js";
import { updateQuotePaymentStatus } from "../services/salesforceService.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * ✅ PRODUCTION FIX:
 * AFS merchantTransactionId must be unique per charge AND per retry attempt.
 * Also, your webhook sends back this ID, so we must be able to map it back to the subscription.
 *
 * Strategy:
 * - Always start merchantTransactionId with base quotepaymentId
 * - Add unique suffix per installment:
 *    - Use payment_schedule[currentIndex]._id (stable + unique)
 *    - ALWAYS append timestamp to ensure uniqueness on retries
 *    - This prevents "duplicate transaction" errors when payment fails and retries
 */
function buildMerchantTransactionId(subscription) {
  const completed = Number(subscription?.payments_completed || 0); // already completed
  const nextIndex = completed; // next payment index in array (0-based)

  const base = subscription?.quotepaymentId;
  if (!base) {
    // Extreme fallback: never break AFS call
    console.warn("⚠️ No quotepaymentId found for subscription, using UNKNOWN fallback");
    return `UNKNOWN_${Date.now()}`;
  }

  // Get retry count if available (for logging/debugging)
  const retryCount = subscription?.payment_retry_count || 0;

  console.log("🔑 =============== BUILDING MERCHANT TRANSACTION ID ===============");
  console.log(`📋 Base QuotePaymentId: ${base}`);
  console.log(`📋 Payments Completed: ${completed}`);
  console.log(`📋 Next Payment Index: ${nextIndex}`);
  console.log(`📋 Retry Count: ${retryCount}`);

  // Best: use payment_schedule item _id + timestamp for uniqueness
  if (
    Array.isArray(subscription.payment_schedule) &&
    subscription.payment_schedule[nextIndex] &&
    subscription.payment_schedule[nextIndex]._id
  ) {
    const scheduleItemId = subscription.payment_schedule[nextIndex]._id;
    const timestamp = Date.now();
    const merchantTxnId = `${base}_${scheduleItemId}_${timestamp}`;
    console.log(`✅ Generated MerchantTransactionId (with schedule ID): ${merchantTxnId}`);
    console.log(`🔑 =============== MERCHANT TRANSACTION ID COMPLETE ===============`);
    return merchantTxnId;
  }

  // Fallback: still unique with timestamp
  const timestamp = Date.now();
  const merchantTxnId = `${base}_${completed + 1}_${timestamp}`;
  console.log(`✅ Generated MerchantTransactionId (fallback): ${merchantTxnId}`);
  console.log(`🔑 =============== MERCHANT TRANSACTION ID COMPLETE ===============`);
  return merchantTxnId;
}

/**
 * Extract base quotepaymentId from merchantTransactionId
 * Example: "aAWdu000000AXsLGAW_2" => "aAWdu000000AXsLGAW"
 */
function getBaseQuotePaymentId(merchantTransactionId) {
  if (!merchantTransactionId) return null;
  return String(merchantTransactionId).split("_")[0];
}

/**
 * Check if subscription is complete and handle completion logic
 */
async function checkAndHandleSubscriptionCompletion(subscription) {
  try {
    console.log("🔍 =============== COMPLETION CHECK ===============");
    console.log(`📋 Current subscription status: ${subscription.subscription_status}`);
    console.log(
      `📋 Payments completed: ${subscription.payments_completed}/${subscription.InstallmentLeft}`
    );

    if (!subscription.payment_schedule || !Array.isArray(subscription.payment_schedule)) {
      console.log("❌ No payment schedule found - subscription not complete");
      return false;
    }

    const allPaymentsCompleted = subscription.payment_schedule.every(
      (p) => p.status === "completed" || p.status === "paid"
    );

    const failedPayments = subscription.payment_schedule.filter(
      (p) => p.status === "failed" || p.status === "due" || p.status === "pending"
    );

    const isComplete =
      subscription.payments_completed >= subscription.InstallmentLeft &&
      allPaymentsCompleted &&
      failedPayments.length === 0;

    if (isComplete) {


      const currentStatus = await Vzat_Recurring_Data.findById(subscription._id).select(
        "subscription_status"
      );
      console.log(`📋 Current status in DB: ${currentStatus.subscription_status}`);

      if (currentStatus.subscription_status !== "completed") {
        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          subscription_status: "completed",
          next_charge_date: null,
          renewal_email_sent: true,
          renewal_email_sent_date: new Date()
        });

        // Send completion email with retry
        let emailSent = false;
        let emailAttempts = 0;
        const maxEmailAttempts = 3;

        while (!emailSent && emailAttempts < maxEmailAttempts) {
          emailAttempts++;
          try {
            const emailResult = await sendFinalRenewalEmail({
              quotepaymentId: subscription.quotepaymentId,
              Quote_payment_number: subscription.Quote_payment_number,
              Customer_name: subscription.Customer_name,
              contactName: subscription.contactName,
              opp_email: subscription.opp_email,
              payments_completed: subscription.payments_completed,
              InstallmentLeft: subscription.InstallmentLeft,
              last_payment_date: subscription.last_payment_date,
              salesPersonDetails: subscription.salesPersonDetails
            });

            if (emailResult.success) {
              emailSent = true;
              console.log("📧 ✅ Subscription completion email sent successfully!");
            } else {
              console.error("📧 ❌ Completion email failed:", emailResult.error);
              if (emailAttempts < maxEmailAttempts) {
                await new Promise((r) => setTimeout(r, 2000));
              }
            }
          } catch (e) {
            console.error("📧 ❌ Completion email error:", e);
            if (emailAttempts < maxEmailAttempts) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }

        if (!emailSent) {
          console.error("📧 ❌ Failed to send completion email after all attempts");
        }
      } else {
        console.log("📧 Subscription already completed, skipping completion email");
      }

      console.log("🎯 =============== COMPLETION CHECK COMPLETE ===============");
      return true;
    }

    console.log("📋 Subscription not yet complete");
    console.log("🎯 =============== COMPLETION CHECK COMPLETE ===============");
    return false;
  } catch (error) {
    console.error("💥 Error checking subscription completion:", error);
    console.log("🎯 =============== COMPLETION CHECK COMPLETE ===============");
    return false;
  }
}

/**
 * Update payment schedule status when a payment is completed
 */
async function updatePaymentScheduleStatus(subscriptionId, paymentNumber, transactionId) {
  try {
    console.log(
      `📅 Updating payment schedule for payment #${paymentNumber} with transaction ID: ${transactionId}`
    );

    const subscription = await Vzat_Recurring_Data.findById(subscriptionId);
    if (!subscription) return { success: false, error: "Subscription not found" };

    if (!subscription.payment_schedule || subscription.payment_schedule.length === 0) {
      return { success: true, message: "No payment schedule to update" };
    }

    const targetPayment = subscription.payment_schedule.find(
      (p) => p.installment_number === paymentNumber
    );
    if (!targetPayment) {
      return { success: true, message: `Payment #${paymentNumber} not found in schedule` };
    }

    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      {
        _id: subscriptionId,
        "payment_schedule.installment_number": paymentNumber
      },
      {
        $set: {
          "payment_schedule.$.status": "completed",
          "payment_schedule.$.transaction_id": transactionId,
          "payment_schedule.$.payment_date": new Date()
        }
      },
      { new: true }
    );

    if (!updateResult) {
      return { success: false, error: `No matching installment #${paymentNumber} found` };
    }

    // Set next installment due (if pending)
    const nextPaymentNumber = paymentNumber + 1;
    const nextPayment = subscription.payment_schedule.find(
      (p) => p.installment_number === nextPaymentNumber
    );

    if (nextPayment && nextPayment.status === "pending") {
      await Vzat_Recurring_Data.findOneAndUpdate(
        {
          _id: subscriptionId,
          "payment_schedule.installment_number": nextPaymentNumber,
          "payment_schedule.status": "pending"
        },
        { $set: { "payment_schedule.$.status": "due" } },
        { new: true }
      );
    }

    const updatedPayment = updateResult.payment_schedule.find(
      (p) => p.installment_number === paymentNumber
    );

    return { success: true, updatedPayment, nextPaymentNumber };
  } catch (error) {
    console.error("❌ Error updating payment schedule status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle AFS webhook notifications for subscription events
 */
export const handleAFSWebhook = async (req, res) => {
  console.log("🔔 =============== AFS WEBHOOK RECEIVED ===============");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("📋 Request Body:", JSON.stringify(req.body, null, 2));

  const { paymentType, merchantTransactionId, id, result } = req.body;

  // Only process successful payments
  if (!result || !result.code || !result.code.startsWith("000.")) {
    Post_Common_DB_Log_Data("/webhook/afs-disabled-failed", req.body, {
      message: "Webhook disabled for failed payment - preventing failure emails",
      paymentType,
      merchantTransactionId,
      transactionId: id,
      result,
      reason: "Failed payment processing disabled"
    });

    return res.status(200).json({
      message: "Webhook disabled for failed payment - preventing failure emails",
      paymentType,
      merchantTransactionId,
      transactionId: id,
      status: "disabled_failed_payment"
    });
  }

  try {
    // ✅ PRODUCTION FIX: webhook merchantTransactionId may be "QP_xxx" or "QP_<scheduleId>"
    const baseQuotePaymentId = getBaseQuotePaymentId(merchantTransactionId);

    const subscription = await Vzat_Recurring_Data.findOne({
      quotepaymentId: baseQuotePaymentId
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription not found",
        quotepaymentId: baseQuotePaymentId,
        merchantTransactionId
      });
    }

    const isFirstPayment = (subscription.payments_completed || 0) === 0;

    if (isFirstPayment) {
      // First payment -> activate + mark installment 1 completed
      const subscriptionUpdate = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscription._id,
        {
          subscription_status: "active",
          initial_transaction_id: id,
          payments_completed: 1,
          last_payment_date: new Date()
        },
        { new: true }
      );

      await Vzat_Recurring_Data.findOneAndUpdate(
        {
          _id: subscription._id,
          "payment_schedule.installment_number": 1
        },
        {
          $set: {
            "payment_schedule.$.status": "completed",
            "payment_schedule.$.transaction_id": id,
            "payment_schedule.$.payment_date": new Date()
          }
        },
        { new: true }
      );

      // Mark installment 2 as due (if pending)
      await Vzat_Recurring_Data.findOneAndUpdate(
        {
          _id: subscription._id,
          "payment_schedule.installment_number": 2,
          "payment_schedule.status": "pending"
        },
        { $set: { "payment_schedule.$.status": "due" } }
      );
    } else {
      // Recurring payment
      const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
        subscription._id,
        {
          $inc: { payments_completed: 1 },
          last_payment_date: new Date()
        },
        { new: true }
      );

      // ✅ use updatedRecord everywhere below
      const currentPayment = updatedRecord.payment_schedule?.find(
        (p) => p.installment_number === updatedRecord.payments_completed
      );


      await updatePaymentScheduleStatus(
        subscription._id,
        updatedRecord.payments_completed,
        id
      );

      // Customer success email (non-blocking)
      try {
        const currentPayment = updatedRecord.payment_schedule?.find(
          (p) => p.installment_number === updatedRecord.payments_completed
        );
        const q_payment_id =
          currentPayment?.q_payment_id ||
          updatedRecord.Quote_payment_number ||
          updatedRecord.quotepaymentId;


        await sendPaymentSuccessNotificationEmail({
          quotepaymentId: subscription.quotepaymentId,
          q_payment_id,
          Customer_name: subscription.Customer_name,
          contactName: subscription.contactName,
          opp_email: subscription.opp_email,
          opp_owner: subscription.opp_owner,
          payment_amount: parseFloat(result.amount),
          payment_date: new Date(result.timestamp || new Date()),
          installment_number: updatedRecord.payments_completed,
          total_installments: subscription.InstallmentLeft,
          payment_method: "Card",
          salesPersonDetails: subscription.salesPersonDetails,
          installmentSchedule: updatedRecord.payment_schedule
        });
      } catch (e) {
        console.error("❌ Success email error (ignored):", e);
      }

      // Completion check + schedule next if needed
      try {
        const finalRecord = await Vzat_Recurring_Data.findById(subscription._id);
        const isComplete = await checkAndHandleSubscriptionCompletion(finalRecord);
        if (!isComplete) await scheduleNextPayment(subscription._id);
      } catch (e) {
        console.error("❌ Completion check error (ignored):", e);
      }
    }

    Post_Common_DB_Log_Data("/webhook/afs-success", req.body, {
      message: "Successful payment webhook processed",
      paymentType,
      merchantTransactionId,
      transactionId: id,
      result,
      isFirstPayment
    }, subscription.opp_email);

    return res.status(200).json({
      message: "Successful payment webhook processed",
      paymentType,
      merchantTransactionId,
      transactionId: id,
      status: "processed",
      isFirstPayment
    });
  } catch (error) {
    Post_Common_DB_Log_Data("/webhook/afs-error", req.body, {
      message: "Error processing webhook",
      error: error.message,
      paymentType,
      merchantTransactionId,
      transactionId: id
    }, subscription?.opp_email);

    return res.status(500).json({
      message: "Error processing webhook",
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
    if (!subscription || subscription.subscription_status !== "active") return;

    // Find the next pending/due payment from payment_schedule
    const nextPayment = subscription.payment_schedule?.find(
      (p) => p.status === "pending" || p.status === "due"
    );

    if (nextPayment && nextPayment.due_date) {
      // Use the due_date from payment schedule
      const nextChargeDate = new Date(nextPayment.due_date);
      nextChargeDate.setHours(0, 0, 0, 0);

      await Vzat_Recurring_Data.findByIdAndUpdate(subscriptionId, {
        next_charge_date: nextChargeDate
      });

      console.log(`✅ Scheduled next payment for ${nextChargeDate.toISOString().slice(0, 10)} (Installment #${nextPayment.installment_number} from payment schedule)`);
    } else {
      // Fallback to old logic if no payment schedule
      console.log('⚠️ No payment schedule found, using fallback date calculation');
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

      console.log(`✅ Scheduled next payment for ${nextChargeDate.toISOString().slice(0, 10)} (fallback calculation)`);
    }
  } catch (error) {
    console.error("❌ Error scheduling next payment:", error);
  }
}

/**
 * Process recurring payments (called by cron job)
 */
export const processRecurringPayments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allActiveSubscriptions = await Vzat_Recurring_Data.find({
      subscription_status: "active",
      next_charge_date: { $gte: today, $lt: tomorrow }
    });

    // Find subscriptions that are due today
    // First, get all active subscriptions with next_charge_date today
    const allDueToday = await Vzat_Recurring_Data.find({
      subscription_status: "active",
      next_charge_date: { $gte: today, $lt: tomorrow },
      $or: [
        {
          InstallmentLeft: { $exists: true, $ne: null },
          $expr: { $lt: ["$payments_completed", "$InstallmentLeft"] }
        },
        {
          InstallmentLeft: { $exists: false },
          payment_schedule: { $exists: true, $ne: null },
          $expr: { $lt: ["$payments_completed", { $size: "$payment_schedule" }] }
        },
        {
          payment_retry_count: { $gte: 3 },
          "payment_schedule.status": { $in: ["due", "pending"] }
        }
      ]
    });

    const MAX_RETRIES = 3;

    console.log(`🔍 Found ${allDueToday.length} subscriptions with next_charge_date today`);

    const dueSubscriptions = allDueToday.filter(subscription => {
      const quotepaymentId = subscription.quotepaymentId;
      console.log(`\n📋 Checking subscription: ${quotepaymentId}`);

      // Already processed today — skip to prevent double-charging
      if (subscription.last_processed_date) {
        const lastProcessed = new Date(subscription.last_processed_date);
        lastProcessed.setHours(0, 0, 0, 0);
        if (lastProcessed.getTime() === today.getTime()) {
          console.log(`   ⏭️ Skipping: Already processed today`);
          return false;
        }
      }

      // Allow if there is a failed payment that still has retries remaining
      const retryablePayment = subscription.payment_schedule?.find(
        p => p.status === 'failed' && (p.retry_count || 0) < MAX_RETRIES
      );
      if (retryablePayment) {
        console.log(`   ✅ Allowing: Payment #${retryablePayment.installment_number} needs retry (attempt ${(retryablePayment.retry_count || 0) + 1}/${MAX_RETRIES})`);
        return true;
      }

      // Allow if the next scheduled payment is due today or overdue
      const nextScheduledPayment = subscription.payment_schedule?.find(
        p => p.status === 'due' || p.status === 'pending'
      );
      if (nextScheduledPayment) {
        const dueDate = new Date(nextScheduledPayment.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate <= today) {
          console.log(`   ✅ Allowing: Payment #${nextScheduledPayment.installment_number} is due (${nextScheduledPayment.due_date})`);
          return true;
        }
      }

      console.log(`   ⏭️ Skipping: Nothing to process`);
      return false;
    });

    console.log(`\n✅ Final: ${dueSubscriptions.length} subscriptions will be processed\n`);

    const results = [];

    for (const subscription of dueSubscriptions) {
      try {
        // Determine which payment to process using per-payment retry tracking
        const failedPayment = subscription.payment_schedule.find(p => p.status === 'failed');
        const nextScheduledPayment = subscription.payment_schedule.find(
          p => p.status === 'due' || p.status === 'pending'
        );

        let paymentToProcess = null;

        if (failedPayment && (failedPayment.retry_count || 0) < MAX_RETRIES) {
          // Retry the failed payment — it still has attempts remaining
          paymentToProcess = failedPayment.installment_number;
          console.log(`🔄 Retrying payment #${paymentToProcess} (attempt ${(failedPayment.retry_count || 0) + 1}/${MAX_RETRIES})`);
        } else if (nextScheduledPayment) {
          // Process the next scheduled payment if its due date has arrived
          const dueDate = new Date(nextScheduledPayment.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate <= today) {
            paymentToProcess = nextScheduledPayment.installment_number;
            console.log(`✅ Processing scheduled payment #${paymentToProcess} (due: ${nextScheduledPayment.due_date})`);
          } else {
            console.log(`⏭️ Skipping: Next payment #${nextScheduledPayment.installment_number} not yet due (${nextScheduledPayment.due_date})`);
            continue;
          }
        } else {
          console.log(`⏭️ Skipping: No payments to process for ${subscription.quotepaymentId}`);
          continue;
        }

        const subscriptionForProcessing = {
          quotepaymentId: subscription.quotepaymentId,
          opp_email: subscription.opp_email,
          Customer_name: subscription.Customer_name,
          Total_After_VAT_Currency: subscription.Total_After_VAT_Currency,
          InstallmentLeft: subscription.InstallmentLeft,
          afs_registration_id: subscription.afs_registration_id,
          salesPersonDetails: subscription.salesPersonDetails,
          payment_schedule: subscription.payment_schedule,
          payments_completed: paymentToProcess - 1
        };

        const paymentResult = await processSubscriptionPayment(subscriptionForProcessing);

        if (paymentResult?.result?.code?.startsWith("000.")) {
          const updatedRecord = await Vzat_Recurring_Data.findByIdAndUpdate(
            subscription._id,
            {
              $set: {
                payments_completed: Math.max(subscription.payments_completed || 0, paymentToProcess),
                last_payment_date: new Date(paymentResult.timestamp || new Date()),
                payment_retry_count: 0
              }
            },
            { new: true }
          );

          // Update schedule (if not already completed)
          const currentPayment = updatedRecord.payment_schedule?.find(
            (p) => p.installment_number === paymentToProcess
          );

          const wasAlreadyCompleted =
            currentPayment && (currentPayment.status === "completed" || currentPayment.status === "paid");

          if (!wasAlreadyCompleted) {
            await updatePaymentScheduleStatus(subscription._id, paymentToProcess, paymentResult.id);
          }

          // Salesforce update (non-blocking)
          try {
            console.log('🔄 Preparing Salesforce API call for recurring payment...');
            console.log(`📋 Current payment details:`, {
              installment_number: currentPayment?.installment_number,
              q_payment_id: currentPayment?.q_payment_id,
              status: currentPayment?.status,
              amount: currentPayment?.amount
            });

            const sfPayment = {
              quotepaymentId: subscription.quotepaymentId,
              amount: parseFloat(paymentResult.amount),
              transactionId: paymentResult.id,
              paymentType: "Online_payment",
              paymentStatus: "success",
              resultCode: paymentResult.result.code,
              resultDescription: paymentResult.result.description,
              timestamp: paymentResult.timestamp || new Date().toISOString(),
              installmentNumber: paymentToProcess,
              nextDueDate: subscription.next_charge_date
                ? new Date(subscription.next_charge_date).toISOString().slice(0, 10)
                : null,
              Qp_number:
                currentPayment?.q_payment_id ||
                subscription.Quote_payment_number ||
                null
            };

            console.log('📋 Salesforce payload for recurring payment:', {
              quotepaymentId: sfPayment.quotepaymentId,
              Qp_number: sfPayment.Qp_number,
              installmentNumber: sfPayment.installmentNumber,
              amount: sfPayment.amount,
              transactionId: sfPayment.transactionId
            });

            console.log('🚀 Calling Salesforce API...');
            const salesforceResult = await updateQuotePaymentStatus(sfPayment);

            console.log('📊 Salesforce API result:', {
              success: salesforceResult.success,
              message: salesforceResult.message,
              error: salesforceResult.error || null
            });

            if (salesforceResult.success) {
              console.log(`✅ Salesforce updated successfully for payment #${paymentToProcess}`);
            } else {
              console.warn('⚠️ Salesforce update failed but payment was successful:', salesforceResult.error);
            }
          } catch (e) {
            console.error("❌ Salesforce error (ignored):", e);
            console.error("❌ Salesforce error details:", e.message);
          }

          // Success email (non-blocking)
          try {
            const q_payment_id =
              currentPayment?.q_payment_id ||
              updatedRecord.Quote_payment_number ||
              updatedRecord.quotepaymentId;


            await sendPaymentSuccessNotificationEmail({
              quotepaymentId: subscription.quotepaymentId,
              q_payment_id,
              Customer_name: subscription.Customer_name,
              contactName: subscription.contactName,
              opp_email: subscription.opp_email,
              opp_owner: subscription.opp_owner,
              payment_amount: parseFloat(paymentResult.amount),
              payment_date: new Date(paymentResult.timestamp || new Date()),
              installment_number: paymentToProcess,
              total_installments: subscription.InstallmentLeft,
              payment_method: "Card",
              salesPersonDetails: subscription.salesPersonDetails,
              installmentSchedule: updatedRecord.payment_schedule
            });
          } catch (e) {
            console.error("❌ Success email error (ignored):", e);
          }

          // Completion + next schedule
          try {
            const freshRecord = await Vzat_Recurring_Data.findById(subscription._id);
            const isComplete = await checkAndHandleSubscriptionCompletion(freshRecord);
            if (!isComplete) await scheduleNextPayment(subscription._id);
          } catch (e) {
            console.error("❌ Completion check error (ignored):", e);
          }

          // Mark processed today
          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date()
          });

          const successResult = { quotepaymentId: subscription.quotepaymentId, status: "processed", result: paymentResult };
          results.push(successResult);
          
          // Log individual success
          Post_Common_DB_Log_Data("/cron/recurring-payment-success", subscriptionForProcessing, successResult, subscription.opp_email);
        } else {
          throw new Error(`Payment failed: ${paymentResult?.result?.description || "Unknown error"}`);
        }
      } catch (error) {
        // FAILURE HANDLING — per-payment retry tracking
        console.error("❌ =============== PAYMENT FAILED ===============");
        console.error(`📋 QuotePaymentId: ${subscription.quotepaymentId}`);
        console.error(`📋 Installment: #${paymentToProcess}`);
        console.error(`📋 Error: ${error.message}`);

        // Get the current retry count for this specific payment
        const failedPaymentInSchedule = subscription.payment_schedule.find(
          p => p.installment_number === paymentToProcess
        );
        const newRetryCount = (failedPaymentInSchedule?.retry_count || 0) + 1;

        console.log(`🔄 Payment #${paymentToProcess} retry count: ${newRetryCount}/${MAX_RETRIES}`);

        // Update this payment's retry_count and status in the schedule
        await Vzat_Recurring_Data.findOneAndUpdate(
          { _id: subscription._id, 'payment_schedule.installment_number': paymentToProcess },
          { $set: {
            'payment_schedule.$.status': 'failed',
            'payment_schedule.$.failure_date': new Date(),
            'payment_schedule.$.retry_count': newRetryCount
          }}
        );

        if (newRetryCount >= MAX_RETRIES) {
          // Max retries exhausted — advance next_charge_date to the next payment's due date
          const nextPaymentAfterFailed = subscription.payment_schedule.find(
            p => p.installment_number > paymentToProcess && (p.status === 'due' || p.status === 'pending')
          );
          let nextChargeDate = nextPaymentAfterFailed ? new Date(nextPaymentAfterFailed.due_date) : null;
          if (nextChargeDate) nextChargeDate.setHours(0, 0, 0, 0);

          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date(),
            next_charge_date: nextChargeDate
          });

          console.log(`🛑 Payment #${paymentToProcess} reached max retries (${MAX_RETRIES}). Automatic retries stopped. Next charge date: ${nextChargeDate?.toISOString().slice(0, 10) || 'none (manual action required)'}`);
          // No failure email sent after max retries — stops email spam, team retries manually
        } else {
          // Retries remaining — schedule retry for tomorrow
          let nextChargeDate = new Date();
          nextChargeDate.setDate(nextChargeDate.getDate() + 1);
          nextChargeDate.setHours(0, 0, 0, 0);

          await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
            last_processed_date: new Date(),
            next_charge_date: nextChargeDate
          });

          console.log(`🔄 Retry ${newRetryCount}/${MAX_RETRIES} scheduled for tomorrow: ${nextChargeDate.toISOString().slice(0, 10)}`);

          // Send failure email once per day while retries remain
          try {
            const lastFailureEmailDate = subscription.last_failure_email_date;
            const todayString = new Date().toDateString();
            const shouldSendEmail =
              !lastFailureEmailDate || new Date(lastFailureEmailDate).toDateString() !== todayString;

            if (shouldSendEmail) {
              const installmentAmount = parseFloat(
                (subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)
              );

              let cleanErrorMessage = error.message;
              if (error.message.includes('"description":"')) {
                const match = error.message.match(/"description":"([^"]+)"/);
                if (match && match[1]) cleanErrorMessage = match[1];
              }

              const q_payment_id =
                failedPaymentInSchedule?.q_payment_id ||
                subscription.Quote_payment_number ||
                subscription.quotepaymentId;

              const emailData = {
                quotepaymentId: subscription.quotepaymentId,
                q_payment_id,
                Customer_name: subscription.Customer_name || "Customer",
                contactName: subscription.contactName,
                opp_email: subscription.opp_email,
                opp_owner: subscription.opp_owner,
                payment_amount: installmentAmount,
                due_date: today.toISOString().slice(0, 10),
                failure_reason: cleanErrorMessage,
                payment_link: "https://installment.virtuzone.com/login",
                salesPersonDetails: subscription.salesPersonDetails
              };

              const emailResult = await sendPaymentFailureNotificationEmail(emailData);
              if (emailResult.success) {
                await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
                  last_failure_email_date: new Date()
                });
              }
            }
          } catch (e) {
            console.error("📧 Failure email error (ignored):", e);
          }
        }

        const failureResult = {
          quotepaymentId: subscription.quotepaymentId,
          status: "failed",
          error: error.message,
          installment_number: paymentToProcess,
          retry_count: newRetryCount,
          max_retries: MAX_RETRIES,
          retries_exhausted: newRetryCount >= MAX_RETRIES
        };
        results.push(failureResult);

        Post_Common_DB_Log_Data("/cron/recurring-payment-failed", {
          quotepaymentId: subscription.quotepaymentId,
          customer_name: subscription.Customer_name,
          installment_number: paymentToProcess,
          amount: parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2)),
          failure_timestamp: new Date().toISOString(),
          retry_count: newRetryCount,
          retries_exhausted: newRetryCount >= MAX_RETRIES
        }, failureResult, subscription.opp_email);
      }
    }

    const response = {
      message: "Recurring payments processing completed",
      date: today.toISOString().slice(0, 10),
      total_processed: results.length,
      results
    };

    Post_Common_DB_Log_Data("/cron/recurring-payments", { date: today }, response);

    if (res) return res.json(response);
    return response;
  } catch (error) {
    const errorResponse = { message: "Recurring payments processing failed", error: error.message };
    if (res) return res.status(500).json(errorResponse);
    return errorResponse;
  }
};

/**
 * Process a single subscription payment using server-to-server logic with saved card details
 */
async function processSubscriptionPayment(subscription) {
  const savedCard = await getCustomerDefaultCard(subscription);

  if (!savedCard) {
    const errorMsg = `No valid saved card found for customer ${subscription.opp_email || subscription.quotepaymentId}.`;
    throw new Error(errorMsg);
  }

  const result = await processServerToServerPayment(subscription, savedCard);
  return result;
}

/**
 * Get customer's default saved card for recurring payments
 */
async function getCustomerDefaultCard(subscription) {
  try {
    if (!subscription.quotepaymentId) return null;
    if (!subscription.opp_email) return null;

    const customer = await Customer.findOne({
      $or: [{ email: subscription.opp_email }, { quotepaymentId: subscription.quotepaymentId }]
    });

    if (!customer) return null;

    let savedCard = await SavedCard.findOne({ customerId: customer._id, isActive: true, isDefault: true });

    if (!savedCard) {
      savedCard = await SavedCard.findOne({ customerId: customer._id, isActive: true }).sort({
        lastUsedDate: -1,
        cardAddedDate: -1
      });
    }

    if (!savedCard) {
      savedCard = await SavedCard.findOne({ customerId: customer._id, isActive: true }).sort({
        cardAddedDate: -1
      });
    }

    if (!savedCard) return null;
    if (!savedCard.afs_registration_id) return null;

    return savedCard;
  } catch (error) {
    console.error("❌ Error retrieving customer default card:", error);
    return null;
  }
}

/**
 * Process recurring payment using AFS Registration API
 */
async function processServerToServerPayment(subscription, savedCard) {
  console.log("💳 =============== PROCESSING SERVER-TO-SERVER PAYMENT ===============");
  console.log(`📋 QuotePaymentId: ${subscription.quotepaymentId}`);
  console.log(`📋 Customer Email: ${subscription.opp_email}`);
  console.log(`📋 Payments Completed: ${subscription.payments_completed}`);
  console.log(`📋 Retry Count: ${subscription.payment_retry_count || 0}`);

  // Calculate InstallmentLeft if missing
  let installmentLeft = subscription.InstallmentLeft;
  if (!installmentLeft && subscription.payment_schedule) {
    installmentLeft = subscription.payment_schedule.length;
  }
  if (!installmentLeft) throw new Error("Cannot determine total installments for subscription");

  // AFS requires amount to be sent with exactly 2 decimals (string), e.g. "1198.80"
  const installmentAmountNumber = Number(subscription.Total_After_VAT_Currency) / Number(installmentLeft);
  if (!Number.isFinite(installmentAmountNumber)) {
    throw new Error(
      `Invalid installment amount (total=${subscription.Total_After_VAT_Currency}, installments=${installmentLeft})`
    );
  }
  const installmentAmount = installmentAmountNumber.toFixed(2);
  console.log(`💰 Installment Amount: ${installmentAmount} AED`);

  // ✅ PRODUCTION FIX: unique merchantTransactionId
  const merchantTransactionId = buildMerchantTransactionId(subscription);

  // Mock mode
  if (subscription.afs_registration_id && subscription.afs_registration_id.includes("mock")) {
    return {
      id: `mock-payment-${Date.now()}`,
      result: { code: "000.100.110", description: "Mock payment success" },
      amount: installmentAmount,
      currency: "AED",
      paymentType: "PA",
      merchantTransactionId,
      card: {
        maskedPan: savedCard.maskedCardNumber,
        brand: savedCard.cardBrand,
        holder: savedCard.cardholderName,
        expiryMonth: savedCard.expiryMonth,
        expiryYear: savedCard.expiryYear
      }
    };
  }

  if (!savedCard.afs_registration_id) {
    throw new Error(`No AFS registration ID found for card ${savedCard._id}.`);
  }

  const afsUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}/payments`;
  const entityId = process.env.AFS_ENTITY_ID;
  const accessToken = process.env.AFS_ACCESS_TOKEN;

  const afsData = new URLSearchParams();
  afsData.append("entityId", entityId);
  afsData.append("amount", installmentAmount);
  afsData.append("currency", "AED");
  afsData.append("paymentType", "DB");

  // ✅ PRODUCTION FIX: unique ID used here
  afsData.append("merchantTransactionId", merchantTransactionId);

  afsData.append("standingInstruction.mode", "REPEATED");
  afsData.append("standingInstruction.type", "UNSCHEDULED");
  afsData.append("standingInstruction.source", "MIT");

  const afsHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/x-www-form-urlencoded"
  };

  console.log("📤 Calling AFS Registration Payment API...");
  console.log(`📋 AFS URL: ${afsUrl}`);
  console.log(`📋 Amount: ${installmentAmount} AED`);
  console.log(`📋 MerchantTransactionId: ${merchantTransactionId}`);
  console.log(`📋 Registration ID: ${savedCard.afs_registration_id}`);

  try {
    // Log the request to AFS
    Post_Common_DB_Log_Data("/api/afs-recurring-payment-request", { url: afsUrl, data: afsData.toString() }, { message: "Request sent to AFS" }, subscription.opp_email);

    const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });

    if (response.data?.result?.code?.startsWith("000.")) {
      console.log("✅ AFS Payment Successful!");
      
      // Log successful AFS response in DB
      Post_Common_DB_Log_Data("/api/afs-recurring-payment-response-success", { transactionId: response.data.id }, response.data, subscription.opp_email);

      console.log(`📋 Transaction ID: ${response.data.id}`);
      console.log(`📋 Result Code: ${response.data.result.code}`);
      console.log(`📋 Result Description: ${response.data.result.description}`);
      console.log("💳 =============== PAYMENT PROCESSING COMPLETE ===============");
      await SavedCard.findByIdAndUpdate(savedCard._id, { lastUsedDate: new Date() });
      return response.data;
    }

    const errorMsg = `AFS Debit Fund failed: ${response.data?.result?.description || "Unknown error"}`;
    console.error("❌ AFS Payment Failed:", errorMsg);
    console.error("📋 Response Data:", JSON.stringify(response.data, null, 2));
    
    // Log failed AFS response in DB
    Post_Common_DB_Log_Data("/api/afs-recurring-payment-response-failed", { merchantTransactionId }, response.data, subscription.opp_email);

    console.log("💳 =============== PAYMENT PROCESSING COMPLETE ===============");
    throw new Error(errorMsg);
  } catch (axiosError) {
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    console.error("❌ =============== AFS API ERROR ===============");
    console.error(`📋 HTTP Status: ${status || "Network Error"}`);
    console.error(`📋 Error Message: ${axiosError.message}`);
    console.error(`📋 MerchantTransactionId: ${merchantTransactionId}`);

    // Log AFS API exception in DB
    Post_Common_DB_Log_Data("/api/afs-recurring-payment-exception", { merchantTransactionId, status: status || "Network Error" }, data || { error: axiosError.message }, subscription.opp_email);

    if (data) {
      console.error(`📋 Response Data:`, JSON.stringify(data, null, 2));
      // Check for duplicate transaction error specifically
      if (data.result?.description?.toLowerCase().includes("duplicate")) {
        console.error("⚠️ DUPLICATE TRANSACTION DETECTED!");
        console.error("⚠️ This means the same merchantTransactionId was used before.");
      }
    }
    console.error("❌ =============== AFS API ERROR COMPLETE ===============");
    console.log("💳 =============== PAYMENT PROCESSING COMPLETE ===============");

    if (status === 400) throw new Error(`AFS 400: ${JSON.stringify(data)}`);
    if (status === 401) throw new Error(`AFS 401: Unauthorized (check token)`);
    if (status === 403) throw new Error(`AFS 403: Forbidden (check entity/permission)`);
    if (status === 404) throw new Error(`AFS 404: Registration not found/expired`);
    if (status === 422) throw new Error(`AFS 422: Invalid payment data`);
    if (status >= 500) throw new Error(`AFS ${status}: Server error`);
    throw new Error(`AFS Error (${status || "Network"}): ${axiosError.message}`);
  }
}

/**
 * Test AFS Registration payment with a specific subscription
 */
export const testServerToServerPayment = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    if (!quotepaymentId) return res.status(400).json({ success: false, message: "Quote payment ID is required" });

    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    const savedCard = await getCustomerDefaultCard(subscription);
    if (!savedCard) {
      return res.status(400).json({
        success: false,
        message: "No valid saved card with AFS registration ID found for customer",
        subscription: {
          quotepaymentId: subscription.quotepaymentId,
          customerEmail: subscription.opp_email,
          customerName: subscription.Customer_name
        }
      });
    }

    const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2));
    const merchantTransactionId = buildMerchantTransactionId(subscription);

    return res.json({
      success: true,
      message: "AFS Registration payment test successful",
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
        installmentAmount,
        currency: "AED",
        paymentType: "PA",
        standingInstruction: { mode: "REPEATED", type: "UNSCHEDULED", source: "MIT" },
        merchantTransactionId,
        afsUrl: `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}/payments`
      }
    });
  } catch (error) {
    console.error("❌ Test server-to-server payment error:", error);
    return res.status(500).json({ success: false, message: "Test failed", error: error.message });
  }
};

/**
 * Get subscription status
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;

    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const response = {
      quotepaymentId: subscription.quotepaymentId,
      subscription_status: subscription.subscription_status,
      is_subscription: subscription.is_subscription,
      total_installments: subscription.InstallmentLeft,
      payments_completed: subscription.payments_completed,
      remaining_payments:
        subscription.InstallmentLeft && subscription.payments_completed !== undefined
          ? subscription.InstallmentLeft - subscription.payments_completed
          : null,
      next_charge_date: subscription.next_charge_date,
      last_payment_date: subscription.last_payment_date,
      installment_amount:
        subscription.InstallmentLeft && subscription.Total_After_VAT_Currency
          ? parseFloat((subscription.Total_After_VAT_Currency / subscription.InstallmentLeft).toFixed(2))
          : null,
      total_amount: subscription.Total_After_VAT_Currency,
      created_date: subscription.CreatedDate,
      afs_checkout_id: subscription.afs_checkout_id,
      afs_registration_id: subscription.afs_registration_id
    };

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get subscription status" });
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
      { subscription_status: "cancelled" },
      { new: true }
    );

    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    Post_Common_DB_Log_Data("/subscription/cancel", { quotepaymentId }, { message: "Subscription cancelled successfully" });

    return res.json({ message: "Subscription cancelled successfully", quotepaymentId, status: "cancelled" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to cancel subscription" });
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

    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    return res.json({
      message: "Next charge date updated successfully",
      quotepaymentId,
      next_charge_date: subscription.next_charge_date
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update next charge date" });
  }
};

/**
 * Fix missing InstallmentLeft field (for testing purposes)
 */
export const fixInstallmentLeft = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    const { installment_left } = req.body;

    const subscription = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      { InstallmentLeft: installment_left },
      { new: true }
    );

    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    return res.json({
      message: "InstallmentLeft field updated successfully",
      quotepaymentId,
      InstallmentLeft: subscription.InstallmentLeft,
      remaining_payments:
        subscription.InstallmentLeft && subscription.payments_completed !== undefined
          ? subscription.InstallmentLeft - subscription.payments_completed
          : null
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update InstallmentLeft" });
  }
};


// Alias internal function to old route name
export {
  checkAndHandleSubscriptionCompletion as checkSubscriptionCompletion
};

// Deprecated test endpoint (kept so app boots)
export const testPaymentFailureEmail = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "testPaymentFailureEmail endpoint deprecated"
  });
};

// Deprecated test endpoint (kept so app boots)
export const testSubscriptionCompletionEmail = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "testSubscriptionCompletionEmail endpoint deprecated"
  });
};



/**
 * Refund a payment using the AFS Refund (RV) API
 * Body: { transactionId, amount, quotepaymentId, installment_number? }
 */
export const refundPayment = async (req, res) => {
  const { transactionId, amount, quotepaymentId, installment_number } = req.body;

  console.log('💸 =============== REFUND REQUEST ===============');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('📋 Request Body:', req.body);

  if (!transactionId || !amount || !quotepaymentId) {
    return res.status(400).json({
      success: false,
      message: 'transactionId, amount, and quotepaymentId are required'
    });
  }

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  try {
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const afsUrl = `${process.env.AFS_DOMAIN}/v1/payments/${transactionId}`;
    const entityId = process.env.AFS_ENTITY_ID;
    const accessToken = process.env.AFS_ACCESS_TOKEN;

    const afsData = new URLSearchParams();
    afsData.append('entityId', entityId);
    afsData.append('amount', amountNumber.toFixed(2));
    afsData.append('currency', 'AED');
    afsData.append('paymentType', 'RV');

    const afsHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    console.log('🔗 AFS Refund Request:');
    console.log('- URL:', afsUrl);
    console.log('- Amount:', amountNumber.toFixed(2));
    console.log('- paymentType: RV');

    Post_Common_DB_Log_Data('/api/refund-request', { url: afsUrl, transactionId, amount: amountNumber.toFixed(2) }, { message: 'Refund request sent to AFS' }, subscription.opp_email);

    const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });
    const result = response.data;

    console.log('💸 AFS Refund Response:', result);

    if (result?.result?.code?.startsWith('000.')) {
      // Mark the installment as refunded if installment_number provided
      if (installment_number) {
        await Vzat_Recurring_Data.findOneAndUpdate(
          { _id: subscription._id, 'payment_schedule.installment_number': installment_number },
          { $set: { 'payment_schedule.$.status': 'refunded', 'payment_schedule.$.refund_transaction_id': result.id, 'payment_schedule.$.refund_date': new Date() } }
        );
      }

      Post_Common_DB_Log_Data('/api/refund-success', { transactionId, refundTransactionId: result.id }, result, subscription.opp_email);

      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        refundTransactionId: result.id,
        amount: amountNumber.toFixed(2),
        originalTransactionId: transactionId
      });
    } else {
      Post_Common_DB_Log_Data('/api/refund-failed', { transactionId }, result, subscription.opp_email);

      return res.status(400).json({
        success: false,
        message: result?.result?.description || 'Refund failed',
        afsResponse: result
      });
    }
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('💥 Refund error:', error.message);

    Post_Common_DB_Log_Data('/api/refund-exception', { transactionId, quotepaymentId }, data || { error: error.message });

    if (status === 404) return res.status(404).json({ success: false, message: 'Original transaction not found in AFS' });
    if (status === 400) return res.status(400).json({ success: false, message: 'AFS rejected refund request', afsResponse: data });
    return res.status(500).json({ success: false, message: 'Refund request failed', error: error.message });
  }
};

export default {
  handleAFSWebhook,
  processRecurringPayments,
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft,
  testServerToServerPayment,
  refundPayment
};

