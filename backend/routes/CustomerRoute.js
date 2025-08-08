import express from "express";
import CustomerLogin from "../Controllers/CustomerLogin.js";
import { initiatePasswordReset, resetPassword } from "../Controllers/CustomerRegistration.js";
const router = express.Router();

// Route to /api/customer/login
router.route("/login").post(CustomerLogin);

// Route to /api/customer/forgot-password
router.route("/forgot-password").post(initiatePasswordReset);

// Route to /api/customer/reset-password
router.route("/reset-password").post(resetPassword);

export default router;
