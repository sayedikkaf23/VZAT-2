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
    
    // Card Display Information (Masked/Safe)
    cardholderName: {
        type: String,
        required: true
    },
    maskedCardNumber: {
        type: String,
        required: true // e.g., "**** **** **** 1234"
    },
    cardBrand: {
        type: String,
        required: true, // VISA, MASTERCARD, AMEX, etc.
        enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER']
    },
    expiryMonth: {
        type: String,
        required: true,
        length: 2 // "01", "12", etc.
    },
    expiryYear: {
        type: String,
        required: true,
        length: 2 // "25", "26", etc.
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
    
    // Security - Never store actual card details
    // Only store tokenized references and display info
});

// Indexes for performance
savedCardSchema.index({ customerId: 1 });
savedCardSchema.index({ customerEmail: 1 });
savedCardSchema.index({ afs_registration_id: 1 });

const SavedCard = mongoose.model('SavedCard', savedCardSchema);

export default SavedCard;
