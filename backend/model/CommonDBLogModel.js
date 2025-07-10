import mongoose from "mongoose";

const Schema = mongoose.Schema;

const commonDBLogSchema = new Schema({
    S_No: {
        type: Number,
        required: true,
    },
    Method_Name: {
        type: String,
        required: true 
    },
    Request: {
        type: Object,
        required: true
    },
    Response: {
        type: Object,
        required: true
    },
    Date_and_Time: {
        type: Date,
        default: Date.now
    },
    Requested_By: {
        type: String,
        //required: true
    }
});

const Common_DB_Log = mongoose.model('Common_DB_Log',commonDBLogSchema);

export default Common_DB_Log;


 