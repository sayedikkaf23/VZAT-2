import mongoose from "mongoose";

const Schema = mongoose.Schema;

const vzatRecurringDataSchema = new Schema({
    OpportunityId: {
        type:String,
        required: true,
    },
    quotepaymentId: {
        type:String,
        required: true 
    },
    QuoteId: {
        type: String,
        required: true
    },
    // recurring: {
    //     type: Boolean,
    //     required: true
    // },
    salesPersonDetails: {
        salesPersonEmail: { type: String, required: false },
        salesPersonMobile: { type: String, required: false },
        salesPersonName: { type: String, required: false }
    },
    CreatedDate: {
        type: String,
        required: true
    },
    Product_details: [
        {
            QuoteLineItemId: {
                type: String,
                required: true
            },
            ProductName: {
                type: String,
                required: false
            },
            TotalPrice: {
                type: Number,
                required: true
            },
            // amount: {
            //     type: Number,
            //     required: true
            // },
            Total_Price_After_VAT: {
                type: Number,
                required: true
            }
        }
    ],
    Status: {
        type: String,
        required: true
    },
    TotalPrice: {
        type: Number,
        required: true
    },
     InstallmentType: {
        type: String,
        required: true
    },
     InstallmentLeft: {
        type: Number,
        required: false
     },
     First_Charge_Date: {
        type: String,
        required: false
     },
    Total_After_VAT_Currency: {
        type: Number,
        required: true
    },
    afs_checkout_id: {
        type: String,
        required: false
    },
    // Track when checkout IDs are generated (for monitoring/debugging)
    last_checkout_generated: {
        type: Date,
        required: false
    },
    // Payment link expiry date - NO LONGER USED (kept for backward compatibility)
    // Payment links using quotepaymentId never expire
    payment_link_expiry: {
        type: Date,
        required: false
    },
    // Customer and Opportunity owner information
    Quote_payment_number: {
        type: String,
        required: false
    },
    Customer_name: {
        type: String,
        required: false
    },
    opp_owner: {
        type: String,
        required: false
    },
    opp_email: {
        type: String,
        required: false
    },
    opp_number: {
        type: String,
        required: false
    },
    opp_title: {
        type: String,
        required: false
    },
    opp_phone: {
        type: String,
        required: false
    },
    opp_mobile: {
        type: String,
        required: false
    },
    salesPersonDetails: {
        salesPersonEmail: { type: String, required: false },
        salesPersonMobile: { type: String, required: false },
        salesPersonName: { type: String, required: false }
    },
    // Subscription-related fields
    is_subscription: {
        type: Boolean,
        default: false
    },
    subscription_status: {
        type: String,
        enum: ['pending', 'active', 'paused', 'cancelled', 'completed', 'one-time'],
        default: 'one-time'
    },
    next_charge_date: {
        type: Date,
        required: false
    },
    afs_registration_id: {
        type: String,
        required: false // Stored after successful initial payment
    },
    afs_payment_brand: {
        type: String,
        required: false // Payment brand (VISA, MASTER, etc.) stored after successful initial payment
    },
    payments_completed: {
        type: Number,
        default: 0
    },
    last_payment_date: {
        type: Date,
        required: false
    },
    last_processed_date: {
        type: Date,
        required: false // Tracks when this subscription was last processed by cron job (prevents duplicate processing)
    },
    payment_retry_count: {
        type: Number,
        default: 0,
        required: false // Tracks number of retry attempts for failed payments
    },
    // Card change tracking fields
    card_updated_date: {
        type: Date,
        required: false // When the card was last changed
    },
    old_registration_id: {
        type: String,
        required: false // Previous registration ID for reference
    },
    subscription_created_date: {
        type: Date,
        default: Date.now
    },
    // Compliance and prepayment screening status from Salesforce
    compliance_clear: {
        type: Boolean,
     
    },
    prepayment_screening: {
        type: Boolean,
     
    },
    // Payment schedule array - structured payment plan
    payment_schedule: [{
        installment_number: {
            type: Number,
            required: true
        },
        due_date: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['completed', 'due', 'pending', 'overdue', 'cancelled'],
            default: 'pending'
        },
        transaction_id: {
            type: String,
            required: false
        },
        payment_date: {
            type: Date,
            required: false
        },
        q_payment_id: {
            type: String,
            required: false
        },
        salesforce_status: {
            type: String,
            required: false
        }
    }]
});

const Vzat_Recurring_Data = mongoose.model('Vzat_Recurring_Data',vzatRecurringDataSchema);

export default Vzat_Recurring_Data;


 