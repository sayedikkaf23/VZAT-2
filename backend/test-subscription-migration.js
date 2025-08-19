import mongoose from 'mongoose';
import VzatRecurringData from './model/VzatRecurringDataModel.js';
import CustomerLogin from './model/CustomerLoginModel.js';
import { connectDB } from './config/db.js';

// Import the migration function from the controller
import { migrateSubscriptionTokens } from './Controllers/AddCardController.js';

async function testSubscriptionMigration() {
    try {
        console.log('🧪 Testing Subscription Migration...');
        
        await connectDB();
        console.log('✅ Database connected');
        
        const testEmail = 'sayed1223@yeepeey.com';
        const testRegistrationId = 'test_registration_' + Date.now();
        const testCheckoutId = 'test_checkout_' + Date.now();
        
        console.log(`\n🔄 Testing migration for: ${testEmail}`);
        console.log(`🔑 New registration ID: ${testRegistrationId}`);
        console.log(`🔑 New checkout ID: ${testCheckoutId}`);
        
        // Test the migration function directly
        const result = await migrateSubscriptionTokens(testEmail, testRegistrationId, testCheckoutId);
        
        console.log('\n✅ Migration function completed');
        console.log('📋 Result:', result);
        
        // Verify the subscription was actually updated
        const customer = await CustomerLogin.findOne({ email: testEmail });
        if (customer && customer.quotepaymentId) {
            const updatedSub = await VzatRecurringData.findOne({ quotepaymentId: customer.quotepaymentId });
            
            if (updatedSub) {
                console.log('\n📋 Updated subscription details:');
                console.log('  AFS Registration ID:', updatedSub.afs_registration_id);
                console.log('  AFS Checkout ID:', updatedSub.afs_checkout_id);
                console.log('  Previous Registration ID:', updatedSub.previous_registration_id);
                console.log('  Card Migration Date:', updatedSub.card_migration_date);
                
                if (updatedSub.afs_registration_id ***REMOVED***= testRegistrationId) {
                    console.log('✅ SUCCESS: Subscription tokens updated correctly!');
                } else {
                    console.log('❌ FAILED: Subscription tokens not updated');
                }
            } else {
                console.log('❌ Could not find updated subscription');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testSubscriptionMigration();
