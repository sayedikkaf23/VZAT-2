import {connectDB,disconnectDB} from "../config/db.js";
import SalesForce from "../model/SalesForceModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import _ from 'lodash';


const GetSalesForce = async (req, res) => {
    console.log("hi")
      const { token } = req.query;
      if (!token) {
        const query = {
          message: "Query is empty"
        }
        const data = {
          message: "Nothing to Process to get the response"
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",query,data);
        console.log(LogData);
        res.statusCode = 404;
        res.json(query);
      }
      else {

      console.log(req.query);

    
      console.log(token);
      await connectDB();
    
      try {
        const salesAgent = await SalesForce.findOne({token: token});
        console.log(salesAgent)
        if (salesAgent) {
          //await disconnectDB();
          const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, salesAgent);
          console.log(LogData);
          return res.json(salesAgent); // Added return to prevent further execution
        }
       // await disconnectDB();
        const data = {
          name:"",
          position:"",
          mobNo1:0,
          mobNo2:0,
          token:0
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, data);
        console.log(LogData);
        return res.json(data); // Added return
      } catch (err) {
       // await disconnectDB();
       const data = {
            message: err
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.body,data);
        console.log(LogData);
        return res.status(500).json(data); // Added return and proper status code
      }

    }
      
      
}

export default GetSalesForce;