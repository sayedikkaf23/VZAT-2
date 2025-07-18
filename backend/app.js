import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import SalesForce from "./routes/SalesForce.js";
import AdminLogin from "./routes/AdminLoginRoute.js";
import Customer from "./routes/CustomerRoute.js";
import VzatRecurring from "./routes/VzatRecurring.js";

const app = express();

// ✅ Path resolution support (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware
app.use(express.json());

// ✅ CORS setup
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:4200', 'https://vzatnew.yeepeey.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
}));

// ✅ API Routes
app.use('/api/salesForce', SalesForce);
app.use('/api/adminLogin', AdminLogin);
app.use('/api/customer', Customer);
app.use('/api/vzat_recurring_create_payment_link', VzatRecurring);

// ✅ Static Angular frontend files
app.use(express.static(path.join(__dirname, 'frontend/dist/frontend/browser')));

// ✅ Frontend SPA catch-all (keep at end)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/frontend/browser/index.html'));
});

// ✅ Start server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
