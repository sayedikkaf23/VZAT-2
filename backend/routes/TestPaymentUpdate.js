import express from 'express';
import Vzat_Recurring_Data from '../model/VzatRecurringDataModel.js';

const router = express.Router();

/**
 * Test endpoint to manually mark a payment as completed
 * This is for testing purposes only
 */
router.post('/test-complete-payment', async (req, res) => {
  try {
    const { quotepaymentId, installmentNumber } = req.body;
    
    console.log(`🧪 Test: Marking payment as completed for ${quotepaymentId}, installment ${installmentNumber}`);
    
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

    // Update the specific payment in payment_schedule
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        quotepaymentId,
        'payment_schedule.installment_number': installmentNumber
      },
      {
        $set: {
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': `TEST_${Date.now()}`,
          'payment_schedule.$.payment_date': new Date()
        }
      },
      { new: true }
    );

    if (updateResult) {
      // Update payments_completed counter
      await Vzat_Recurring_Data.findOneAndUpdate(
        { quotepaymentId },
        {
          $inc: { payments_completed: 1 },
          last_payment_date: new Date()
        }
      );

      // Update next payment to 'due' status
      const nextInstallment = installmentNumber + 1;
      await Vzat_Recurring_Data.findOneAndUpdate(
        { 
          quotepaymentId,
          'payment_schedule.installment_number': nextInstallment,
          'payment_schedule.status': 'pending'
        },
        {
          $set: {
            'payment_schedule.$.status': 'due'
          }
        }
      );

      console.log(`✅ Test: Payment ${installmentNumber} marked as completed`);
      
      return res.json({
        success: true,
        message: `Payment ${installmentNumber} marked as completed`,
        data: {
          quotepaymentId,
          installmentNumber,
          nextInstallment
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `Payment ${installmentNumber} not found in payment schedule`
      });
    }

  } catch (error) {
    console.error('❌ Test payment update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Test endpoint to reset payment status for testing
 */
router.post('/test-reset-payments', async (req, res) => {
  try {
    const { quotepaymentId } = req.body;
    
    console.log(`🧪 Test: Resetting payments for ${quotepaymentId}`);
    
    if (!quotepaymentId) {
      return res.status(400).json({
        success: false,
        message: 'quotepaymentId is required'
      });
    }

    // Reset all payments to pending except first one to due
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { quotepaymentId },
      {
        $set: {
          payments_completed: 0,
          'payment_schedule.$[first].status': 'due',
          'payment_schedule.$[rest].status': 'pending'
        }
      },
      {
        arrayFilters: [
          { 'first.installment_number': 1 },
          { 'rest.installment_number': { $gt: 1 } }
        ],
        new: true
      }
    );

    if (updateResult) {
      console.log(`✅ Test: Payments reset for ${quotepaymentId}`);
      
      return res.json({
        success: true,
        message: `Payments reset for ${quotepaymentId}`,
        data: {
          quotepaymentId,
          payments_completed: 0
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

  } catch (error) {
    console.error('❌ Test payment reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Test endpoint to view payment schedule status
 */
router.get('/test-payment-status/:quotepaymentId', async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    return res.json({
      success: true,
      data: {
        quotepaymentId,
        payments_completed: subscription.payments_completed,
        subscription_status: subscription.subscription_status,
        payment_schedule: subscription.payment_schedule || []
      }
    });

  } catch (error) {
    console.error('❌ Test payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
