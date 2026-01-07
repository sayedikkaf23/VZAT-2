// Quick test to check if payment record exists
import mongoose from 'mongoose';
import Vzat_Recurring_Data from './model/VzatRecurringDataModel.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.sandbox' });

const quotepaymentId = 'aAWdu000000BIb7GAG';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const record = await Vzat_Recurring_Data.findOne({ quotepaymentId });
    
    if (record) {
      console.log('\n✅ Payment record found!');
      console.log('Quote Payment ID:', record.quotepaymentId);
      console.log('Customer:', record.Customer_name);
      console.log('Amount:', record.Total_After_VAT_Currency);
      console.log('Installments:', record.InstallmentLeft);
      console.log('Old Checkout ID:', record.afs_checkout_id || 'None');
      console.log('\n📋 NEW PAYMENT URL:');
      console.log(`http://localhost:3000/payment/${quotepaymentId}`);
    } else {
      console.log('❌ Payment record NOT found');
      console.log('You need to create a new payment link to test');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
