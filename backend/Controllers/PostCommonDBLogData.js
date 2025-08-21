import {connectDB,disconnectDB} from "../config/db.js";
import CommonDBLog from "../model/CommonDBLogModel.js";


const Post_Common_DB_Log_Data = async (url,reqData,resData) => {

    await connectDB();
    try {
        const dataToUpload = new CommonDBLog({
            S_No: 0,
            Method_Name: url,
            Request: reqData,
            Response: resData
        });
        
        const result = await dataToUpload.save();
        const totalCount = await CommonDBLog.countDocuments({});
        const updatedCommonLog = await CommonDBLog.findByIdAndUpdate(
            result._id, 
            { $set: { S_No: totalCount }}, 
            { new: true, runValidators: true }
        )

        if(updatedCommonLog){       
            const data = {
                message: "Log is stored in DB"
            }
            ;
            
            return data;
        }            
        
      } catch (err) {
        ;
        return err;
      }

  }

  export default Post_Common_DB_Log_Data;
