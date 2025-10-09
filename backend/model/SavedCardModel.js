import mongoose from "mongoose";

const Schema = mongoose.Schema;

const savedCardSchema = new Schema({
    // Link to customer
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    quotepaymentId: {
        type: String,
        required: true
    },
    
    // AFS Payment Gateway Details
    afs_registration_id: {
        type: String,
        required: true,
        unique: true // Each registration ID is unique
    },
    afs_checkout_id: {
        type: String,
        required: false
    },
    
    // Card Information (Full Details)
    cardholderName: {
        type: String,
        required: true
    },
    cardNumber: {
        type: String,
        required: false, // Full card number - optional since AFS doesn't provide it
        default: '' // Default to empty string if not provided
    },
    maskedCardNumber: {
        type: String,
        required: true // e.g., "**** **** **** 1234" - for display purposes
    },
    cardBrand: {
        type: String,
        required: true, // VISA, MASTERCARD, AMEX, etc.
        enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'JCB', 'DINERS', 'OTHER']
    },
    expiryMonth: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(0[1-9]|1[0-2])$/.test(v); // 01-12
            },
            message: 'Expiry month must be 01-12'
        }
    },
    expiryYear: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{2}$/.test(v); // 2 digits (e.g., 29 for 2029)
            },
            message: 'Expiry year must be 2 digits'
        }
    },
    
    // Card Status
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false // One card can be marked as default per customer
    },
    
    // Metadata
    cardAddedDate: {
        type: Date,
        default: Date.now
    },
    lastUsedDate: {
        type: Date,
        required: false
    },
    
    // Card deactivation tracking
    deactivated_date: {
        type: Date,
        required: false
    },
    deactivation_reason: {
        type: String,
        required: false
    },
    
    // Security - Store full card details for processing
    // Masked version is kept for display purposes
});

// Indexes for performance
savedCardSchema.index({ customerId: 1 });
savedCardSchema.index({ customerEmail: 1 });
// Note: afs_registration_id already has unique: true, so no need for separate index
// Prevent saving the same physical card multiple times for the same customer
savedCardSchema.index(
    { customerId: 1, maskedCardNumber: 1 },
    { unique: true }
);

const SavedCard = mongoose.model('SavedCard', savedCardSchema);

export default SavedCard;
