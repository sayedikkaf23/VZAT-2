import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";
import _ from 'lodash';


const Get_All_Vzat_Recurring_Data = async (req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    

    await connectDB();

    try {
        const data = await Vzat_Recurring_Data.find().skip(skip).limit(limit).exec();
        const totalCount = await Vzat_Recurring_Data.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        const log = {data,currentPage: page,totalCount,totalPages}

        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, log);
        console.log(LogData);

        res.json({
            data,
            currentPage: page,
            totalPages,
            totalCount
        });
    } catch (error) {
        const data = {
            message: error
        }
        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
        console.log(LogData);
        res.status(500).json({ message: error.message });
    }
}

const Get_Searched_Vzat_Recurring_Data = async (req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const {
      OpportunityId,
      quotepaymentId,
      QuoteId,
      FromDate,
      ToDate
    } = req.query

    console.log(OpportunityId,quotepaymentId,QuoteId,FromDate,ToDate);

    if (!OpportunityId && !quotepaymentId && !QuoteId && !FromDate && !ToDate) {
        const query = {
          message: "Query is empty"
        }
        const data = {
          message: "Nothing to Process to get the response"
        }
        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link/search",query,data);
        console.log(LogData);
        res.statusCode = 404;
        res.json(query);
      }

  else {

    await connectDB();

    try {
      if(OpportunityId != undefined){ 
        if (OpportunityId.length > 0){
              const data = await Vzat_Recurring_Data.find({OpportunityId:OpportunityId})

              if (_.isEmpty(data)){
                const resData = {
            message: "Requested OpportunityId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
              }
              else{
              const resData = {
                data,
              }

              const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
              console.log(LogData);

              res.json(resData);
            }
            }
        else {
        const resData = {
            message: "Requested OpportunityId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
      }
      else if (quotepaymentId != undefined){
       if (quotepaymentId.length > 0){
          const data = await Vzat_Recurring_Data.find({quotepaymentId:quotepaymentId})
          if (_.isEmpty(data)) {
            const resData = {
            message: "Requested QuotePaymentId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
        else {
          const resData = {
            data,
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
        }
        else {
        const resData = {
            message: "Requested QuotePaymentId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
      }
      else if (QuoteId != undefined){
        if (QuoteId.length > 0){
          const data = await Vzat_Recurring_Data.find({QuoteId:QuoteId})
          if(_.isEmpty(data)){
            const resData = {
            message: "Requested QuoteId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
          
        }
        else {
          const resData = {
            data,
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
        }
        else {
        const resData = {
            message: "Requested QuoteId does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
      }
      else if (FromDate != undefined && ToDate != undefined){
        if (FromDate.length > 0 && ToDate.length > 0){
          const data = await Vzat_Recurring_Data.find({ CreatedDate: {
                                                              $gte: FromDate,
                                                              $lte: ToDate,
                                                            }})
          
          .skip(skip).limit(limit).exec();
          if(_.isEmpty(data)){
            const resData = {
            message: "Requested Date Range does not exist"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
         else {
          const totalCount = data.length ;
          const totalPages = Math.ceil(totalCount / limit);

          const resData = {
            data,
            currentPage: page,
            totalCount,
            totalPages
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
        }
        else {
        const resData = {
            message: "Please provide both from and to Date"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
        }
      }
      else {
        const resData = {
            message: "Search is invalid"
          }

          const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.query, resData);
          console.log(LogData);

          res.json(resData);
      }
    } catch (error) {
        const data = {
            message: error
        }
        const LogData = Post_Common_DB_Log_Data("/api/vzat_recurring_create_payment_link",req.body,data);
        console.log(LogData);
        res.status(500).json({ message: error.message });
    }
  }
}

  export { Get_All_Vzat_Recurring_Data , Get_Searched_Vzat_Recurring_Data};
