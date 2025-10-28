import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";

/**
 * Validate and fix payment sequence to ensure logical consistency
 * Payments must be sequential - you can't have a later payment completed if an earlier one failed
 */
function validatePaymentSequence(payments) {
  if (!payments || payments.length === 0) return payments;
  
  console.log('🔍 Validating payment sequence...');
  console.log('📋 Input payments:', payments.map(p => ({ 
    installment: p.installment_number, 
    status: p.status,
    amount: p.amount,
    due_date: p.due_date
  })));
  
  // Sort by installment number to ensure correct order
  const sortedPayments = [...payments].sort((a, b) => {
    const aNum = a.installment_number || 0;
    const bNum = b.installment_number || 0;
    return aNum - bNum;
  });
  
  let validatedPayments = [];
  let hasFailedPayment = false;
  
  for (let i = 0; i < sortedPayments.length; i++) {
    // Create a proper copy of the payment object with all fields
    const payment = {
      installment_number: sortedPayments[i].installment_number,
      status: sortedPayments[i].status,
      amount: sortedPayments[i].amount,
      due_date: sortedPayments[i].due_date,
      _id: sortedPayments[i]._id,
      payment_date: sortedPayments[i].payment_date,
      transaction_id: sortedPayments[i].transaction_id
    };
    
    // Ensure all required fields are present
    if (!payment.installment_number) {
      console.log(`⚠️ Payment missing installment_number, skipping:`, payment);
      continue;
    }
    
    // Check if this payment is failed
    if (payment.status === 'failed') {
      hasFailedPayment = true;
      console.log(`❌ Found failed payment #${payment.installment_number}`);
    }
    
    // Only override status if there's a logical inconsistency:
    // - A later payment is completed while an earlier one is still pending/due (not failed)
    // - Don't override if the system has already processed payments according to retry logic
    if (hasFailedPayment) {
      // Only mark as pending if the payment is completed/paid AND there's no retry logic indication
      // If the payment is already completed in DB, it means the retry logic processed it successfully
      if (payment.status === 'completed' || payment.status === 'paid') {
        // Check if this is a legitimate completion (not a logical inconsistency)
        const isLegitimateCompletion = payment.payment_date || payment.transaction_id;
        if (!isLegitimateCompletion) {
          console.log(`⚠️ Fixing payment #${payment.installment_number}: ${payment.status} → pending (no payment evidence)`);
          payment.status = 'pending';
        } else {
          console.log(`✅ Payment #${payment.installment_number} is legitimately completed (has payment evidence)`);
        }
      }
    }
    
    validatedPayments.push(payment);
  }
  
  console.log('✅ Payment sequence validation complete');
  console.log('📋 Output payments:', validatedPayments.map(p => ({ 
    installment: p.installment_number, 
    status: p.status,
    amount: p.amount,
    due_date: p.due_date
  })));
  
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
       console.log(`🔍 Processing subscription: ${subscription.quotepaymentId}`);
       console.log(`📋 Payment schedule from DB:`, subscription.payment_schedule);
       
       let paymentSchedule = [];
       
       // Use the payment_schedule array from database if available
       if (subscription.payment_schedule && subscription.payment_schedule.length > 0) {
         // Sort payments by installment number to ensure correct order
         const sortedPayments = subscription.payment_schedule.sort((a, b) => {
           const aNum = a.installment_number || 0;
           const bNum = b.installment_number || 0;
           return aNum - bNum;
         });
         
         console.log(`📋 Sorted payments:`, sortedPayments.map(p => ({ 
           installment: p.installment_number, 
           status: p.status,
           amount: p.amount,
           due_date: p.due_date
         })));
         
         // Validate payment sequence and fix any logical inconsistencies
         const validatedPayments = validatePaymentSequence(sortedPayments);
         
         // Create payment schedule array from database payments
         paymentSchedule = validatedPayments.map(payment => ({
           installment_number: payment.installment_number,
           due_date: payment.due_date,
           amount: payment.amount,
           status: payment.status,
           q_payment_id: payment.q_payment_id || subscription.Quote_payment_number,
           salesforce_status: payment.salesforce_status || 'Unpaid',
           _id: payment._id
         }));
         
      } else {
        // Fallback: calculate payment schedule if not available in database
        const totalInstallments = subscription.InstallmentLeft || 1;
        const installmentAmount = parseFloat((subscription.Total_After_VAT_Currency / totalInstallments).toFixed(2));
        const paymentsCompleted = subscription.payments_completed || 0;
        
        for (let i = 1; i <= totalInstallments; i++) {
          const paymentDate = calculatePaymentDate(subscription.createdAt, i);
          const isPaid = i <= paymentsCompleted;
          const isDue = i === paymentsCompleted + 1 && subscription.subscription_status === 'active';
          
          let status = 'pending';
          if (isPaid) status = 'paid';
          else if (isDue) status = 'due';
          
          paymentSchedule.push({
            installment_number: i,
            due_date: paymentDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
            amount: installmentAmount,
            status: status,
            q_payment_id: subscription.Quote_payment_number,
            salesforce_status: 'Unpaid',
            _id: `${subscription.quotepaymentId}_${i}`
          });
        }
      }
      
      // Create the service object with payment_schedule array
      paymentScheduleServices.push({
        id: subscription.quotepaymentId,
        quotepaymentId: subscription.quotepaymentId,
        Customer_name: subscription.Customer_name || 'Customer',
        opp_email: subscription.opp_email || '',
        QuoteLineItemId: subscription.QuoteLineItemId || subscription.quotepaymentId,
        subscription_status: subscription.subscription_status,
        Quote_payment_number: subscription.Quote_payment_number,
        Product_details: subscription.Product_details || [],
        Total_After_VAT_Currency: subscription.Total_After_VAT_Currency,
        opportunityId: subscription.OpportunityId,
        quoteId: subscription.QuoteId,
        createdDate: subscription.createdAt,
        customerName: subscription.Customer_name || 'Customer',
        subscriptionStatus: subscription.subscription_status,
        payment_schedule: paymentSchedule
      });
    }

    // Sort services by customer name
    paymentScheduleServices.sort((a, b) => (a.Customer_name || '').localeCompare(b.Customer_name || ''));

    // Calculate summary statistics from all payment schedules
    const allPayments = paymentScheduleServices.flatMap(service => service.payment_schedule || []);
    
    const response = {
      success: true,
      customerEmail: customerEmail,
      totalServices: paymentScheduleServices.length,
      activeSubscriptions: activeSubscriptions.length,
      services: paymentScheduleServices,
      summary: {
        totalPaid: allPayments.filter(p => p.status === 'paid' || p.status === 'completed').length,
        totalDue: allPayments.filter(p => p.status === 'due').length,
        totalPending: allPayments.filter(p => p.status === 'pending').length,
        totalFailed: allPayments.filter(p => p.status === 'failed').length,
        totalAmountPaid: allPayments
          .filter(p => p.status === 'paid' || p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        totalAmountDue: allPayments
          .filter(p => p.status === 'due')
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        totalAmountPending: allPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + (p.amount || 0), 0)
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
      const isDue = i === paymentsCompleted + 1 && subscription.subscription_status === 'active';
      
      paymentSchedule.push({
        paymentNumber: i,
        scheduledDate: paymentDate,
        amount: installmentAmount,
        status: isPaid ? 'Paid' : (isDue ? 'Due' : 'Future'),
        paidDate: isPaid ? (i === paymentsCompleted ? subscription.last_payment_date : null) : null
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
  if (paymentNumber === 1) {
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
