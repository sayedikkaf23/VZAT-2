import express from "express";
import AdminLogin from "../Controllers/AdminLogin.js";
const router = express.Router();

// Route to /api/adminLogin
router.route("/").post(AdminLogin);

export default router;
