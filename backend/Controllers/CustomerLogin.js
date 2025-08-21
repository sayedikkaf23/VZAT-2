import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Customer from "../model/CustomerLoginModel.js";
import { updateCustomerLoginTime } from "./CustomerRegistration.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";


const Login = async (req,res) => {
      if (!req.body) {
        const body = {
            message: "Body is empty"
        }
        const data = {
            message: "Nothing to Process to get the response"
        }
        const LogData = Post_Common_DB_Log_Data("/api/customer/login",body,data);
        
        res.statusCode = 404;
        res.end("Error");
        return;
      }
      
      const { email, password } = req.body;
      console.log(email,password);
      
      try {
        // Use persistent connection - mongoose will handle connection state automatically
        const loggingUser = await Customer.findOne({ email: email });
        console.log(loggingUser);
        
        if (!loggingUser) {
          const data = {
              message: "Couldn't find User", 
              loggedIn: 0 
          }
          const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
          return res.json(data);
        }
        
        const isEqual = await bcrypt.compare(password, loggingUser.password);
        if (!isEqual) {
          const data = {
              message: "Password is Incorrect", 
              loggedIn: 0 
          }
          const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
          return res.json(data);
        }
        
        const token = jwt.sign(
          {
            email: loggingUser.email,
            customerId: loggingUser._id,
            quotepaymentId: loggingUser.quotepaymentId
          },
          "virtuzone",
          {
            expiresIn: "24h",
          }
        );


        // Update last login time
        await updateCustomerLoginTime(email);

        // res.cookie('jwtToken', token, {
        //   httpOnly: true,
        //   // secure: true,
        //   sameSite: 'None',
        //   maxAge: 3600000 // 1 hour
        // });
        // let decodedToken = jwt.verify(token, "virtuzone");
        // console.log(decodedToken);
        const data = {
          message: "Logged in the User Successfully",
          loggedIn: 1, 
          token: token,
          customer: {
            id: loggingUser._id,
            email: loggingUser.email,
            name: loggingUser.customerName,
            quotepaymentId: loggingUser.quotepaymentId,
            isTemporaryPassword: loggingUser.isTemporaryPassword,
            passwordResetRequired: loggingUser.passwordResetRequired
          }
        }
        const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
        
        res.json(data);
        
      } catch (err) {
        console.error("Error in CustomerLogin:", err);
        const data = {
            message: err.message || err
        }
        const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
        
        res.status(500).json(data);
      }
  }

  export default Login;
