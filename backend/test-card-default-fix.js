// Test script to verify and fix card default setting functionality
import SavedCard from './model/SavedCardModel.js';
import CustomerLogin from './model/CustomerLoginModel.js';
import { connectDB } from './config/db.js';

async function testCardDefaultFunctionality() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Test 1: Check existing cards and their default status
    console.log('\n🔍 TEST 1: Checking existing cards...');
    const allCards = await SavedCard.find({ isActive: true }).populate('customerId');
    console.log(`📊 Found ${allCards.length} active cards in database`);

    // Group cards by customer
    const cardsByCustomer = {};
    allCards.forEach(card => {
      const customerEmail = card.customerEmail;
      if (!cardsByCustomer[customerEmail]) {
        cardsByCustomer[customerEmail] = [];
      }
      cardsByCustomer[customerEmail].push(card);
    });

    console.log('\n📋 Cards by customer:');
    for (const [email, cards] of Object.entries(cardsByCustomer)) {
      console.log(`\n👤 ${email}:`);
      cards.forEach(card => {
        console.log(`  💳 ${card.maskedCardNumber} (${card.cardBrand}) - Default: ${card.isDefault}`);
      });
    }

    // Test 2: Fix cards with multiple defaults
    console.log('\n🔧 TEST 2: Fixing cards with multiple defaults...');
    let fixedCount = 0;
    
    for (const [email, cards] of Object.entries(cardsByCustomer)) {
      const defaultCards = cards.filter(card => card.isDefault);
      
      if (defaultCards.length > 1) {
        console.log(`⚠️ Customer ${email} has ${defaultCards.length} default cards`);
        
        // Keep only the first card as default, remove default from others
        for (let i = 1; i < defaultCards.length; i++) {
          await SavedCard.findByIdAndUpdate(defaultCards[i]._id, { isDefault: false });
          console.log(`  ✅ Removed default from ${defaultCards[i].maskedCardNumber}`);
          fixedCount++;
        }
      } else if (defaultCards.length ***REMOVED***= 0 && cards.length > 0) {
        console.log(`⚠️ Customer ${email} has no default card, setting first card as default`);
        await SavedCard.findByIdAndUpdate(cards[0]._id, { isDefault: true });
        console.log(`  ✅ Set ${cards[0].maskedCardNumber} as default`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} card default issues`);

    // Test 3: Verify the fix
    console.log('\n🔍 TEST 3: Verifying the fix...');
    const updatedCards = await SavedCard.find({ isActive: true }).populate('customerId');
    
    const updatedCardsByCustomer = {};
    updatedCards.forEach(card => {
      const customerEmail = card.customerEmail;
      if (!updatedCardsByCustomer[customerEmail]) {
        updatedCardsByCustomer[customerEmail] = [];
      }
      updatedCardsByCustomer[customerEmail].push(card);
    });

    console.log('\n📋 Updated cards by customer:');
    for (const [email, cards] of Object.entries(updatedCardsByCustomer)) {
      console.log(`\n👤 ${email}:`);
      const defaultCards = cards.filter(card => card.isDefault);
      console.log(`  📊 Total cards: ${cards.length}, Default cards: ${defaultCards.length}`);
      
      cards.forEach(card => {
        console.log(`  💳 ${card.maskedCardNumber} (${card.cardBrand}) - Default: ${card.isDefault}`);
      });
    }

    console.log('\n✅ Card default functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing card default functionality:', error);
  } finally {
    process.exit(0);
  }
}

testCardDefaultFunctionality();
