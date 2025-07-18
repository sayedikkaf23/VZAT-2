import express from "express";
import cors from "cors";
import SalesForce from "./routes/SalesForce.js";
import AdminLogin from "./routes/AdminLoginRoute.js";
import Customer from "./routes/CustomerRoute.js";
import VzatRecurring from "./routes/VzatRecurring.js";
import path from "path";
import { fileURLToPath } from 'url';


const app = express();

// Enable JSON parsing
app.use(express.json());

// ✅ Global CORS middleware
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

// ✅ Define your API routes
app.use('/api/salesForce', SalesForce);
app.use('/api/adminLogin', AdminLogin);
app.use('/api/customer', Customer);
app.use('/api/vzat_recurring_create_payment_link', VzatRecurring);


// ✅ Start the server
app.listen(3000, () => {
  console.log("server is running on port 3000");
});
