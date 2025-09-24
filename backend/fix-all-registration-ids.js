import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function fixAllRegistrationIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const SavedCard = mongoose.model('SavedCard', new mongoose.Schema({}, { strict: false }));
    
    console.log('🔍 Finding all saved cards...');
    const savedCards = await SavedCard.find({});
    
    console.log(`📊 Found ${savedCards.length} saved cards to check`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const card of savedCards) {
      try {
        console.log(`\n🔍 Checking card ${card._id}...`);
        console.log(`   - Customer: ${card.customerEmail}`);
        console.log(`   - Card: ${card.maskedCardNumber} (${card.cardBrand})`);
        console.log(`   - Current Registration ID: ${card.afs_registration_id}`);
        
        // Test if the current registration ID is valid
        try {
          const testUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${card.afs_registration_id}`;
          const testResponse = await axios.get(testUrl, {
            headers: {
              'Authorization': `Bearer ${process.env.AFS_ACCESS_TOKEN}`,
              'Accept': 'application/json'
            },
            params: {
              entityId: process.env.AFS_ENTITY_ID
            }
          });
          
          // Check if this is a card registration or payment transaction
          const responseData = testResponse.data;
          
          if (responseData.registrationId && responseData.registrationId !== responseData.id) {
            // This is a payment transaction, we need the registrationId
            console.log(`   ✅ Found correct registration ID: ${responseData.registrationId}`);
            
            // Update the card with the correct registration ID
            await SavedCard.findByIdAndUpdate(card._id, {
              afs_registration_id: responseData.registrationId
            });
            
            console.log(`   🔄 Updated registration ID from ${card.afs_registration_id} to ${responseData.registrationId}`);
            fixedCount++;
            
          } else {
            console.log(`   ✅ Registration ID is already correct`);
          }
          
        } catch (afsError) {
          if (afsError.response?.data?.result?.code === '100.150.204') {
            console.log(`   ❌ Registration ID is invalid: ${afsError.response.data.result.description}`);
            errorCount++;
          } else {
            console.log(`   ⚠️ AFS Error: ${afsError.response?.data || afsError.message}`);
            errorCount++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing card: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n🎉 =============== REGISTRATION ID FIX COMPLETE ===============');
    console.log(`📊 SUMMARY:`);
    console.log(`   - Total cards checked: ${savedCards.length}`);
    console.log(`   - Cards fixed: ${fixedCount}`);
    console.log(`   - Cards with errors: ${errorCount}`);
    console.log(`   - Cards already correct: ${savedCards.length - fixedCount - errorCount}`);
    
    if (fixedCount > 0) {
      console.log(`\n✅ ${fixedCount} cards have been updated with correct registration IDs`);
      console.log('✅ Recurring payments should now work properly');
    }
    
  } catch (error) {
    console.error('❌ Error fixing registration IDs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixAllRegistrationIds();
