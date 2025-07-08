import {connectDB,disconnectDB} from "../config/db.js";
import Vzat_Recurring_Data from "../model/VzatRecurringDataModel.js";


const Get_Vzat_Recurring_Data = async (req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    await connectDB();

    try {
        const data = await Vzat_Recurring_Data.find().skip(skip).limit(limit).exec();
        const totalCount = await Vzat_Recurring_Data.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            data,
            currentPage: page,
            totalPages,
            totalCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

  export default Get_Vzat_Recurring_Data;
