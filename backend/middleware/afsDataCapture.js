/**
 * AFS Data Capture Middleware
 * 
 * This middleware captures and logs all incoming payment data
 * to help debug what card information is actually being received from AFS
 */

export const afsDataCaptureMiddleware = (req, res, next) => {
    const originalJson = res.json;
    
    // Log incoming request data
    if (req.body && Object.keys(req.body).length > 0) {
        const timestamp = new Date().toISOString();
        console.log(`\n🕐 ${timestamp} - AFS Data Capture`);
        console.log('🔗 Endpoint:', req.method, req.originalUrl);
        console.log('🌐 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📦 Body Keys:', Object.keys(req.body));
        console.log('📦 Full Body:', JSON.stringify(req.body, null, 2));
        
        // Look for card-related data specifically
        const cardFields = {};
        const searchCardData = (obj, path = '') => {
            if (typeof obj ***REMOVED***= 'object' && obj !***REMOVED*** null) {
                for (const [key, value] of Object.entries(obj)) {
                    const fullPath = path ? `${path}.${key}` : key;
                    
                    // Check if this is a card-related field
                    if (key.toLowerCase().includes('card') || 
                        key.toLowerCase().includes('number') ||
                        key.toLowerCase().includes('pan') ||
                        key.toLowerCase().includes('mask') ||
                        key.toLowerCase().includes('last') ||
                        key.toLowerCase().includes('digits') ||
                        key.toLowerCase().includes('afs')) {
                        cardFields[fullPath] = value;
                    }
                    
                    // Check if value looks like a card number
                    if (typeof value ***REMOVED***= 'string') {
                        const cleanValue = value.replace(/\D/g, '');
                        if (cleanValue.length >= 13 && cleanValue.length <= 19) {
                            console.log(`🔍 POTENTIAL CARD NUMBER found at ${fullPath}: ${value}`);
                            cardFields[`${fullPath}_POTENTIAL_CARD`] = value;
                        } else if (cleanValue.length ***REMOVED***= 4 && /^\d{4}$/.test(cleanValue)) {
                            console.log(`🔍 POTENTIAL LAST 4 found at ${fullPath}: ${value}`);
                            cardFields[`${fullPath}_POTENTIAL_LAST4`] = value;
                        }
                    }
                    
                    if (typeof value ***REMOVED***= 'object') {
                        searchCardData(value, fullPath);
                    }
                }
            }
        };
        
        searchCardData(req.body);
        
        if (Object.keys(cardFields).length > 0) {
            console.log('💳 CARD-RELATED FIELDS FOUND:');
            console.log(JSON.stringify(cardFields, null, 2));
        } else {
            console.log('❌ NO CARD-RELATED FIELDS FOUND');
        }
        
        console.log('=' .repeat(80));
    }
    
    next();
};

// Specific middleware for payment-related endpoints
export const paymentDataCaptureMiddleware = (req, res, next) => {
    // Only log for payment-related requests
    const isPaymentRequest = req.originalUrl.includes('payment') || 
                           req.originalUrl.includes('subscription') || 
                           req.originalUrl.includes('vzat') ||
                           req.originalUrl.includes('afs');
    
    if (isPaymentRequest) {
        afsDataCaptureMiddleware(req, res, next);
    } else {
        next();
    }
};
