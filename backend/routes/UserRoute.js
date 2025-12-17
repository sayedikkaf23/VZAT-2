import express from "express";
import { 
  getAllCountryRisks, 
  callSalesforceEndpoint, 
  checkStatus 
} from "../Controllers/user-controller.js";

const router = express.Router();

// Route to /api/user/country-risk/all
router.get("/country-risk/all", getAllCountryRisks);

// Route to /api/user/digicomplice
router.post("/digicomplice", callSalesforceEndpoint);

// Route to /api/user/checkStatus
router.post("/checkStatus", checkStatus);

export default router;