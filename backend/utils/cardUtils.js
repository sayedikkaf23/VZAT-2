/**
 * Utility function to reconstruct full card number from BIN and last4Digits
 * @param {string} bin - Bank Identification Number (first 6 digits)
 * @param {string} last4Digits - Last 4 digits of the card
 * @param {string} cardBrand - Card brand (VISA, MASTERCARD, AMEX, etc.)
 * @returns {string} - Reconstructed card number with placeholder middle digits
 */
export function reconstructCardNumber(bin, last4Digits, cardBrand = 'VISA') {
    if (!bin || !last4Digits) {
        return '';
    }
    
    const binStr = bin.toString();
    const last4Str = last4Digits.toString();
    
    // Determine card length based on brand
    let cardLength = 16; // Default for most cards
    if (cardBrand ***REMOVED***= 'AMEX') {
        cardLength = 15;
    } else if (cardBrand ***REMOVED***= 'DINERS') {
        cardLength = 14;
    }
    
    // Calculate how many middle digits we need
    const middleDigitsNeeded = cardLength - binStr.length - last4Str.length;
    
    if (middleDigitsNeeded > 0) {
        // Generate middle digits (we'll use zeros as placeholder since we don't have the actual digits)
        const middleDigits = '0'.repeat(middleDigitsNeeded);
        return binStr + middleDigits + last4Str;
    } else {
        // If BIN + last4 already equals card length, return them concatenated
        return binStr + last4Str;
    }
}

/**
 * Utility function to extract card details from AFS response
 * @param {Object} afsResponse - AFS payment response
 * @returns {Object} - Extracted card details
 */
export function extractCardDetailsFromAFS(afsResponse) {
    const cardDetails = {
        fullCardNumber: '',
        maskedCardNumber: '**** **** **** ****',
        cardBrand: 'UNKNOWN',
        expiryMonth: '**',
        expiryYear: '**',
        cardholderName: 'Card Holder',
        last4Digits: null
    };
    
    if (afsResponse && afsResponse.card) {
        const card = afsResponse.card;
        
        // Extract basic details
        cardDetails.cardBrand = card.brand || afsResponse.paymentBrand || 'UNKNOWN';
        cardDetails.expiryMonth = card.expiryMonth || '**';
        cardDetails.expiryYear = card.expiryYear || '**';
        cardDetails.cardholderName = card.holder || card.cardHolder || card.cardholderName || card.name || card.cardholder || 'Card Holder';
        
        // Extract last 4 digits
        if (card.last4Digits) {
            cardDetails.last4Digits = card.last4Digits;
            cardDetails.maskedCardNumber = `**** **** **** ${card.last4Digits}`;
        } else if (card.last4) {
            cardDetails.last4Digits = card.last4;
            cardDetails.maskedCardNumber = `**** **** **** ${card.last4}`;
        }
        
        // Reconstruct full card number from BIN + last4Digits
        if (card.bin && cardDetails.last4Digits) {
            cardDetails.fullCardNumber = reconstructCardNumber(
                card.bin, 
                cardDetails.last4Digits, 
                cardDetails.cardBrand
            );
        }
        
        // Handle expiry year format (convert 4-digit to 2-digit)
        if (cardDetails.expiryYear && cardDetails.expiryYear.length ***REMOVED***= 4) {
            cardDetails.expiryYear = cardDetails.expiryYear.slice(-2);
        }
    }
    
    return cardDetails;
}
