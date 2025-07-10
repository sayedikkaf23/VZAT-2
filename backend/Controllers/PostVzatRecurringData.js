import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";


const Post_Vzat_Recurring_Data = async (req,res) => {
     if (!req.body) {
        const body = {
            message: "Body is empty"
        }
        const data = {
            message: "Nothing to Process to get the response"
        }
        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",body,data);
        console.log(LogData);
        res.statusCode = 404;
        res.json(body);
      }
      const { 
            OpportunityId,
            quotepaymentId,
            QuoteId,
            CreatedDate,
            Status,
            TotalPrice, 
            Total_After_VAT_Currency__c
        } = req.body;
      console.log(req.body);

      await connectDB();
      try {
        var regEx = /^\d{4}-\d{2}-\d{2}$/;
        var d = new Date(CreatedDate);
        var dNum = d.getTime();
        if(!CreatedDate.match(regEx)) {
            const data = {
                message: "Date should be in yyyy-mm-dd format"
            }
            const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
            console.log(LogData);
            //await disconnectDB();
            res.json(data);
        }
        else if(!dNum && dNum !== 0) {
            const data = {
                message: "Invalid Date"
            }
            const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
            console.log(LogData);
            //await disconnectDB();
            res.json(data);
        }  
        else if(d.toISOString().slice(0,10) === CreatedDate){
        const dataToUpload = new Vzat_Recurring_Data({
            OpportunityId: OpportunityId,
            quotepaymentId: quotepaymentId,
            QuoteId: QuoteId,
            //recurring: recurring,
            CreatedDate: CreatedDate,
            Status: Status,
            TotalPrice: TotalPrice, 
            Total_After_VAT_Currency__c: Total_After_VAT_Currency__c
        });
        if(Array.isArray(req.body.Product_details)){
            if (req.body.Product_details.length === 0 || !OpportunityId || !quotepaymentId || !QuoteId  || !CreatedDate || !Status  || TotalPrice === null || TotalPrice === undefined || TotalPrice === 0 || Total_After_VAT_Currency__c === null || Total_After_VAT_Currency__c === undefined || Total_After_VAT_Currency__c === 0) {
                const data = {
                    message: "one or more datas are missing"
                }
                const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                console.log(LogData);
                //await disconnectDB();
                res.json(data);
            } else {
                const result = await dataToUpload.save();
                console.log(result);
                    for (let i = 0; i < req.body.Product_details.length; i++) {
                        if(!req.body.Product_details[i].QuoteLineItemId || req.body.Product_details[i].TotalPrice === null || req.body.Product_details[i].TotalPrice === undefined || req.body.Product_details[i].TotalPrice === 0 || req.body.Product_details[i].Total_Price_After_VAT__c === null || req.body.Product_details[i].Total_Price_After_VAT__c === undefined || req.body.Product_details[i].Total_Price_After_VAT__c === 0){
                            const deletedDocument = await Vzat_Recurring_Data.findByIdAndDelete(result._id);
                            if (deletedDocument) {
                                console.log('Document deleted successfully:', deletedDocument);
                                const data = {
                                    message: "one or more datas are missing"
                                }
                                const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                console.log(LogData);
                                //await disconnectDB();
                                res.json(data);
                            } else {
                                const data = {
                                    message: "No document found for deleting with the given ID."
                                }
                                const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                console.log(LogData);
                                console.log('No document found for deleting with the given ID.');
                            }   
                        }
                        else{
                            try {
                                const updatedProduct_Details = await Vzat_Recurring_Data.findByIdAndUpdate(
                                result._id,
                                { $push: { Product_details: req.body.Product_details[i] } }, 
                                { new: true, runValidators: true } 
                                );

                                if (updatedProduct_Details) {
                                console.log('successfully pushed to Array:');
                                const data = {
                                    message: "uploaded the data successfully"
                                }
                                const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                console.log(LogData);
                                //await disconnectDB();
                                res.json(data);
                                } else {
                                console.log('not pushed.');
                                const deletedDocument = await Vzat_Recurring_Data.findByIdAndDelete(result._id);
                                if(deletedDocument) {
                                    const data = {
                                        message: "Not uploaded the data"
                                    }
                                    const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                    console.log(LogData);
                                    //await disconnectDB();
                                    res.json(data);
                                }
                                else {
                                    const data = {
                                        message: "Not Uploaded the data and not deleted the document which is created before pushing into the array"
                                    }
                                    const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                    console.log(LogData);
                                    console.log("Not Uploaded the data and not deleted the document which is created before pushing into the array")
                                }
                                }
                            } catch (error) {
                                const data = {
                                    message: error
                                }
                                const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
                                console.log(LogData);
                                console.error('Error uploading data :', error);
                            }
                        }
                    }
                
            }
        } else{
            const data = {
                message: "Product Details should be array"
            }
            const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
            console.log(LogData);
            //await disconnectDB();
            res.json(data);
        }
    }
    else {
       const data = {
                message: "Date should be in yyyy-mm-dd format"
            }
            const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
            console.log(LogData);
            //await disconnectDB();
            res.json(data); 
    }
      } catch (err) {
        const data = {
            message: err
        }
        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
        console.log(LogData);
        await disconnectDB();
        throw err;
      }

  }

  export default Post_Vzat_Recurring_Data;
