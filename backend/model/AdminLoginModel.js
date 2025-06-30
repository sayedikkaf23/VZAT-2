import mongoose from "mongoose";

const Schema = mongoose.Schema;

const adminUserSchema = new Schema({
    email: {
        type:String,
        required: true,
        unique: true,
    },
    password: {
        type:String,
        required: true 
    },
});

const AdminUser = mongoose.model('AdminUser',adminUserSchema);

export default AdminUser;
 