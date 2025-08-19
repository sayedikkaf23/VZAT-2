import mongoose from 'mongoose';
import VzatRecurringData from './model/VzatRecurringDataModel.js';
import { connectDB } from './config/db.js';

async function findAllUserSubscriptions() {
    try {
        console.log('🔍 Finding ALL subscriptions for user...');
        
        await connectDB();
        console.log('✅ Database connected');
        
        const testEmail = 'sayed1223@yeepeey.com';
        const testQuotePaymentId = 'aAWdu0000005irdGAA';
        
        console.log(`\n👤 Searching for subscriptions for: ${testEmail}`);
        console.log(`💳 Customer's quotepaymentId: ${testQuotePaymentId}`);
        
        // 1. Search by email (any status)
        console.log('\n🔍 Search 1: By Customer_email (any status)');
        const subscriptionsByEmail = await VzatRecurringData.find({ 
            Customer_email: testEmail 
        });
        console.log(`Found ${subscriptionsByEmail.length} subscriptions by email`);
        
        // 2. Search by quotepaymentId
        console.log('\n🔍 Search 2: By quotepaymentId');
        const subscriptionsByQuoteId = await VzatRecurringData.find({ 
            quotepaymentId: testQuotePaymentId 
        });
        console.log(`Found ${subscriptionsByQuoteId.length} subscriptions by quotepaymentId`);
        
        // 3. Get all possible statuses
        console.log('\n🔍 Search 3: All distinct subscription statuses in database');
        const allStatuses = await VzatRecurringData.distinct('subscription_status');
        console.log('All statuses found:', allStatuses);
        
        // 4. Show details of any found subscriptions
        const allUserSubs = [...subscriptionsByEmail, ...subscriptionsByQuoteId];
        const uniqueSubs = allUserSubs.filter((sub, index, self) => 
            index === self.findIndex(s => s._id.toString() === sub._id.toString())
        );
        
        if (uniqueSubs.length > 0) {
            console.log('\n📋 Subscription Details:');
            uniqueSubs.forEach((sub, index) => {
                console.log(`\nSubscription ${index + 1}:`);
                console.log('  ID:', sub._id);
                console.log('  Email:', sub.Customer_email);
                console.log('  QuotePaymentId:', sub.quotepaymentId);
                console.log('  Status:', sub.subscription_status);
                console.log('  Amount:', sub.amount);
                console.log('  AFS Registration ID:', sub.afs_registration_id);
                console.log('  AFS Checkout ID:', sub.afs_checkout_id);
                console.log('  Last Payment Date:', sub.last_payment_date);
                console.log('  Created Date:', sub.created_date);
                console.log('  Next Billing Date:', sub.next_billing_date);
            });
        } else {
            console.log('\n❌ NO SUBSCRIPTIONS FOUND AT ALL');
            console.log('This means:');
            console.log('1. User has no subscriptions (new customer)');
            console.log('2. Subscriptions are stored with different email/ID format');
            console.log('3. Subscriptions are in a different collection');
        }
        
        // 5. Check if there are any subscriptions at all
        console.log('\n🔍 Search 4: Total subscriptions in database');
        const totalSubs = await VzatRecurringData.countDocuments();
        console.log(`Total subscriptions in database: ${totalSubs}`);
        
        if (totalSubs > 0) {
            console.log('\n📋 Sample subscription fields:');
            const sampleSub = await VzatRecurringData.findOne();
            console.log('Sample subscription structure:', Object.keys(sampleSub.toObject()));
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

findAllUserSubscriptions();
