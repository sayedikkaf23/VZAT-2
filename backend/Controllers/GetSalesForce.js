import SalesForce from "../model/SalesForceModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { connectDB } from "../config/db.js";
import _ from 'lodash';


const GetSalesForce = async (req, res) => {
      // Ensure database connection before running operations
      await connectDB();
      
      const { token } = req.query;
      if (!token) {
        const query = {
          message: "Query is empty"
        }
        const data = {
          message: "Nothing to Process to get the response"
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",query,data);
        res.statusCode = 404;
        res.json(query);
        return;
      }

      
      try {
        // Database connection is ensured above
        const salesAgent = await SalesForce.findOne({token: token});
        
        if (salesAgent) {
          const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, salesAgent);
          
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
        
        return res.json(data);
        
      } catch (err) {
        console.error("Error in GetSalesForce:", err);
        const data = {
            message: err.message || err
        }
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.body,data);
        
        return res.status(500).json(data);
      }
}

export default GetSalesForce;