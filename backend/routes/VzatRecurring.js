import express from "express";
import Post_Vzat_Recurring_Data from "../Controllers/VzatRecurringData.js";
const router = express.Router();

// Route to /api/vzat_recurring_create_payment_link
router.route("/").post(Post_Vzat_Recurring_Data);

export default router;
