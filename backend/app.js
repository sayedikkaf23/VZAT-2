import express from "express";
import cors from "cors";
import SalesForce from "./routes/SalesForce.js";
import AdminLogin from "./routes/AdminLoginRoute.js";

const app = express()
app.use(express.json())
app.use(cors({
    origin: 'http://localhost:4200',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
      next();
    });

app.use('/api/salesForce',  SalesForce);
app.use('/api/adminLogin',  AdminLogin);


app.listen(3000, () => {
    console.log("server is running")
})

