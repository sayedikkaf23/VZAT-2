import { ensureConnection } from "../config/db.js";
import AddCardLog from "../model/AddCardLogModel.js";

/**
 * Save a log entry for add-card / AFS flow
 * @param {string} step        - which step: "prepare-checkout", "payment-status", "refund", "registration-callback", etc.
 * @param {string} customerEmail
 * @param {object} afsCall     - { endpoint, method, request, response, statusCode, resultCode }
 * @param {object} ourCall     - { request, response }
 * @param {string} status      - "SUCCESS" | "FAILED" | "ERROR" | "PENDING"
 * @param {object} errorDetails
 */
const PostAddCardLog = async (step, customerEmail, afsCall = {}, ourCall = {}, status = "SUCCESS", errorDetails = null) => {
    try {
        await ensureConnection();

        const logEntry = new AddCardLog({
            step,
            customerEmail: customerEmail || null,
            afs_endpoint: afsCall.endpoint || null,
            afs_method: afsCall.method || null,
            afs_request: afsCall.request || null,
            afs_response: afsCall.response || null,
            afs_status_code: afsCall.statusCode || null,
            afs_result_code: afsCall.resultCode || null,
            our_request: ourCall.request || null,
            our_response: ourCall.response || null,
            status,
            error_details: errorDetails || null
        });

        const saved = await logEntry.save();

        const totalCount = await AddCardLog.countDocuments({});
        await AddCardLog.findByIdAndUpdate(saved._id, { $set: { S_No: totalCount } });

    } catch (err) {
        console.error("❌ PostAddCardLog failed to save:", err.message);
    }
};

export default PostAddCardLog;
