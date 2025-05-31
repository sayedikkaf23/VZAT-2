const express = require("express");
const connectDB = require("./config/database");
const bodyParser = require("body-parser");
const userRoutes= require('./routes/userRoutes');

const app = express();

// load .env and connect
connectDB();

app.use(express.json());
app.use('/users', userRoutes);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.listen(3000, () => console.log("Server up on http://localhost:3000"));
