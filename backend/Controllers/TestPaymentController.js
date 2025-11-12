import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import { sendFinalRenewalEmail } from '../services/emailService.js';

/**
 * Test endpoint to simulate payment completion for testing purposes
 */
export const testPaymentCompletion = async (req, res) => {
  try {
    const { quotepaymentId, installmentNumber } = req.body;
    
    console.log(`🧪 Test payment completion for ${quotepaymentId}, installment ${installmentNumber}`);
    
    if (!quotepaymentId || !installmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'quotepaymentId and installmentNumber are required'
      });
    }

    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update the specific payment in the payment_schedule array
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        quotepaymentId: quotepaymentId,
        'payment_schedule.installment_number': parseInt(installmentNumber)
      },
      {
        $set: {
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': `test_${Date.now()}`,
          'payment_schedule.$.payment_date': new Date()
        }
      },
      { new: true }
    );

    if (updateResult) {
      console.log(`✅ Test payment ${installmentNumber} marked as completed`);
      
      // Update the next payment status to 'due' if it exists
      const nextPaymentNumber = parseInt(installmentNumber) + 1;
      await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          quotepaymentId: quotepaymentId,
          'payment_schedule.installment_number': nextPaymentNumber,
          'payment_schedule.status': 'pending'
        },
        {
          $set: {
            'payment_schedule.$.status': 'due'
          }
        }
      );
      
      console.log(`✅ Next payment (${nextPaymentNumber}) status updated to 'due'`);
      
      // Update payments_completed count
      await Vzat_Recurring_Data.findOneAndUpdate(
        { quotepaymentId: quotepaymentId },
        { $inc: { payments_completed: 1 } }
      );

      // Check if subscription is complete after this payment
      try {
        console.log('🔍 Checking subscription completion after test payment...');
        const updatedSubscription = await Vzat_Recurring_Data.findOne({ quotepaymentId: quotepaymentId });
        
        if (updatedSubscription) {
          // Check if ALL payments are completed
          const allPaymentsCompleted = updatedSubscription.payment_schedule.every(p => 
            p.status ***REMOVED***= 'completed' || p.status ***REMOVED***= 'paid'
          );
          
          // Check for any failed or due payments
          const failedPayments = updatedSubscription.payment_schedule.filter(p => 
            p.status ***REMOVED***= 'failed' || p.status ***REMOVED***= 'due' || p.status ***REMOVED***= 'pending'
          );
          
          const isComplete = updatedSubscription.payments_completed >= updatedSubscription.InstallmentLeft && 
                            allPaymentsCompleted && 
                            failedPayments.length ***REMOVED***= 0;
          
          console.log('📊 Test Payment Completion Check:', {
            quotepaymentId: updatedSubscription.quotepaymentId,
            payments_completed: updatedSubscription.payments_completed,
            total_installments: updatedSubscription.InstallmentLeft,
            all_payments_completed: allPaymentsCompleted,
            failed_or_due_payments: failedPayments.length,
            isComplete: isComplete
          });
          
          if (isComplete && updatedSubscription.subscription_status !***REMOVED*** 'completed') {
            console.log(`🎉 TEST PAYMENT: SUBSCRIPTION COMPLETED for ${quotepaymentId}!`);
            
            // Update status to completed and set next_charge_date to null
            await Vzat_Recurring_Data.findByIdAndUpdate(updatedSubscription._id, {
              subscription_status: 'completed',
              next_charge_date: null,
              renewal_email_sent: true,
              renewal_email_sent_date: new Date()
            });
            
            // Send completion email
            try {
              const emailResult = await sendFinalRenewalEmail({
                quotepaymentId: updatedSubscription.quotepaymentId,
                Customer_name: updatedSubscription.Customer_name,
                opp_email: updatedSubscription.opp_email,
                opp_owner: updatedSubscription.opp_owner,
                payments_completed: updatedSubscription.payments_completed,
                InstallmentLeft: updatedSubscription.InstallmentLeft,
                last_payment_date: updatedSubscription.last_payment_date,
                salesPersonDetails: updatedSubscription.salesPersonDetails
              });
              
              if (emailResult.success) {
                console.log('📧 ✅ Test payment completion email sent successfully!');
                console.log(`📧 Email ID: ${emailResult.messageId}`);
              } else {
                console.error('📧 ❌ Failed to send test payment completion email:', emailResult.error);
              }
            } catch (emailError) {
              console.error('📧 ❌ Error sending test payment completion email:', emailError);
            }
            
            console.log(`🎉 TEST PAYMENT: SUBSCRIPTION COMPLETED! Final email sent for ${quotepaymentId}`);
          } else if (isComplete) {
            console.log(`📧 Test payment: Subscription already marked as completed for ${quotepaymentId}`);
          } else {
            console.log(`📋 Test payment: Subscription not yet complete for ${quotepaymentId}`);
          }
        }
      } catch (completionError) {
        console.error('❌ Error checking subscription completion in test payment:', completionError);
        console.log('⚠️ Continuing test payment processing despite completion check error');
      }

      return res.json({
        success: true,
        message: `Payment ${installmentNumber} completed successfully`,
        quotepaymentId: quotepaymentId,
        completedInstallment: installmentNumber,
        nextDueInstallment: nextPaymentNumber
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `Payment ${installmentNumber} not found in payment schedule`
      });
    }

  } catch (error) {
    console.error('❌ Error in test payment completion:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Test endpoint to reset payment status for testing purposes
 */
export const testPaymentReset = async (req, res) => {
  try {
    const { quotepaymentId, installmentNumber } = req.body;
    
    console.log(`🧪 Test payment reset for ${quotepaymentId}, installment ${installmentNumber}`);
    
    if (!quotepaymentId || !installmentNumber) {
      return res.status(400).json({
        success: false,
        message: 'quotepaymentId and installmentNumber are required'
      });
    }

    // Reset the specific payment in the payment_schedule array
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        quotepaymentId: quotepaymentId,
        'payment_schedule.installment_number': parseInt(installmentNumber)
      },
      {
        $set: {
          'payment_schedule.$.status': 'pending',
          'payment_schedule.$.transaction_id': null,
          'payment_schedule.$.payment_date': null
        }
      },
      { new: true }
    );

    if (updateResult) {
      console.log(`✅ Test payment ${installmentNumber} reset to pending`);
      
      // Reset payments_completed count
      await Vzat_Recurring_Data.findOneAndUpdate(
        { quotepaymentId: quotepaymentId },
        { $inc: { payments_completed: -1 } }
      );

      return res.json({
        success: true,
        message: `Payment ${installmentNumber} reset to pending`,
        quotepaymentId: quotepaymentId,
        resetInstallment: installmentNumber
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `Payment ${installmentNumber} not found in payment schedule`
      });
    }

  } catch (error) {
    console.error('❌ Error in test payment reset:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
