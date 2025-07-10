import {connectDB,disconnectDB} from "../config/db.js";
import CommonDBLog from "../model/CommonDBLogModel.js";


const Post_Common_DB_Log_Data = async (url,reqData,resData) => {

    console.log(url);
    console.log(reqData);
    console.log(resData);
    await connectDB();
    try {
        const dataToUpload = new CommonDBLog({
            S_No: 0,
            Method_Name: url,
            Request: reqData,
            Response: resData
        });
        
        const result = await dataToUpload.save();
        console.log(result);
        const totalCount = await CommonDBLog.countDocuments({});
        console.log(totalCount);
        console.log(result._id)
        const updatedCommonLog = await CommonDBLog.findByIdAndUpdate(
            result._id, 
            { $set: { S_No: totalCount }}, 
            { new: true, runValidators: true }
        )
        console.log(updatedCommonLog);
        if(updatedCommonLog){       
            const data = {
                message: "Log is stored in DB"
            }
            //await disconnectDB();
            
            return data;
        }            
        
      } catch (err) {
        //await disconnectDB();
        return err;
      }

  }

  export default Post_Common_DB_Log_Data;
