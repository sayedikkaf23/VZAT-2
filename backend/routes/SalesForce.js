import express from "express";
import GetSalesForce from "../Controllers/GetSalesForce.js";
const router = express.Router();

// Route to /api/getSalesForce
router.route("/").get(GetSalesForce);

export default router;
