import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧮 Testing remaining amount calculation...');

// Test function to simulate the frontend calculation
function calculateRemainingAmount(service) {
  const totalAmount = service.Total_After_VAT_Currency || 0;
  const completedPayments = service.payment_schedule?.filter(p => p.status ***REMOVED***= 'completed' || p.status ***REMOVED***= 'paid') || [];
  const totalPaid = completedPayments.reduce((sum, payment) => {
    const amount = typeof payment.amount ***REMOVED***= 'string' ? parseFloat(payment.amount) : payment.amount;
    return sum + (amount || 0);
  }, 0);
  
  return {
    totalAmount,
    totalPaid,
    remaining: totalAmount - totalPaid,
    completedPayments: completedPayments.length,
    totalPayments: service.payment_schedule?.length || 0
  };
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('vzat_recurring_datas');
  
  // Find services with payment schedules
  const services = await collection.find({
    payment_schedule: { $exists: true, $ne: [] }
  }).limit(5).toArray();
  
  console.log(`\n📊 Found ${services.length} services with payment schedules\n`);
  
  services.forEach((service, index) => {
    console.log(`🔍 Service ${index + 1}:`);
    console.log(`   Quote Payment ID: ${service.quotepaymentId}`);
    console.log(`   Customer: ${service.Customer_name}`);
    
    const calculation = calculateRemainingAmount(service);
    
    console.log(`   💰 Financial Summary:`);
    console.log(`      Total Amount: AED ${calculation.totalAmount.toFixed(2)}`);
    console.log(`      Total Paid: AED ${calculation.totalPaid.toFixed(2)}`);
    console.log(`      Remaining: AED ${calculation.remaining.toFixed(2)}`);
    console.log(`      Progress: ${((calculation.totalPaid / calculation.totalAmount) * 100).toFixed(1)}%`);
    console.log(`      Payments: ${calculation.completedPayments}/${calculation.totalPayments} completed`);
    
    console.log(`   📅 Payment Schedule:`);
    service.payment_schedule?.forEach((payment, pIndex) => {
      const statusIcon = payment.status ***REMOVED***= 'completed' || payment.status ***REMOVED***= 'paid' ? '✅' : 
                        payment.status ***REMOVED***= 'pending' || payment.status ***REMOVED***= 'due' ? '🔄' : '⏳';
      console.log(`      ${statusIcon} Payment ${payment.installment_number}: AED ${payment.amount} - ${payment.status.toUpperCase()}`);
    });
    
    console.log('');
  });
  
  // Test with your specific example
  console.log('🧪 Testing with your example (Total: 1050, Payment 1: 210):');
  const testService = {
    Total_After_VAT_Currency: 1050,
    payment_schedule: [
      { installment_number: 1, amount: 210, status: 'completed', due_date: '2025-08-15' },
      { installment_number: 2, amount: 210, status: 'pending', due_date: '2025-09-15' },
      { installment_number: 3, amount: 210, status: 'pending', due_date: '2025-10-15' },
      { installment_number: 4, amount: 210, status: 'pending', due_date: '2025-11-15' },
      { installment_number: 5, amount: 210, status: 'pending', due_date: '2025-12-15' }
    ]
  };
  
  const testCalculation = calculateRemainingAmount(testService);
  console.log(`   Expected: Total 1050 - Paid 210 = Remaining 840`);
  console.log(`   Actual: Total ${testCalculation.totalAmount} - Paid ${testCalculation.totalPaid} = Remaining ${testCalculation.remaining}`);
  console.log(`   ✅ Calculation ${testCalculation.remaining ***REMOVED***= 840 ? 'CORRECT' : 'INCORRECT'}`);
  
  await mongoose.connection.close();
  console.log('\n🔚 Database connection closed');
}).catch(err => {
  console.error('❌ Database connection error:', err);
  process.exit(1);
});
