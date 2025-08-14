import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";

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
