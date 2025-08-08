import bcrypt from "bcrypt";
import Customer from "../model/CustomerLoginModel.js";
import { sendCustomerWelcomeEmail, sendExistingCustomerEmail, sendPasswordResetEmail } from "../services/emailService.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { addSavedCard } from "./SavedCardController.js";

/**
 * Generate a temporary password for new customer accounts
 */
function generateTemporaryPassword() {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    // Ensure at least one character from each required category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining 4 characters randomly
    const allChars = lowercase + uppercase + numbers + special;
    for (let i = 0; i < 4; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Create a customer account after first successful payment
 */
export const createCustomerAccount = async (subscriptionData) => {
    try {
        console.log('🔄 Creating customer account for first payment...');
        
        // Extract customer details from subscription
        const {
            quotepaymentId,
            opp_email,
            Customer_name,
            OpportunityId,
            QuoteId
        } = subscriptionData;
        
        if (!opp_email) {
            console.error('❌ Cannot create customer account: No email address provided');
            return { success: false, error: 'No email address available' };
        }
        
        // Check if customer already exists
        const existingCustomer = await Customer.findOne({ 
            $or: [
                { email: opp_email },
                { quotepaymentId: quotepaymentId }
            ]
        });
        
        if (existingCustomer) {
            console.log(`ℹ️ Customer account already exists for ${opp_email}`);
            
            // Send reminder email to existing customer
            try {
                const emailResult = await sendExistingCustomerEmail({
                    customerName: existingCustomer.customerName || Customer_name || 'Valued Customer',
                    email: opp_email,
                    quotepaymentId: quotepaymentId,
                    existingQuotePaymentId: existingCustomer.quotepaymentId,
                    loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
                });
                
                if (emailResult.success) {
                    console.log('📧 Existing customer reminder email sent successfully');
                } else {
                    console.error('📧 Failed to send existing customer email:', emailResult.error);
                }
            } catch (emailError) {
                console.error('📧 Error sending existing customer email:', emailError);
            }
            
            return { 
                success: true, 
                message: 'Customer account already exists - reminder email sent', 
                customer: existingCustomer,
                isExisting: true
            };
        }
        
        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
        
        // Create new customer account
        const newCustomer = new Customer({
            email: opp_email,
            password: hashedPassword,
            quotepaymentId: quotepaymentId,
            customerName: Customer_name || 'Valued Customer',
            opportunityId: OpportunityId,
            quoteId: QuoteId,
            isActive: true,
            isTemporaryPassword: true,
            passwordResetRequired: true,
            accountCreatedDate: new Date()
        });
        
        const savedCustomer = await newCustomer.save();
        console.log(`✅ Customer account created successfully for ${opp_email}`);
        
        // Send welcome email with login credentials
        try {
            const emailResult = await sendCustomerWelcomeEmail({
                customerName: Customer_name || 'Valued Customer',
                email: opp_email,
                temporaryPassword: temporaryPassword,
                quotepaymentId: quotepaymentId,
                loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
            });
            
            if (emailResult.success) {
                console.log('📧 Welcome email sent successfully to customer');
            } else {
                console.error('📧 Failed to send welcome email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('📧 Error sending welcome email:', emailError);
        }
        
        // Log the account creation
        Post_Common_DB_Log_Data('/customer/account-creation', {
            quotepaymentId,
            email: opp_email
        }, {
            success: true,
            customerId: savedCustomer._id,
            message: 'Customer account created successfully'
        });
        
        return { 
            success: true, 
            customer: savedCustomer,
            temporaryPassword: temporaryPassword,
            message: 'Customer account created and welcome email sent'
        };
        
    } catch (error) {
        console.error('❌ Error creating customer account:', error);
        
        Post_Common_DB_Log_Data('/customer/account-creation', {
            quotepaymentId: subscriptionData?.quotepaymentId,
            email: subscriptionData?.opp_email
        }, {
            success: false,
            error: error.message
        });
        
        return { success: false, error: error.message };
    }
};

/**
 * Save card details after successful payment
 */
export const saveCustomerCard = async (paymentData) => {
    try {
        console.log('💳 Attempting to save customer card...');
        
        const {
            quotepaymentId,
            opp_email,
            Customer_name,
            afs_registration_id,
            afs_checkout_id,
            result // Payment result from AFS
        } = paymentData;
        
        // Validate required data
        if (!afs_registration_id || !opp_email || !quotepaymentId) {
            console.log('⚠️ Missing required card data - skipping card save');
            return { success: false, message: 'Missing required card data' };
        }
        
        // Find the customer
        const customer = await Customer.findOne({ 
            $or: [
                { email: opp_email },
                { quotepaymentId: quotepaymentId }
            ]
        });
        
        if (!customer) {
            console.log('⚠️ Customer not found - cannot save card');
            return { success: false, message: 'Customer not found' };
        }
        
        // Extract card information from AFS result if available
        let cardBrand = 'OTHER';
        let maskedCardNumber = '**** **** **** ****';
        let expiryMonth = '**';
        let expiryYear = '**';
        
        // Try to extract card details from AFS response
        if (result && result.card) {
            cardBrand = result.card.brand || 'OTHER';
            maskedCardNumber = result.card.last4 ? `**** **** **** ${result.card.last4}` : '**** **** **** ****';
            expiryMonth = result.card.expiryMonth || '**';
            expiryYear = result.card.expiryYear ? result.card.expiryYear.toString().slice(-2) : '**';
        }
        
        // Prepare card data for saving
        const cardData = {
            customerId: customer._id,
            customerEmail: opp_email,
            quotepaymentId: quotepaymentId,
            afs_registration_id: afs_registration_id,
            afs_checkout_id: afs_checkout_id,
            cardholderName: Customer_name || customer.customerName || 'Card Holder',
            maskedCardNumber: maskedCardNumber,
            cardBrand: cardBrand.toUpperCase(),
            expiryMonth: expiryMonth,
            expiryYear: expiryYear
        };
        
        // Save the card
        const savedCard = await addSavedCard(cardData);
        
        if (savedCard) {
            console.log('✅ Customer card saved successfully');
            return { 
                success: true, 
                message: 'Card saved successfully',
                cardId: savedCard._id
            };
        } else {
            console.log('⚠️ Card saving failed');
            return { success: false, message: 'Failed to save card' };
        }
        
    } catch (error) {
        console.error('❌ Error saving customer card:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update customer login timestamp
 */
export const updateCustomerLoginTime = async (email) => {
    try {
        await Customer.findOneAndUpdate(
            { email: email },
            { lastLoginDate: new Date() }
        );
    } catch (error) {
        console.error('Error updating customer login time:', error);
    }
};

/**
 * Generate password reset token
 */
function generateResetToken() {
    return Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
}

/**
 * Initiate password reset process
 */
export const initiatePasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }
        
        console.log(`🔄 Initiating password reset for: ${email}`);
        
        // Find customer by email
        const customer = await Customer.findOne({ email: email });
        
        if (!customer) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If this email exists in our system, you will receive a password reset link'
            });
        }
        
        // Generate reset token and expiry (1 hour)
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
        
        // Update customer with reset token
        await Customer.findByIdAndUpdate(customer._id, {
            passwordResetToken: resetToken,
            passwordResetExpiry: resetTokenExpiry
        });
        
        // Send password reset email
        try {
            const emailResult = await sendPasswordResetEmail({
                customerName: customer.customerName || 'Valued Customer',
                email: email,
                resetToken: resetToken,
                resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
            });
            
            if (emailResult.success) {
                console.log('📧 Password reset email sent successfully');
            } else {
                console.error('📧 Failed to send password reset email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('📧 Error sending password reset email:', emailError);
        }
        
        // Log the reset request
        Post_Common_DB_Log_Data('/customer/password-reset-request', {
            email: email
        }, {
            success: true,
            message: 'Password reset initiated'
        });
        
        res.json({
            success: true,
            message: 'If this email exists in our system, you will receive a password reset link'
        });
        
    } catch (error) {
        console.error('❌ Error initiating password reset:', error);
        
        Post_Common_DB_Log_Data('/customer/password-reset-request', {
            email: req.body.email
        }, {
            success: false,
            error: error.message
        });
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        
        if (!email || !token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, token, and new password are required'
            });
        }
        
        // Validate password strength
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\(\)+\\;:'",.<>\/?=_\{\}\[\]\|\-]).{8,}$/;
        if (!passwordPattern.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
            });
        }
        
        console.log(`🔄 Processing password reset for: ${email}`);
        
        // Find customer with valid reset token
        const customer = await Customer.findOne({
            email: email,
            passwordResetToken: token,
            passwordResetExpiry: { $gt: new Date() } // Token must not be expired
        });
        
        if (!customer) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update customer password and clear reset fields
        await Customer.findByIdAndUpdate(customer._id, {
            password: hashedPassword,
            isTemporaryPassword: false,
            passwordResetRequired: false,
            passwordResetToken: null,
            passwordResetExpiry: null,
            lastLoginDate: new Date() // Update last activity
        });
        
        console.log(`✅ Password reset successfully for: ${email}`);
        
        // Log the reset completion
        Post_Common_DB_Log_Data('/customer/password-reset-complete', {
            email: email
        }, {
            success: true,
            message: 'Password reset completed'
        });
        
        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        
        Post_Common_DB_Log_Data('/customer/password-reset-complete', {
            email: req.body.email
        }, {
            success: false,
            error: error.message
        });
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export default {
    createCustomerAccount,
    saveCustomerCard,
    updateCustomerLoginTime,
    initiatePasswordReset,
    resetPassword
};
