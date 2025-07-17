import express from "express";
import Post_Vzat_Recurring_Data, { getAFSPaymentResult } from "../Controllers/PostVzatRecurringData.js";
import { Get_All_Vzat_Recurring_Data , Get_Searched_Vzat_Recurring_Data } from "../Controllers/GetVzatRecurringData.js";
const router = express.Router();

// Route to /api/vzat_recurring_create_payment_link
router.route("/").post(Post_Vzat_Recurring_Data);
router.route("/").get(Get_All_Vzat_Recurring_Data);
router.route("/search").get(Get_Searched_Vzat_Recurring_Data);

// GET AFS payment result
router.get('/afs-payment-result', getAFSPaymentResult);
// Add alias for frontend compatibility
router.get('/payment/result', getAFSPaymentResult);

export default router;
