import express from "express";
import CustomerLogin from "../Controllers/CustomerLogin.js";
const router = express.Router();

// Route to /api/customer/login
router.route("/login").post(CustomerLogin);

export default router;
