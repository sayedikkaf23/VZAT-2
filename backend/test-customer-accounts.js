import Customer from './model/CustomerLoginModel.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('📊 Checking customer accounts...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('📊 Current customer accounts:');
  const customers = await Customer.find({}).select('email customerName quotepaymentId accountCreatedDate').sort({accountCreatedDate: -1}).limit(10);
  
  if (customers.length === 0) {
    console.log('   No customer accounts found');
  } else {
    customers.forEach((customer, index) => {
      console.log(`   ${index + 1}. Email: ${customer.email}, Name: ${customer.customerName}, QuotePaymentId: ${customer.quotepaymentId}, Created: ${customer.accountCreatedDate}`);
    });
  }
  
  console.log(`\n📊 Total customers: ${customers.length}`);
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
}).catch(err => {
  console.error('❌ Database connection error:', err);
});
