/**
 * AFS Card Data Debugging Endpoint
 * 
 * This endpoint helps debug what card data is actually being received from AFS
 */

import express from 'express';

const router = express.Router();

// Debugging endpoint to capture and log AFS payment data
router.post('/debug-afs-data', (req, res) => {
    console.log('\n🔍 AFS DEBUG ENDPOINT CALLED');
    console.log('='.repeat(60));
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌐 Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Request Body Keys:', Object.keys(req.body));
    console.log('📦 Full Request Body:', JSON.stringify(req.body, null, 2));
    
    // Look for card-related fields specifically
    const cardRelatedFields = {};
    for (const [key, value] of Object.entries(req.body)) {
        if (key.toLowerCase().includes('card') || 
            key.toLowerCase().includes('number') ||
            key.toLowerCase().includes('pan') ||
            key.toLowerCase().includes('mask') ||
            key.toLowerCase().includes('last') ||
            key.toLowerCase().includes('digits') ||
            key.toLowerCase().includes('afs')) {
            cardRelatedFields[key] = value;
        }
    }
    
    console.log('💳 Card-related fields found:', JSON.stringify(cardRelatedFields, null, 2));
    
    // Look for nested objects that might contain card data
    const checkForCardData = (obj, path = '') => {
        if (typeof obj ***REMOVED***= 'object' && obj !***REMOVED*** null) {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value ***REMOVED***= 'object') {
                    checkForCardData(value, currentPath);
                } else if (typeof value ***REMOVED***= 'string' && value.length > 0) {
                    // Check if this looks like a card number
                    const cleanValue = value.replace(/\D/g, '');
                    if (cleanValue.length >= 13 && cleanValue.length <= 19) {
                        console.log(`🔍 Potential card number found at ${currentPath}: ${value} (clean: ${cleanValue})`);
                    } else if (cleanValue.length ***REMOVED***= 4 && /^\d{4}$/.test(cleanValue)) {
                        console.log(`🔍 Potential last 4 digits found at ${currentPath}: ${value}`);
                    }
                }
            }
        }
    };
    
    console.log('🔍 Searching for nested card data...');
    checkForCardData(req.body);
    
    console.log('='.repeat(60));
    
    res.json({
        success: true,
        message: 'AFS data logged for debugging',
        timestamp: new Date().toISOString(),
        fieldsReceived: Object.keys(req.body),
        cardRelatedFields: Object.keys(cardRelatedFields)
    });
});

// Endpoint to test with sample AFS data
router.post('/test-afs-formats', (req, res) => {
    console.log('\n🧪 TESTING AFS DATA FORMATS');
    console.log('='.repeat(60));
    
    // Test different possible AFS response formats
    const testFormats = [
        {
            name: 'Format 1: Direct card object',
            data: {
                card: {
                    last4: '1111',
                    brand: 'visa',
                    expiryMonth: '12',
                    expiryYear: '25'
                }
            }
        },
        {
            name: 'Format 2: Registration result',
            data: {
                registrationResult: {
                    maskedPan: '**** **** **** 1111',
                    cardBrand: 'VISA'
                }
            }
        },
        {
            name: 'Format 3: Payment method',
            data: {
                paymentMethod: {
                    cardNumber: '4111111111111111',
                    type: 'credit_card'
                }
            }
        },
        {
            name: 'Format 4: Direct fields',
            data: {
                afs_card_no: '4111111111111111',
                card_brand: 'visa',
                afs_registration_id: 'reg_123'
            }
        }
    ];
    
    testFormats.forEach((format, index) => {
        console.log(`\n${index + 1}. ${format.name}:`);
        console.log(JSON.stringify(format.data, null, 2));
    });
    
    console.log('='.repeat(60));
    
    res.json({
        success: true,
        message: 'Test formats logged',
        formats: testFormats.map(f => f.name)
    });
});

export default router;
