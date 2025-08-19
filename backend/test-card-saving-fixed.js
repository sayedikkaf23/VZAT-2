import mongoose from 'mongoose';
import SavedCard from './model/SavedCardModel.js';
import CustomerLogin from './model/CustomerLoginModel.js';
import { connectDB } from './config/db.js';

async function testCardSavingWithCorrectFields() {
    try {
        console.log('🔍 Testing Card Saving with Correct Fields...');
        
        // Connect to database
        await connectDB();
        console.log('✅ Database connected');
        
        // First, let's create a test customer if one doesn't exist
        const testEmail = 'test@example.com';
        let customer = await CustomerLogin.findOne({ email: testEmail });
        
        if (!customer) {
            console.log('👤 Creating test customer...');
            customer = new CustomerLogin({
                email: testEmail,
                password: 'test123', // Just for testing
                quotepaymentId: 'test_payment_' + Date.now(),
                customerName: 'Test Customer'
            });
            await customer.save();
            console.log('✅ Test customer created:', customer._id);
        } else {
            console.log('✅ Test customer found:', customer._id);
        }
        
        // Test card data with all required fields
        const testCardData = {
            customerEmail: testEmail,
            customerId: customer._id,
            quotepaymentId: customer.quotepaymentId || 'test_payment_123',
            afs_registration_id: 'test_reg_' + Date.now(),
            afs_checkout_id: 'test_checkout_' + Date.now(),
            cardholderName: 'John Doe',
            maskedCardNumber: '**** **** **** 1234',
            cardBrand: 'VISA',
            expiryMonth: '12',
            expiryYear: '25',
            isDefault: true,
            isActive: true,
            cardAddedDate: new Date()
        };
        
        console.log('📝 Attempting to save card with correct fields:', JSON.stringify(testCardData, null, 2));
        
        // Create and save card
        const savedCard = new SavedCard(testCardData);
        const result = await savedCard.save();
        
        console.log('✅ Card saved successfully!');
        console.log('📋 Saved card details:', JSON.stringify(result.toObject(), null, 2));
        
        // Verify it exists in database
        const foundCard = await SavedCard.findById(result._id);
        console.log('🔍 Found card in database:', foundCard ? 'YES' : 'NO');
        
        // Clean up - remove test card and customer
        await SavedCard.deleteOne({ _id: result._id });
        await CustomerLogin.deleteOne({ _id: customer._id });
        console.log('🧹 Test data cleaned up');
        
        console.log('✅ Card saving test completed successfully');
        
    } catch (error) {
        console.error('❌ Card saving test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCardSavingWithCorrectFields();
