import mongoose from "mongoose";

const addCardLogSchema = new mongoose.Schema({
    S_No: {
        type: Number,
        default: 0
    },
    step: {
        type: String,
        required: true
        // e.g. "prepare-checkout", "payment-status", "refund", "registration-callback", "registration-status"
    },
    customerEmail: {
        type: String,
        default: null
    },
    afs_endpoint: {
        type: String,
        default: null
    },
    afs_method: {
        type: String,
        default: null  // GET / POST
    },
    afs_request: {
        type: Object,
        default: null  // headers + body/params sent to AFS
    },
    afs_response: {
        type: Object,
        default: null  // full response from AFS
    },
    afs_status_code: {
        type: Number,
        default: null
    },
    afs_result_code: {
        type: String,
        default: null  // e.g. "000.000.000"
    },
    our_request: {
        type: Object,
        default: null  // what the frontend sent to our backend
    },
    our_response: {
        type: Object,
        default: null  // what our backend returned to frontend
    },
    status: {
        type: String,
        enum: ["SUCCESS", "FAILED", "ERROR", "PENDING"],
        default: "SUCCESS"
    },
    error_details: {
        type: Object,
        default: null
    },
    Date_and_Time: {
        type: Date,
        default: Date.now
    }
});

const AddCardLog = mongoose.model("AddCardLog", addCardLogSchema);

export default AddCardLog;
