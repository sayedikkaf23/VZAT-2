import express from "express";
import Post_Vzat_Recurring_Data, { getAFSPaymentResult, createCheckoutIdForQuotePayment } from "../Controllers/PostVzatRecurringData.js";
import { Get_All_Vzat_Recurring_Data , Get_Searched_Vzat_Recurring_Data } from "../Controllers/GetVzatRecurringData.js";
import { Get_Vzat_Recurring_Data_By_Id } from "../Controllers/GetVzatRecurringDataById.js";
const router = express.Router();

// Route to /api/vzat_recurring_create_payment_link
router.route("/").post(Post_Vzat_Recurring_Data);
router.route("/").get(Get_All_Vzat_Recurring_Data);
router.route("/search").get(Get_Searched_Vzat_Recurring_Data);

// POST create checkout ID for existing quotepaymentId (called when user clicks "Pay Here")
router.post("/create-checkout/:quotepaymentId", createCheckoutIdForQuotePayment);

// GET single record by quotepaymentId
router.route("/:quotepaymentId").get(Get_Vzat_Recurring_Data_By_Id);

// GET AFS payment result
router.get('/afs-payment-result', getAFSPaymentResult);
// Add alias for frontend compatibility
router.get('/payment/result', getAFSPaymentResult);

export default router;
