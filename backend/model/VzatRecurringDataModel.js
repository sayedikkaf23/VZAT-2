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
    payments_completed: {
        type: Number,
        default: 0
    },
    last_payment_date: {
        type: Date,
        required: false
    },
    subscription_created_date: {
        type: Date,
        default: Date.now
    }
});

const Vzat_Recurring_Data = mongoose.model('Vzat_Recurring_Data',vzatRecurringDataSchema);

export default Vzat_Recurring_Data;


 