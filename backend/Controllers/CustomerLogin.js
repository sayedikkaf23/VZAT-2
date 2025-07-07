import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {connectDB,disconnectDB} from "../config/db.js";
import Customer from "../model/CustomerLoginModel.js";


const Login = async (req,res) => {
     if (!req.body) {
        res.statusCode = 404;
        res.end("Error");
      }
      const { email, password } = req.body;
      console.log(email,password);
      await connectDB();
      try {
        const loggingUser = await Customer.findOne({ email: email });
        console.log(loggingUser);
        if (!loggingUser) {
          //await disconnectDB();
          return res.json({ message: "Couldn't find User", loggedIn: 0 });
        }
        const isEqual = await bcrypt.compare(password, loggingUser.password);
        if (!isEqual) {
          //await disconnectDB();
          return res.json({ message: "Password is Incorrect", loggedIn: 0  });
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
        //await disconnectDB();

        console.log(token)

        // res.cookie('jwtToken', token, {
        //   httpOnly: true,
        //   // secure: true,
        //   sameSite: 'None',
        //   maxAge: 3600000 // 1 hour
        // });
        // let decodedToken = jwt.verify(token, "virtuzone");
        // console.log(decodedToken);
        res.json({
          message: "Logged in the User Successfully",
          loggedIn: 1, 
          token:token
        });
      } catch (err) {
        //await disconnectDB();
        throw err;
      }

  }

  export default Login;
