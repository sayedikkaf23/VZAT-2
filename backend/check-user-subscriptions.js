import mongoose from 'mongoose';
import VzatRecurringData from './model/VzatRecurringDataModel.js';
import SavedCard from './model/SavedCardModel.js';
import CustomerLogin from './model/CustomerLoginModel.js';
import { connectDB } from './config/db.js';

async function checkUserSubscriptions() {
    try {
        console.log('🔍 Checking User Subscriptions and Cards...');
        
        // Connect to database
        await connectDB();
        console.log('✅ Database connected');
        
        const testEmail = 'sayed1223@yeepeey.com'; // Your email from the error
        
        console.log(`\n👤 Checking data for user: ${testEmail}`);
        
        // 1. Check if customer exists
        const customer = await CustomerLogin.findOne({ email: testEmail });
        console.log('\n📋 Customer Data:');
        if (customer) {
            console.log('✅ Customer found:', {
                id: customer._id,
                email: customer.email,
                quotepaymentId: customer.quotepaymentId,
                customerName: customer.customerName
            });
        } else {
            console.log('❌ Customer NOT found');
        }
        
        // 2. Check existing saved cards
        const savedCards = await SavedCard.find({ customerEmail: testEmail });
        console.log('\n💳 Existing Saved Cards:');
        if (savedCards.length > 0) {
            savedCards.forEach((card, index) => {
                console.log(`Card ${index + 1}:`, {
                    id: card._id,
                    maskedNumber: card.maskedCardNumber,
                    brand: card.cardBrand,
                    isDefault: card.isDefault,
                    isActive: card.isActive,
                    afsRegistrationId: card.afs_registration_id
                });
            });
        } else {
            console.log('❌ No saved cards found');
        }
        
        // 3. Check existing subscriptions
        const subscriptions = await VzatRecurringData.find({ 
            Customer_email: testEmail,
            subscription_status: { $in: ['active', 'pending'] }
        });
        
        console.log('\n📅 Active Subscriptions:');
        if (subscriptions.length > 0) {
            subscriptions.forEach((sub, index) => {
                console.log(`Subscription ${index + 1}:`, {
                    id: sub._id,
                    quotepaymentId: sub.quotepaymentId,
                    status: sub.subscription_status,
                    currentAfsRegistrationId: sub.afs_registration_id,
                    currentAfsCheckoutId: sub.afs_checkout_id,
                    amount: sub.amount,
                    lastPaymentDate: sub.last_payment_date
                });
            });
        } else {
            console.log('❌ No active subscriptions found');
        }
        
        // 4. Summary and recommendations
        console.log('\n📊 Summary:');
        console.log(`Customer exists: ${customer ? 'YES' : 'NO'}`);
        console.log(`Saved cards: ${savedCards.length}`);
        console.log(`Active subscriptions: ${subscriptions.length}`);
        
        if (!customer) {
            console.log('\n⚠️ ISSUE FOUND: Customer does not exist in CustomerLogin collection');
            console.log('   This could be why card registration is failing');
        }
        
        if (subscriptions.length === 0) {
            console.log('\n⚠️ ISSUE FOUND: No active subscriptions found');
            console.log('   User needs active subscriptions for card change flow');
        }
        
        if (subscriptions.length > 0 && !subscriptions[0].afs_registration_id) {
            console.log('\n⚠️ ISSUE FOUND: Existing subscriptions have no AFS registration ID');
            console.log('   This might indicate old payment method format');
        }
        
    } catch (error) {
        console.error('❌ Error checking user data:', error);
    } finally {
        process.exit(0);
    }
}

checkUserSubscriptions();
