// Test script to create a sample payment link
import axios from 'axios';

const testPaymentData = {
  OpportunityId: "TEST-OPP-001",
  quotepaymentId: "TEST-QP-" + Date.now(), // Unique ID
  QuoteId: "TEST-QUOTE-001",
  CreatedDate: "2026-01-07",
  Status: "Active",
  TotalPrice: 800.00,
  Total_After_VAT_Currency: 875.00,
  InstallmentType: "Installments",
  InstallmentLeft: 4,
  First_Charge_Date: "2026-01-07",
  Customer_name: "Test Customer",
  opp_email: "test@example.com",
  opp_number: "+971501234567",
  Product_details: [
    {
      QuoteLineItemId: "QLI-001",
      ProductName: "Test Product",
      TotalPrice: 800.00,
      Total_Price_After_VAT: 875.00
    }
  ]
};

console.log('🚀 Creating test payment link...\n');

axios.post('http://localhost:3000/api/vzat_recurring_create_payment_link', testPaymentData)
  .then(response => {
    console.log('✅ SUCCESS!\n');
    console.log('📋 Payment Details:');
    console.log('   Quote Payment ID:', response.data.quotepaymentId);
    console.log('   Amount:', response.data.payment_amount, 'AED');
    console.log('   Installments:', response.data.installments_left);
    console.log('\n🔗 PAYMENT LINK (NEVER EXPIRES):');
    console.log('   ', response.data.payment_page_url);
    console.log('\n✨ This link will work even after months!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open the payment link in your browser');
    console.log('   2. Click "Click Here To Pay" button');
    console.log('   3. A fresh checkout ID will be generated');
    console.log('   4. Complete the payment');
  })
  .catch(error => {
    console.error('❌ Error:', error.response?.data || error.message);
  });
