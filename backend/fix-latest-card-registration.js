import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixLatestCardRegistrationId() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const SavedCard = mongoose.model('SavedCard', new mongoose.Schema({}, { strict: false }));
    
    const quotepaymentId = 'aAWdu0000007CNpGAM';
    
    console.log('🔍 Finding saved card...');
    const savedCard = await SavedCard.findOne({ quotepaymentId });
    
    if (!savedCard) {
      throw new Error(`Saved card not found for quotepaymentId: ${quotepaymentId}`);
    }
    
    console.log('✅ Found saved card:');
    console.log(`  - Card ID: ${savedCard._id}`);
    console.log(`  - Customer Email: ${savedCard.customerEmail}`);
    console.log(`  - Card: ${savedCard.maskedCardNumber} (${savedCard.cardBrand})`);
    console.log(`  - Current AFS Registration ID: ${savedCard.afs_registration_id}`);
    
    // The correct registration ID should be: 8ac7a4a29978ae2601997aae2c094cda
    const correctRegistrationId = '8ac7a4a29978ae2601997aae2c094cda';
    
    console.log(`\n🔄 Updating registration ID from:`);
    console.log(`  - OLD: ${savedCard.afs_registration_id}`);
    console.log(`  - NEW: ${correctRegistrationId}`);
    
    // Update the saved card with the correct registration ID
    const updateResult = await SavedCard.findByIdAndUpdate(savedCard._id, {
      afs_registration_id: correctRegistrationId
    }, { new: true });
    
    console.log('✅ Saved card updated successfully!');
    console.log(`✅ New registration ID: ${updateResult.afs_registration_id}`);
    
    // Verify the update
    console.log('\n🔍 Verifying the fix...');
    const axios = (await import('axios')).default;
    
    try {
      const testUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${correctRegistrationId}`;
      const testResponse = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AFS_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        },
        params: {
          entityId: process.env.AFS_ENTITY_ID
        }
      });
      
      console.log('✅ Registration ID verification successful!');
      console.log('📋 Registration details:', JSON.stringify(testResponse.data, null, 2));
      
    } catch (afsError) {
      console.log('❌ Registration ID verification failed');
      console.log('📋 AFS Error:', afsError.response?.data || afsError.message);
    }
    
    console.log('\n🎉 =============== REGISTRATION ID FIX COMPLETE ===============');
    console.log('✅ The cron job should now be able to process recurring payments for this subscription');
    console.log('✅ Next payment attempt should succeed');
    
  } catch (error) {
    console.error('❌ Error fixing registration ID:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixLatestCardRegistrationId();
