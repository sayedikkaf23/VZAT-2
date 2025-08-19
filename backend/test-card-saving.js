import mongoose from 'mongoose';
import SavedCard from './model/SavedCardModel.js';
import { connectDB } from './config/db.js';

async function testCardSaving() {
    try {
        console.log('🔍 Testing Card Saving Process...');
        
        // Connect to database
        await connectDB();
        console.log('✅ Database connected');
        
        // Test card data (similar to what would come from AFS)
        const testCardData = {
            customerEmail: 'test@example.com',
            cardNumber: '**** **** **** 1234',
            expiryDate: '12/25',
            cardHolderName: 'John Doe',
            afsToken: 'test_token_' + Date.now(),
            isDefault: true,
            createdDate: new Date()
        };
        
        console.log('📝 Attempting to save test card:', JSON.stringify(testCardData, null, 2));
        
        // Create and save card
        const savedCard = new SavedCard(testCardData);
        const result = await savedCard.save();
        
        console.log('✅ Card saved successfully:', JSON.stringify(result, null, 2));
        
        // Verify it exists in database
        const foundCard = await SavedCard.findById(result._id);
        console.log('🔍 Found card in database:', foundCard ? 'YES' : 'NO');
        
        // Clean up - remove test card
        await SavedCard.deleteOne({ _id: result._id });
        console.log('🧹 Test card cleaned up');
        
        console.log('✅ Card saving test completed successfully');
        
    } catch (error) {
        console.error('❌ Card saving test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

testCardSaving();
