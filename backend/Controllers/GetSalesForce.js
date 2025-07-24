import { isDBConnected } from "../config/db.js";
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
        return;
      }

      console.log(req.query);
      console.log(token);
      
      try {
        // Check if database is connected (using persistent connection)
        if (!isDBConnected()) {
          throw new Error("Database not connected");
        }
        
        const salesAgent = await SalesForce.findOne({token: token});
        console.log(salesAgent)
        
        if (salesAgent) {
          const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, salesAgent);
          console.log(LogData);
          return res.json(salesAgent);
        }
        
        const data = {
          name:"",
          position:"",
          mobNo1:0,
          mobNo2:0,
          token:0
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, data);
        console.log(LogData);
        return res.json(data);
        
      } catch (err) {
        console.error("Error in GetSalesForce:", err);
        const data = {
            message: err.message || err
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.body,data);
        console.log(LogData);
        return res.status(500).json(data);
      }
}

export default GetSalesForce;