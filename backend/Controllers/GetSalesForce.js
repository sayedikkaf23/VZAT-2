import SalesForce from "../model/SalesForceModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import { connectDB } from "../config/db.js";
import _ from 'lodash';


const GetSalesForce = async (req, res) => {
      // Ensure database connection
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
        // Convert token to number since the model expects a Number type
        const tokenNumber = parseInt(token, 10);
        
        if (isNaN(tokenNumber)) {
          const errorData = {
            message: "Invalid token format",
            token: token
          };
          const LogData = Post_Common_DB_Log_Data("/api/salesForce", req.query, errorData);
          return res.status(400).json(errorData);
        }
        
        // Query with number type
        const salesAgent = await SalesForce.findOne({token: tokenNumber});
        
        if (salesAgent) {
          const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, salesAgent);
          
          return res.json(salesAgent);
        }
        
        // Return null instead of empty object to indicate no data found
        // Frontend will handle null and use fallback data
        const data = null;
        const LogData = Post_Common_DB_Log_Data("/api/salesForce",req.query, { message: "No sales agent found for token", token: tokenNumber });
        
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