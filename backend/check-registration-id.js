import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkAndFixRegistrationId() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const SavedCard = mongoose.model('SavedCard', new mongoose.Schema({}, { strict: false }));
    
    const quotepaymentId = 'aAWdu0000007CIzGAM';
    
    console.log('🔍 Finding saved card for subscription...');
    const savedCard = await SavedCard.findOne({ quotepaymentId });
    
    if (!savedCard) {
      throw new Error(`Saved card not found for quotepaymentId: ${quotepaymentId}`);
    }
    
    console.log('✅ Found saved card:');
    console.log(`  - Card ID: ${savedCard._id}`);
    console.log(`  - Customer Email: ${savedCard.customerEmail}`);
    console.log(`  - Card: ${savedCard.maskedCardNumber} (${savedCard.cardBrand})`);
    console.log(`  - Cardholder: ${savedCard.cardholderName}`);
    console.log(`  - Current AFS Registration ID: ${savedCard.afs_registration_id}`);
    console.log(`  - AFS Checkout ID: ${savedCard.afs_checkout_id}`);
    
    // The issue is likely that afs_registration_id is the same as the payment transaction ID
    // We need to find the actual card registration ID from the AFS response
    
    console.log('\n🔍 Checking if registration ID is valid...');
    
    // Try to make a test call to AFS to see if the registration ID is valid
    const axios = (await import('axios')).default;
    
    try {
      const testUrl = `${process.env.AFS_DOMAIN}/v1/registrations/${savedCard.afs_registration_id}`;
      const testResponse = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AFS_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        },
        params: {
          entityId: process.env.AFS_ENTITY_ID
        }
      });
      
      console.log('✅ Registration ID is valid!');
      console.log('📋 Registration details:', JSON.stringify(testResponse.data, null, 2));
      
    } catch (afsError) {
      console.log('❌ Registration ID is invalid or expired');
      console.log('📋 AFS Error:', afsError.response?.data || afsError.message);
      
      if (afsError.response?.data?.result?.code === '100.150.204') {
        console.log('\n🔧 ISSUE IDENTIFIED: Registration ID is invalid');
        console.log('💡 SOLUTION: We need to use the correct registration ID from the card registration');
        
        // The registration ID should be from the card registration, not the payment
        // Let's check if we have the correct registration ID in the subscription record
        const Vzat_Recurring_Data = mongoose.model('Vzat_Recurring_Data', new mongoose.Schema({}, { strict: false }));
        const subscription = await Vzat_Recurring_Data.findOne({ quotepaymentId });
        
        if (subscription && subscription.afs_registration_id) {
          console.log(`\n📋 Subscription AFS Registration ID: ${subscription.afs_registration_id}`);
          
          // Try the subscription's registration ID
          try {
            const testUrl2 = `${process.env.AFS_DOMAIN}/v1/registrations/${subscription.afs_registration_id}`;
            const testResponse2 = await axios.get(testUrl2, {
              headers: {
                'Authorization': `Bearer ${process.env.AFS_ACCESS_TOKEN}`,
                'Accept': 'application/json'
              },
              params: {
                entityId: process.env.AFS_ENTITY_ID
              }
            });
            
            console.log('✅ Subscription registration ID is valid!');
            console.log('📋 Registration details:', JSON.stringify(testResponse2.data, null, 2));
            
            // Update the saved card with the correct registration ID
            console.log('\n🔄 Updating saved card with correct registration ID...');
            await SavedCard.findByIdAndUpdate(savedCard._id, {
              afs_registration_id: subscription.afs_registration_id
            });
            
            console.log('✅ Saved card updated with correct registration ID');
            console.log(`✅ New registration ID: ${subscription.afs_registration_id}`);
            
          } catch (afsError2) {
            console.log('❌ Subscription registration ID is also invalid');
            console.log('📋 AFS Error:', afsError2.response?.data || afsError2.message);
            
            console.log('\n💡 RECOMMENDATION:');
            console.log('1. Check the AFS dashboard for valid registration IDs');
            console.log('2. Or re-register the card to get a new valid registration ID');
            console.log('3. The current registration ID might be from a payment transaction, not card registration');
          }
        }
      }
    }
    
    console.log('\n🎉 =============== REGISTRATION ID CHECK COMPLETE ===============');
    
  } catch (error) {
    console.error('❌ Error checking registration ID:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkAndFixRegistrationId();
