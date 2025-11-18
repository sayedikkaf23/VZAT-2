import express from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const userController = require("../Controllers/user-controller.js");

const router = express.Router();

// Route to /api/user/country-risk/all
router.get("/country-risk/all", userController.getAllCountryRisks);

export default router;
