import {connectDB,disconnectDB} from "../config/db.js";
import SalesForce from "../model/SalesForceModel.js";
import mongoose from "mongoose";


const GetSalesForce = async (req, res) => {
  console.log("hi")
    if (!req.query) {
        res.statusCode = 404;
        res.end("Error");
      }

      console.log(req.query);

      const { token } = req.query;
      console.log(token);
      await connectDB();
    
      try {
        const salesAgent = await SalesForce.findOne({token: token});
        console.log(salesAgent)
        if (salesAgent) {
          //await disconnectDB();
          return res.json(salesAgent);
        }
       // await disconnectDB();
        const data = {
          name:"",
          position:"",
          mobNo1:0,
          mobNo2:0,
          token:0
        }
        res.json(data);
      } catch (err) {
       // await disconnectDB();
        throw err;
      }
      
      
}

export default GetSalesForce;