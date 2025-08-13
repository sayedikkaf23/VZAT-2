/**
 * AFS Card Data Testing Script
 * 
 * This script helps test and debug AFS card data extraction
 */

// Test the current card extraction logic
function testCardExtraction(afsData, paymentData) {
    console.log('\n🧪 TESTING CARD EXTRACTION LOGIC');
    console.log('='.repeat(50));
    
    let last4Digits = null;
    let cardBrand = 'OTHER';
    
    // Test AFS result parsing
    if (afsData) {
        console.log('📦 AFS Data received:', JSON.stringify(afsData, null, 2));
        
        const cardSources = [
            afsData.card,
            afsData.registrationResult,
            afsData.payment,
            afsData.paymentMethod,
            afsData.source,
            afsData.registrations?.[0],
            afsData.data,
            afsData.response,
            afsData.cardData,
            afsData.paymentData,
            afsData
        ];
        
        for (const cardSource of cardSources) {
            if (cardSource) {
                console.log(`🔍 Checking card source:`, Object.keys(cardSource));
                
                const last4Fields = [
                    'last4', 'lastFour', 'last_4', 'last_four',
                    'maskedPan', 'masked_pan', 'pan',
                    'number', 'cardNumber', 'card_number', 'cardNo',
                    'maskedCardNumber', 'masked_card_number',
                    'displayNumber', 'display_number',
                    'cardMask', 'card_mask', 'mask'
                ];
                
                for (const field of last4Fields) {
                    let fieldValue = cardSource[field];
                    if (fieldValue) {
                        console.log(`💳 Found field ${field}:`, fieldValue);
                        
                        if (typeof fieldValue === 'string') {
                            const cleanValue = fieldValue.replace(/\D/g, '');
                            if (cleanValue.length >= 4) {
                                last4Digits = cleanValue.slice(-4);
                                console.log(`✅ Extracted last4 from ${field}: ${last4Digits}`);
                                break;
                            }
                        }
                    }
                }
                
                if (last4Digits) break;
            }
        }
    }
    
    // Test payment data parsing if AFS didn't provide it
    if (!last4Digits && paymentData) {
        console.log('\n📦 Payment Data received:', JSON.stringify(paymentData, null, 2));
        
        // Search all fields for potential card numbers
        for (const [key, value] of Object.entries(paymentData)) {
            if (value && typeof value === 'string') {
                const cleanValue = value.replace(/\D/g, '');
                if (cleanValue.length >= 13 && cleanValue.length <= 19) {
                    last4Digits = cleanValue.slice(-4);
                    console.log(`✅ Found card number in ${key}: ${last4Digits}`);
                    break;
                }
            }
        }
    }
    
    return last4Digits;
}

// Example test cases
const testCases = [
    {
        name: 'Test Case 1: AFS with direct card object',
        afsData: {
            card: {
                last4: '1111',
                brand: 'visa'
            }
        },
        expected: '1111'
    },
    {
        name: 'Test Case 2: AFS with masked PAN',
        afsData: {
            registrationResult: {
                maskedPan: '**** **** **** 1111',
                cardBrand: 'VISA'
            }
        },
        expected: '1111'
    },
    {
        name: 'Test Case 3: Payment data with full card number',
        paymentData: {
            afs_card_no: '4111111111111111',
            customer_email: 'test@example.com'
        },
        expected: '1111'
    },
    {
        name: 'Test Case 4: Payment data with different field name',
        paymentData: {
            cardNumber: '4111111111111111',
            customerName: 'Test User'
        },
        expected: '1111'
    }
];

// Run tests
console.log('🚀 Running AFS Card Extraction Tests\n');

testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log('-'.repeat(40));
    
    const result = testCardExtraction(testCase.afsData, testCase.paymentData);
    
    if (result === testCase.expected) {
        console.log(`✅ PASS: Got ${result} (expected ${testCase.expected})`);
    } else {
        console.log(`❌ FAIL: Got ${result} (expected ${testCase.expected})`);
    }
});

console.log('\n🏁 Tests completed!');
console.log('\n📋 Instructions for real testing:');
console.log('1. Make a payment with card ending in 1111');
console.log('2. Check the server logs for "💳 DEBUG - Full AFS result structure"');
console.log('3. Or call POST /api/afs-debug/debug-afs-data to capture the exact data');
console.log('4. Use that data to identify the correct field names for your AFS integration');

export { testCardExtraction };
