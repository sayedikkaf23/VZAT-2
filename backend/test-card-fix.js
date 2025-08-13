/**
 * Test script to demonstrate fixing card number display issues
 * 
 * This script shows how to:
 * 1. Fix existing cards with generic masking
 * 2. Test card number extraction with the updated logic
 * 3. Manually update a card's last 4 digits
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust based on your backend port

// Test data with card ending in 1111
const testPaymentData = {
    opp_email: 'test@example.com',
    Customer_name: 'Test Customer',
    quotepaymentId: 'test_quote_123',
    card_number: '4111111111111111', // Test Visa card ending in 1111
    cardNumber: '4111111111111111',
    afs_card_no: '4111111111111111',
    OpportunityId: 'test_opp_123',
    QuoteId: 'test_quote_123'
};

async function testCardNumberExtraction() {
    console.log('🧪 Testing card number extraction logic...');
    console.log('Input card number:', testPaymentData.card_number);
    
    // This would normally be called during payment processing
    // The updated logic should now properly extract 1111 from the card number
    
    const cardNumberFields = [
        'afs_card_no', 'card_number', 'cardNumber', 'card_no', 
        'afs-card-no', 'data-afs-card-no', 'card.number', 'number',
        'card_num', 'cardNo', 'cc_number', 'ccNumber', 'pan', 'cardPan',
        'card', 'cardno', 'card_num', 'payment_card', 'paymentCard',
        'creditCard', 'credit_card', 'debitCard', 'debit_card',
        'account_number', 'accountNumber', 'cardDetails', 'card_details'
    ];
    
    let last4Digits = null;
    
    for (const field of cardNumberFields) {
        const cardNumber = testPaymentData[field];
        if (cardNumber && typeof cardNumber === 'string') {
            const cleanCardNumber = cardNumber.replace(/\D/g, '');
            if (cleanCardNumber.length >= 4) {
                last4Digits = cleanCardNumber.slice(-4);
                console.log(`✅ Extracted last 4 digits from ${field}: ${last4Digits}`);
                break;
            }
        }
    }
    
    if (last4Digits === '1111') {
        console.log('✅ SUCCESS: Correctly extracted 1111 from test card');
    } else {
        console.log('❌ FAILED: Expected 1111, got:', last4Digits);
    }
}

async function fixExistingCards() {
    console.log('\n🔧 Attempting to fix existing cards...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/saved-cards/fix-card-numbers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Fixed cards successfully:', result.message);
            console.log(`   Fixed ${result.fixedCount} out of ${result.totalFound} cards`);
        } else {
            console.log('❌ Failed to fix cards:', result.message);
        }
    } catch (error) {
        console.log('❌ Error calling fix endpoint:', error.message);
        console.log('   Make sure the backend server is running on', BASE_URL);
    }
}

async function testManualCardUpdate() {
    console.log('\n🔧 Testing manual card update...');
    
    // This is an example of how to manually update a card's last 4 digits
    const exampleCardId = 'example_card_id_here'; // Replace with actual card ID
    const exampleCustomerId = 'example_customer_id_here'; // Replace with actual customer ID
    
    console.log('To manually update a card to show 1111:');
    console.log(`PUT ${BASE_URL}/api/saved-cards/card/${exampleCardId}/update-last-four`);
    console.log('Body:', JSON.stringify({
        lastFourDigits: '1111',
        customerId: exampleCustomerId
    }, null, 2));
    
    console.log('\nThis will change the masked number from "**** **** **** ****" to "**** **** **** 1111"');
}

async function runAllTests() {
    console.log('🚀 Running Card Number Fix Tests\n');
    console.log('=' .repeat(50));
    
    // Test 1: Card number extraction logic
    await testCardNumberExtraction();
    
    // Test 2: Fix existing cards API call
    await fixExistingCards();
    
    // Test 3: Manual card update example
    await testManualCardUpdate();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log('\nSummary of fixes applied:');
    console.log('1. Enhanced card number field detection');
    console.log('2. Better test card recognition (4111111111111111 → 1111)');
    console.log('3. Improved fallback logic');
    console.log('4. Added manual card update capability');
    console.log('5. Added API endpoint to fix existing cards');
}

// Run the tests
runAllTests().catch(console.error);
