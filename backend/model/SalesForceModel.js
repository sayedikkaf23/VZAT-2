import mongoose from "mongoose";

const Schema = mongoose.Schema;

const salesForceSchema = new Schema({
    name: {
        type:String,
        required: true,
    },
    position: {
        type:String,
        required: true 
    },
    mobNo1: {
        type: String,
        required: true
    },
    mobNo2: {
        type: String,
        required: true
    },
    token: {
        type: Number,
        required: true
    }
});

const SalesForce = mongoose.model('SalesForce',salesForceSchema);

export default SalesForce;


 