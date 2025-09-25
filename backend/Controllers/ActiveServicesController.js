import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";

/**
 * Validate and fix payment sequence to ensure logical consistency
 * Payments must be sequential - you can't have a later payment completed if an earlier one failed
 */
function validatePaymentSequence(payments) {
  if (!payments || payments.length ***REMOVED***= 0) return payments;
  
  console.log('🔍 Validating payment sequence...');
  
  // Sort by installment number to ensure correct order
  const sortedPayments = [...payments].sort((a, b) => a.installment_number - b.installment_number);
  
  let validatedPayments = [];
  let hasFailedPayment = false;
  
  for (let i = 0; i < sortedPayments.length; i++) {
    const payment = { ...sortedPayments[i] };
    
    // If we've encountered a failed payment, all subsequent payments should be pending/due
    if (hasFailedPayment) {
      if (payment.status ***REMOVED***= 'completed' || payment.status ***REMOVED***= 'paid') {
        console.log(`⚠️ Fixing payment #${payment.installment_number}: ${payment.status} → pending (due to earlier failed payment)`);
        payment.status = 'pending';
      }
    } else {
      // Check if this payment is failed
      if (payment.status ***REMOVED***= 'failed') {
        hasFailedPayment = true;
        console.log(`❌ Found failed payment #${payment.installment_number} - marking subsequent payments as pending`);
      }
    }
    
    validatedPayments.push(payment);
  }
  
  console.log('✅ Payment sequence validation complete');
  return validatedPayments;
}

/**
 * Get active services (payment schedules) for customer portal
 * This will show payment schedule details instead of static service data
 */
