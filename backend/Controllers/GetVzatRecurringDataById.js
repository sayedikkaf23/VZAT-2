import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";
import Post_Common_DB_Log_Data from "../Controllers/PostCommonDBLogData.js";

// Get single VZAT recurring data record by quotepaymentId
const Get_Vzat_Recurring_Data_By_Id = async (req, res) => {
    await connectDB();

    try {
        const { quotepaymentId } = req.params;
        
        // Decode URL-encoded quotepaymentId
        const decodedQuotepaymentId = decodeURIComponent(quotepaymentId);
        
        if (!decodedQuotepaymentId || decodedQuotepaymentId.trim() === '') {
            const data = { message: "QuotePaymentId is required" };
            Post_Common_DB_Log_Data("/api/vzat_recurring_data/:quotepaymentId", req.params, data);
            return res.status(400).json(data);
        }

        // Validate quotepaymentId format - reject common invalid values
        const invalidValues = ['not available', 'n/a', 'na', 'null', 'undefined', 'none', ''];
        if (invalidValues.includes(decodedQuotepaymentId.toLowerCase().trim())) {
            const data = { 
                message: "Invalid QuotePaymentId format",
                error: `The provided QuotePaymentId "${decodedQuotepaymentId}" is not valid`
            };
            Post_Common_DB_Log_Data("/api/vzat_recurring_data/:quotepaymentId", req.params, data);
            return res.status(400).json(data);
        }

        // Validate quotepaymentId format - should be a Salesforce ID (typically 15-18 characters, alphanumeric)
        // Salesforce IDs usually start with a letter and contain alphanumeric characters
        const salesforceIdPattern = /^[a-zA-Z0-9]{15,18}$/;
        if (!salesforceIdPattern.test(decodedQuotepaymentId.trim())) {
            console.warn(`⚠️ Invalid quotepaymentId format: ${decodedQuotepaymentId} (expected Salesforce ID format)`);
            // Still try to find it, but log a warning
        }

        const data = await Vzat_Recurring_Data.findOne({ quotepaymentId: decodedQuotepaymentId.trim() });
        
        if (!data) {
            const resData = {
                message: "Requested QuotePaymentId does not exist",
                quotepaymentId: decodedQuotepaymentId
            };
            Post_Common_DB_Log_Data("/api/vzat_recurring_data/:quotepaymentId", req.params, resData);
            return res.status(404).json(resData);
        }

        const resData = {
            success: true,
            data: data
        };

        Post_Common_DB_Log_Data("/api/vzat_recurring_data/:quotepaymentId", req.params, resData);
        res.json(data); // Return the data directly for frontend compatibility
        
    } catch (error) {
        console.error('❌ Error fetching VZAT recurring data:', error);
        const data = {
            message: error.message || "Internal server error"
        };
        Post_Common_DB_Log_Data("/api/vzat_recurring_data/:quotepaymentId", req.params, data);
        res.status(500).json(data);
    }
};

export { Get_Vzat_Recurring_Data_By_Id };
