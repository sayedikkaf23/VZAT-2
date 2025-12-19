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
          opp_email: subscription.opp_email,
          opp_owner: subscription.opp_owner,
          payment_amount: parseFloat(result.amount),
          payment_date: new Date(result.timestamp || new Date()),
          installment_number: updatedRecord.payments_completed,
          total_installments: subscription.InstallmentLeft,
          payment_method: "Card",
          salesPersonDetails: subscription.salesPersonDetails
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
    });

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
    });

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
    console.error(" Error scheduling next payment:", error);
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

    const dueSubscriptions = await Vzat_Recurring_Data.find({
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
      ],
      $and: [
        {
          $or: [{ last_processed_date: { $exists: false } }, { last_processed_date: { $lt: today } }]
        }
      ]
    });

    const results = [];

    for (const subscription of dueSubscriptions) {
      try {
        let paymentToProcess = subscription.payments_completed + 1;
        let isProcessingNextPayment = false;

        if (subscription.payment_retry_count >= 3) {
          const nextDuePayment = subscription.payment_schedule.find(
            (p) => p.status === "due" || p.status === "pending"
          );
          if (nextDuePayment) {
            paymentToProcess = nextDuePayment.installment_number;
            isProcessingNextPayment = true;
          }
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
                payments_completed: paymentToProcess,
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
              opp_email: subscription.opp_email,
              opp_owner: subscription.opp_owner,
              payment_amount: parseFloat(paymentResult.amount),
              payment_date: new Date(paymentResult.timestamp || new Date()),
              installment_number: paymentToProcess,
              total_installments: subscription.InstallmentLeft,
              payment_method: "Card",
              salesPersonDetails: subscription.salesPersonDetails
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

          results.push({ quotepaymentId: subscription.quotepaymentId, status: "processed", result: paymentResult });
        } else {
          throw new Error(`Payment failed: ${paymentResult?.result?.description || "Unknown error"}`);
        }
      } catch (error) {
        // FAILURE HANDLING (kept as you had)
        console.error("❌ =============== PAYMENT FAILED ===============");
        console.error(`📋 QuotePaymentId: ${subscription.quotepaymentId}`);
        console.error(`📋 Error: ${error.message}`);
        
        const retryCount = subscription.payment_retry_count || 0;
        const maxRetries = 3;
        
        console.log(`🔄 Current Retry Count: ${retryCount}/${maxRetries}`);

        // mark processed + retry scheduling
        let nextChargeDate = new Date();
        nextChargeDate.setDate(nextChargeDate.getDate() + 1);
        nextChargeDate.setHours(0, 0, 0, 0);
        
        console.log(`🔄 Scheduling retry for: ${nextChargeDate.toISOString()}`);

        await Vzat_Recurring_Data.findByIdAndUpdate(subscription._id, {
          last_processed_date: new Date(),
          payment_retry_count: retryCount + 1,
          next_charge_date: nextChargeDate
        });

        // mark schedule failed
        const currentPaymentNumber = (subscription.payments_completed || 0) + 1;
        await Vzat_Recurring_Data.findOneAndUpdate(
          { _id: subscription._id, "payment_schedule.installment_number": currentPaymentNumber },
          { $set: { "payment_schedule.$.status": "failed", "payment_schedule.$.failure_date": new Date() } }
        );

        // send failure email once/day
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

            const failedPayment = subscription.payment_schedule.find(
              (p) => p.installment_number === currentPaymentNumber
            );
            const q_payment_id =
              failedPayment?.q_payment_id ||
              subscription.Quote_payment_number ||
              subscription.quotepaymentId;

            const emailData = {
              quotepaymentId: subscription.quotepaymentId,
              q_payment_id,
              Customer_name: subscription.Customer_name || "Customer",
              opp_email: subscription.opp_email,
              opp_owner: subscription.opp_owner,
              payment_amount: installmentAmount,
              due_date: today.toISOString().slice(0, 10),
              failure_reason: cleanErrorMessage,
              payment_link: "https://vzatnew.yeepeey.com/login",
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

        results.push({
          quotepaymentId: subscription.quotepaymentId,
          status: "failed",
          error: error.message,
          retry_count: retryCount + 1,
          max_retries: maxRetries
        });
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

  // Calculate installment amount
  const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / installmentLeft).toFixed(2));
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
  afsData.append("amount", installmentAmount.toString());
  afsData.append("currency", "AED");
  afsData.append("paymentType", "PA");

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
    const response = await axios.post(afsUrl, afsData, { headers: afsHeaders });

    if (response.data?.result?.code?.startsWith("000.")) {
      console.log("✅ AFS Payment Successful!");
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
    console.log("💳 =============== PAYMENT PROCESSING COMPLETE ===============");
    throw new Error(errorMsg);
  } catch (axiosError) {
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    console.error("❌ =============== AFS API ERROR ===============");
    console.error(`📋 HTTP Status: ${status || "Network Error"}`);
    console.error(`📋 Error Message: ${axiosError.message}`);
    console.error(`📋 MerchantTransactionId: ${merchantTransactionId}`);
    
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



export default {
  handleAFSWebhook,
  processRecurringPayments,
  getSubscriptionStatus,
  cancelSubscription,
  updateNextChargeDate,
  fixInstallmentLeft,
  testServerToServerPayment
};

