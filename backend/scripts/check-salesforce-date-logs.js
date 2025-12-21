/**
 * Script to check what date was sent to Salesforce for second payments
 * Usage: node scripts/check-salesforce-date-logs.js [quotepaymentId]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SalesforceApiLog from '../model/SalesforceApiLogModel.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkSalesforceDateLogs = async (quotepaymentId = null) => {
  await connectDB();

  try {
    console.log('\n📊 Checking Salesforce API logs for date information...\n');

    const query = {
      endpoint: { $regex: /updateQuotePaymentStatus/i },
      method: 'PUT'
    };

    if (quotepaymentId) {
      query.quotepaymentId = quotepaymentId;
      console.log(`🔍 Filtering by quotepaymentId: ${quotepaymentId}\n`);
    }

    // Get recent logs (last 100)
    const logs = await SalesforceApiLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`📋 Found ${logs.length} Salesforce API logs\n`);

    if (logs.length === 0) {
      console.log('❌ No logs found');
      return;
    }

    // Display logs with date information
    logs.forEach((log, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Log #${index + 1}`);
      console.log(`ID: ${log._id}`);
      console.log(`QuotePaymentId: ${log.quotepaymentId || 'N/A'}`);
      console.log(`Created At: ${log.createdAt}`);
      console.log(`Success: ${log.isSuccess}`);
      console.log(`Status Code: ${log.statusCode || 'N/A'}`);

      if (log.requestData) {
        console.log('\n📤 Request Data Sent to Salesforce:');
        console.log(JSON.stringify(log.requestData, null, 2));
        
        // Highlight the Current_due_date field
        if (log.requestData.Current_due_date) {
          console.log(`\n📅 Current_due_date sent to Salesforce: ${log.requestData.Current_due_date}`);
        }
      }

      if (log.responseData) {
        console.log('\n📥 Response Data from Salesforce:');
        console.log(JSON.stringify(log.responseData, null, 2));
      }

      if (log.errorMessage) {
        console.log(`\n❌ Error: ${log.errorMessage}`);
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ Analysis Complete\n`);

    // Summary: Check for second payments (installmentNumber = 2)
    const secondPaymentLogs = logs.filter(log => {
      const requestData = log.requestData;
      // Check if this might be a second payment (we can't directly identify it, 
      // but we can look for patterns in the request data)
      return requestData && requestData.QuotePaymentId;
    });

    console.log(`📊 Summary:`);
    console.log(`   Total logs found: ${logs.length}`);
    console.log(`   Logs with QuotePaymentId: ${secondPaymentLogs.length}`);
    console.log(`\n💡 To find second payment logs, look for logs where:`);
    console.log(`   - The payment was successful (isSuccess: true)`);
    console.log(`   - Check the Current_due_date in requestData`);
    console.log(`   - Compare with the actual next_charge_date from the subscription`);

  } catch (error) {
    console.error('❌ Error checking logs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
};

// Get quotepaymentId from command line arguments
const quotepaymentId = process.argv[2] || null;

checkSalesforceDateLogs(quotepaymentId);
