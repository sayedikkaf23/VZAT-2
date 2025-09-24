import mongoose from 'mongoose';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vzat_recurring_data');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugRetryIssue = async () => {
  try {
    await connectDB();
    
    const quotepaymentId = 'aAWdu0000007CpFGAU';
    
    // Find the subscription
    const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('📋 Current subscription payment schedule:');
    subscription.payment_schedule.forEach(p => {
      console.log(`  - Payment ${p.installment_number}: ${p.status} (${p.amount}) - ID: ${p._id}`);
    });
    
    // Find failed payment
    const failedPayment = subscription.payment_schedule.find(p => p.status === 'failed');
    
    if (!failedPayment) {
      console.log('❌ No failed payment found');
      return;
    }
    
    console.log('\n🔍 Failed payment details:');
    console.log('  - Installment Number:', failedPayment.installment_number);
    console.log('  - Status:', failedPayment.status);
    console.log('  - Amount:', failedPayment.amount);
    console.log('  - MongoDB ID:', failedPayment._id);
    
    // Test the update query
    console.log('\n🧪 Testing update query...');
    
    const testTransactionId = 'test-transaction-' + Date.now();
    
    const updateResult = await Vzat_Recurring_Data.findOneAndUpdate(
      { 
        _id: subscription._id, 
        'payment_schedule.installment_number': failedPayment.installment_number 
      },
      { 
        $set: { 
          'payment_schedule.$.status': 'completed',
          'payment_schedule.$.transaction_id': testTransactionId,
          'payment_schedule.$.payment_date': new Date()
        } 
      },
      { new: true }
    );
    
    if (updateResult) {
      console.log('✅ Update query executed successfully');
      
      // Check what was actually updated
      const updatedSubscription = await Vzat_Recurring_Data.findById(subscription._id);
      console.log('\n📋 Updated payment schedule:');
      updatedSubscription.payment_schedule.forEach(p => {
        console.log(`  - Payment ${p.installment_number}: ${p.status} (${p.amount}) - Transaction: ${p.transaction_id || 'N/A'}`);
      });
    } else {
      console.log('❌ Update query failed');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
};

debugRetryIssue();