export const getActiveServices = async (req, res) => {
  try {
    const { customerEmail } = req.query;
    
    console.log(`🔍 Fetching active services for customer: ${customerEmail}`);
    
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    // Find all active subscriptions for the customer (including pending)
    const activeSubscriptions = await Vzat_Recurring_Data.find({
      opp_email: customerEmail,
      subscription_status: { $in: ['active', 'completed', 'pending'] }
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${activeSubscriptions.length} active services for ${customerEmail}`);
    console.log(`📊 Subscription statuses found:`, activeSubscriptions.map(sub => ({
      quotepaymentId: sub.quotepaymentId,
      status: sub.subscription_status,
      customerName: sub.Customer_name
    })));

    // Transform subscription data to payment schedule format
    const paymentScheduleServices = [];

    for (const subscription of activeSubscriptions) {
      // Use the payment_schedule array from database if available
      if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
        // Sort payments by installment number to ensure correct order
        const sortedPayments = subscription.payment_schedule.sort((a, b) => a.installment_number - b.installment_number);
        
        // Validate payment sequence and fix any logical inconsistencies
        const validatedPayments = validatePaymentSequence(sortedPayments);
        
        // Get payment schedule entries directly from database
        for (const payment of validatedPayments) {
          paymentScheduleServices.push({
            id: `${subscription.quotepaymentId}_${payment.installment_number}`,
            installment_number: payment.installment_number,
            Customer_name: subscription.Customer_name || 'Customer', // Database field name
            opp_email: subscription.opp_email || '', // Database field name
            QuoteLineItemId: subscription.QuoteLineItemId || subscription.quotepaymentId, // Database field name
            subscription_status: subscription.subscription_status, // Database field name
            quotepaymentId: subscription.quotepaymentId,
            due_date: payment.due_date,
            amount: payment.amount,
            status: payment.status,
            // Additional fields for reference
            opportunityId: subscription.OpportunityId,
            quoteId: subscription.QuoteId,
            createdDate: subscription.createdAt,
            // Keep legacy fields for backward compatibility
            customerName: subscription.Customer_name || 'Customer',
            subscriptionStatus: subscription.subscription_status
          });
        }
      } else {
        // Fallback: calculate payment schedule if not available in database
        const totalInstallments = subscription.InstallmentLeft || 1;
        const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / totalInstallments).toFixed(2));
        const paymentsCompleted = subscription.payments_completed || 0;
        
        for (let i = 1; i <= totalInstallments; i++) {
          const paymentDate = calculatePaymentDate(subscription.createdAt, i);
          const isPaid = i <= paymentsCompleted;
          const isDue = i ***REMOVED***= paymentsCompleted + 1 && subscription.subscription_status ***REMOVED***= 'active';
          
          let status = 'pending';
          if (isPaid) status = 'paid';
          else if (isDue) status = 'due';
          
          paymentScheduleServices.push({
            id: `${subscription.quotepaymentId}_${i}`,
            installment_number: i,
            Customer_name: subscription.Customer_name || 'Customer', // Database field name
            opp_email: subscription.opp_email || '', // Database field name
            QuoteLineItemId: subscription.QuoteLineItemId || subscription.quotepaymentId, // Database field name
            subscription_status: subscription.subscription_status, // Database field name
            quotepaymentId: subscription.quotepaymentId,
            due_date: paymentDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
            amount: installmentAmount,
            status: status,
            opportunityId: subscription.OpportunityId,
            quoteId: subscription.QuoteId,
            createdDate: subscription.createdAt,
            // Keep legacy fields for backward compatibility
            customerName: subscription.Customer_name || 'Customer',
            subscriptionStatus: subscription.subscription_status
          });
        }
      }
    }

    // Sort by due date (most recent first)
    paymentScheduleServices.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

    const response = {
      success: true,
      customerEmail: customerEmail,
      totalServices: paymentScheduleServices.length,
      activeSubscriptions: activeSubscriptions.length,
      services: paymentScheduleServices,
      summary: {
        totalPaid: paymentScheduleServices.filter(s => s.status ***REMOVED***= 'paid' || s.status ***REMOVED***= 'completed').length,
        totalDue: paymentScheduleServices.filter(s => s.status ***REMOVED***= 'due').length,
        totalPending: paymentScheduleServices.filter(s => s.status ***REMOVED***= 'pending').length,
        totalFailed: paymentScheduleServices.filter(s => s.status ***REMOVED***= 'failed').length,
        totalAmountPaid: paymentScheduleServices
          .filter(s => s.status ***REMOVED***= 'paid' || s.status ***REMOVED***= 'completed')
          .reduce((sum, s) => sum + s.amount, 0),
        totalAmountDue: paymentScheduleServices
          .filter(s => s.status ***REMOVED***= 'due')
          .reduce((sum, s) => sum + s.amount, 0),
        totalAmountPending: paymentScheduleServices
          .filter(s => s.status ***REMOVED***= 'pending')
          .reduce((sum, s) => sum + s.amount, 0)
      }
    };

    // Log the request
    Post_Common_DB_Log_Data('/api/customer/active-services', { customerEmail }, response);

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching active services:', error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to fetch active services',
      error: error.message
    };

    Post_Common_DB_Log_Data('/api/customer/active-services', { customerEmail: req.query.customerEmail }, errorResponse);
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Get specific service details
 */
export const getServiceDetails = async (req, res) => {
  try {
    const { quotepaymentId } = req.params;
    const { customerEmail } = req.query;

    console.log(`🔍 Fetching service details for: ${quotepaymentId}`);

    const subscription = await Vzat_Recurring_Data.findOne({
      quotepaymentId: quotepaymentId,
      opp_email: customerEmail
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Calculate detailed payment schedule
    const totalInstallments = subscription.InstallmentLeft || 1;
    const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / totalInstallments).toFixed(2));
    const paymentsCompleted = subscription.payments_completed || 0;
    
    const paymentSchedule = [];
    for (let i = 1; i <= totalInstallments; i++) {
      const paymentDate = calculatePaymentDate(subscription.createdAt, i);
      const isPaid = i <= paymentsCompleted;
      const isDue = i ***REMOVED***= paymentsCompleted + 1 && subscription.subscription_status ***REMOVED***= 'active';
      
      paymentSchedule.push({
        paymentNumber: i,
        scheduledDate: paymentDate,
        amount: installmentAmount,
        status: isPaid ? 'Paid' : (isDue ? 'Due' : 'Future'),
        paidDate: isPaid ? (i ***REMOVED***= paymentsCompleted ? subscription.last_payment_date : null) : null
      });
    }

    const serviceDetails = {
      success: true,
      quotepaymentId: subscription.quotepaymentId,
      serviceName: getServiceName(subscription.InstallmentType),
      customerName: subscription.Customer_name,
      totalAmount: subscription.Total_After_VAT_Currency,
      installmentAmount: installmentAmount,
      totalInstallments: totalInstallments,
      paymentsCompleted: paymentsCompleted,
      subscriptionStatus: subscription.subscription_status,
      nextChargeDate: subscription.next_charge_date,
      lastPaymentDate: subscription.last_payment_date,
      paymentSchedule: paymentSchedule,
      opportunityId: subscription.OpportunityId,
      quoteId: subscription.QuoteId,
      createdDate: subscription.createdAt
    };

    res.json(serviceDetails);

  } catch (error) {
    console.error('❌ Error fetching service details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service details',
      error: error.message
    });
  }
};

/**
 * Calculate payment date based on subscription creation and payment number
 */
function calculatePaymentDate(createdDate, paymentNumber) {
  const baseDate = new Date(createdDate);
  
  // First payment is typically due immediately or within a few days
  if (paymentNumber ***REMOVED***= 1) {
    return baseDate;
  }
  
  // Subsequent payments follow the monthly schedule
  // Using the same logic as the subscription system (10th or 25th of month)
  const monthsToAdd = paymentNumber - 1;
  const paymentDate = new Date(baseDate);
  paymentDate.setMonth(paymentDate.getMonth() + monthsToAdd);
  
  // Set to 10th or 25th based on original creation date
  const day = baseDate.getDate();
  const chargeDay = day <= 15 ? 10 : 25;
  paymentDate.setDate(chargeDay);
  
  return paymentDate;
}

/**
 * Get service name based on installment type
 */
function getServiceName(installmentType) {
  const serviceNames = {
    'Quarterly': 'Business Setup - Quarterly Plan',
    'Monthly': 'Business Setup - Monthly Plan',
    'Half-Yearly': 'Business Setup - Half-Yearly Plan',
    'Yearly': 'Business Setup - Yearly Plan',
    'One-time': 'Business Setup - One-time Payment'
  };
  
  return serviceNames[installmentType] || `Business Service - ${installmentType}`;
}

export default {
  getActiveServices,
  getServiceDetails
};
