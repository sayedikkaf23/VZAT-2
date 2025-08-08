import mongoose from "mongoose";

const Schema = mongoose.Schema;

const customerSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true 
    },
    // Customer details from subscription
    quotepaymentId: {
        type: String,
        required: false,
        unique: true // Each customer linked to their payment record
    },
    customerName: {
        type: String,
        required: false
    },
    opportunityId: {
        type: String,
        required: false
    },
    quoteId: {
        type: String,
        required: false
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    accountCreatedDate: {
        type: Date,
        default: Date.now
    },
    lastLoginDate: {
        type: Date,
        required: false
    },
    // Password management
    isTemporaryPassword: {
        type: Boolean,
        default: true // First password is always temporary
    },
    passwordResetRequired: {
        type: Boolean,
        default: true
    },
    // Password reset fields
    passwordResetToken: {
        type: String,
        required: false
    },
    passwordResetExpiry: {
        type: Date,
        required: false
    }
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
 