import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";


const Post_Vzat_Recurring_Data = async (req,res) => {
     if (!req.body) {
        res.statusCode = 404;
        res.end("Error");
      }
      const { 
            OpportunityId,
            quotepaymentId,
            QuoteId,
            //recurring,
            CreatedDate,
            Status,
            TotalPrice, 
            Total_After_VAT_Currency__c
        } = req.body;
    //const {product_details} =  req.body.product_details;
    //console.log(product_details)
      console.log(req.body);
      await connectDB();
      try {
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
                    message: "one or more datas are missing - 1"
                }
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
                                    message: "one or more datas are missing - 2"
                                }
                                //await disconnectDB();
                                res.json(data);
                            } else {
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
                                //await disconnectDB();
                                res.json(data);
                                } else {
                                console.log('not pushed.');
                                const deletedDocument = await Vzat_Recurring_Data.findByIdAndDelete(result._id);
                                if(deletedDocument) {
                                    const data = {
                                        message: "Not uploaded the data"
                                    }
                                    //await disconnectDB();
                                    res.json(data);
                                }
                                else {
                                    console.log("Not Uploaded the data and not deleted the document which is created before pushing into the array")
                                }
                                }
                            } catch (error) {
                                console.error('Error uploading data :', error);
                            }
                        }
                    }
                
            }
        } else{
            const data = {
                message: "Product Details should be array"
            }
            //await disconnectDB();
            res.json(data);
        }
      } catch (err) {
        await disconnectDB();
        throw err;
      }

  }

  export default Post_Vzat_Recurring_Data;
