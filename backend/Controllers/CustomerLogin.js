import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Customer from "../model/CustomerLoginModel.js";
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
        console.log(LogData);
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
          console.log(LogData);
          return res.json(data);
        }
        
        const isEqual = await bcrypt.compare(password, loggingUser.password);
        if (!isEqual) {
          const data = {
              message: "Password is Incorrect", 
              loggedIn: 0 
          }
          const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
          console.log(LogData);
          return res.json(data);
        }
        
        const token = jwt.sign(
          {
            email: loggingUser.email,
          },
          "virtuzone",
          {
            expiresIn: "24h",
          }
        );

        console.log(token)

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
          token:token 
        }
        const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
        console.log(LogData);
        res.json(data);
        
      } catch (err) {
        console.error("Error in CustomerLogin:", err);
        const data = {
            message: err.message || err
        }
        const LogData = Post_Common_DB_Log_Data("/api/customer/login",req.body,data);
        console.log(LogData);
        res.status(500).json(data);
      }
  }

  export default Login;
