import { sendPdfEmail } from '../services/emailService.js';
import Post_Common_DB_Log_Data from './PostCommonDBLogData.js';
import VzatRecurringData from '../model/VzatRecurringDataModel.js';

/**
 * Handle Salesforce PDF webhook
 * Receives quote payment data with PDF attachment and sends email
 */
export const handleSalesforcePdfWebhook = async (req, res) => {
    try {
        console.log('📨 Received Salesforce PDF webhook request');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Extract data from request
        const {
            quote_payment_number,
            Total_After_VAT_Currency,
            quote_email,
            quotepaymentId,
            Payment_Link: paymentLink,
            Installment_amount,
            Total_Installments,
            quotePdf,
            Customer_name,
            opp_owner,
            installmentSchedule,
            QuoteId,
            OpportunityId,
            salesPersonDetails
        } = req.body;

        // console.log('🧑‍💼 Customer name from webhook:', Customer_name);

        // Validate required fields
        const requiredFields = {
            quote_payment_number,
            quote_email,
            quotepaymentId,
            paymentLink,
            quotePdf
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
            console.error('❌ Validation error:', errorMessage);
            
            // Log the error
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                { success: false, error: errorMessage }
            );
            

            return res.status(400).json({
                success: false,
                error: errorMessage,
                received_fields: Object.keys(req.body)
            });
        }

        // Validate quote PDF format
        if (!Array.isArray(quotePdf) || quotePdf.length ***REMOVED***= 0) {
            const errorMessage = 'quotePdf must be a non-empty array';
            console.error('❌ PDF validation error:', errorMessage);
            
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                { success: false, error: errorMessage }
            );
            

            return res.status(400).json({
                success: false,
                error: errorMessage
            });
        }

        // Validate each PDF in the array
        for (let i = 0; i < quotePdf.length; i++) {
            const pdf = quotePdf[i];
            if (!pdf.pdfContent || !pdf.name) {
                const errorMessage = `PDF at index ${i} missing required fields (pdfContent, name)`;
                console.error('❌ PDF structure validation error:', errorMessage);
                
                const logData = Post_Common_DB_Log_Data(
                    "/api/salesforce/pdf-webhook",
                    req.body,
                    { success: false, error: errorMessage }
                );
                

                return res.status(400).json({
                    success: false,
                    error: errorMessage
                });
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(quote_email)) {
            const errorMessage = 'Invalid email format for quote_email';
            console.error('❌ Email validation error:', errorMessage);
            
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                { success: false, error: errorMessage }
            );
            

            return res.status(400).json({
                success: false,
                error: errorMessage
            });
        }

        // console.log(`📧 Preparing to send PDF email to: ${quote_email}`);
        // console.log(`📄 Number of PDFs to attach: ${quotePdf.length}`);

        // Fetch payment schedule from database if quotepaymentId exists
        let paymentScheduleFromDB = null;
        let customerNameFromDB = null;
        let salesPersonDetailsFromDB = null;
        
        try {
            if (quotepaymentId) {
                console.log(`🔍 Looking up payment schedule for quotepaymentId: ${quotepaymentId}`);
                const recurringData = await VzatRecurringData.findOne({ quotepaymentId: quotepaymentId });
                
                if (recurringData) {
                    // Get customer name from database
                    customerNameFromDB = recurringData.Customer_name;
                    // console.log('🧑‍💼 Customer name from DB:', customerNameFromDB);
                    
                    // Get sales person details from database if available
                    if (recurringData.salesPersonDetails) {
                        salesPersonDetailsFromDB = recurringData.salesPersonDetails;
                        // console.log('👤 Sales person details found in DB');
                    }

                    // Get payment schedule from database
                    if (recurringData.payment_schedule && recurringData.payment_schedule.length > 0) {
                        paymentScheduleFromDB = recurringData.payment_schedule.map(payment => ({
                            installment_number: payment.installment_number,
                            date: payment.due_date,
                            amount: payment.amount,
                            status: payment.status,
                            paymentType: payment.installment_number ***REMOVED***= 1 ? 'Upfront Payment' : 
                                       payment.installment_number ***REMOVED***= recurringData.payment_schedule.length ? 'Final Installment' : 'Monthly Installment'
                        }));
                        console.log(`✅ Found ${paymentScheduleFromDB.length} payment schedule entries in database`);
                    } else {
                        console.log(`⚠️ No payment schedule found in database for quotepaymentId: ${quotepaymentId}`);
                    }
                } else {
                    console.log(`⚠️ No record found in database for quotepaymentId: ${quotepaymentId}`);
                }
            }
        } catch (dbError) {
            console.error('❌ Error fetching data from database:', dbError);
            // Continue with email sending even if DB lookup fails
        }

        // Use database customer name if webhook data is invalid or looks like test data
        const finalCustomerName = (Customer_name && Customer_name !***REMOVED*** 'Mary' && Customer_name !***REMOVED*** 'Test Customer') 
            ? Customer_name 
            : customerNameFromDB || Customer_name || 'Sir/Madam';
        
        // console.log('🎯 Final customer name to use:', finalCustomerName);

        // Calculate Installment_amount from first payment in payment_schedule
        let calculatedInstallmentAmount = Installment_amount; // Default to webhook value
        
        if (paymentScheduleFromDB && paymentScheduleFromDB.length > 0) {
            // Use first payment amount from database
            calculatedInstallmentAmount = paymentScheduleFromDB[0].amount;
            console.log(`✅ Using first payment amount from DB: ${calculatedInstallmentAmount}`);
        } else if (Total_After_VAT_Currency && Total_Installments) {
            // Calculate from total and installments as fallback
            calculatedInstallmentAmount = Math.round((Total_After_VAT_Currency / Total_Installments) * 100) / 100;
            console.log(`✅ Calculated installment amount: ${calculatedInstallmentAmount} (${Total_After_VAT_Currency} / ${Total_Installments})`);
        }

        // Prepare email data
        const emailData = {
            Quote_payment_number: quote_payment_number,
            Total_After_VAT_Currency,
            quote_email,
            quotepaymentId,
            paymentLink,
            Installment_amount: calculatedInstallmentAmount, // Use calculated amount
            Total_Installments,
            quotePdf,
            Customer_name: finalCustomerName, // Use the corrected customer name
            opp_owner,
            salesPersonDetails: salesPersonDetails || salesPersonDetailsFromDB,
            installmentSchedule: paymentScheduleFromDB || installmentSchedule, // Use DB data if available, fallback to webhook data
            QuoteId,
            OpportunityId
        };

        // Send the PDF email
        const emailResult = await sendPdfEmail(emailData);

        if (emailResult.success) {
            // console.log(`✅ PDF email sent successfully to ${quote_email}`);
            // console.log(`📧 Message ID: ${emailResult.messageId}`);

            const responseData = {
                success: true,
                message: 'PDF email sent successfully',
                details: {
                    recipient: quote_email,
                    messageId: emailResult.messageId,
                    quotepaymentId,
                    attachments_count: quotePdf.length,
                    timestamp: new Date().toISOString()
                }
            };

            // Log successful operation
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                responseData
            );
            

            return res.status(200).json(responseData);

        } else {
            console.error('❌ Failed to send PDF email:', emailResult.error);

            const responseData = {
                success: false,
                error: 'Failed to send PDF email',
                details: emailResult.error
            };

            // Log the failure
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                responseData
            );
            

            return res.status(500).json(responseData);
        }

    } catch (error) {
        console.error('❌ Error in Salesforce PDF webhook:', error);

        const responseData = {
            success: false,
            error: 'Internal server error',
            details: error.message
        };

        // Log the error
        const logData = Post_Common_DB_Log_Data(
            "/api/salesforce/pdf-webhook",
            req.body || {},
            responseData
        );
        

        return res.status(500).json(responseData);
    }
};

/**
 * Test endpoint for Salesforce PDF webhook
 */
export const testSalesforcePdfWebhook = async (req, res) => {
    try {
        // Sample test data matching the format from Salesforce
        const testData = {
            quote_payment_number: "02620",
            Total_After_VAT_Currency: "AED 525",
            quote_email: "test@example.com", // Change this to a real email for testing
            quotepaymentId: "test-payment-id-123",
            Payment_Link: "https://virtuzone.yeepeey.com/onlinepayment/rAWdu0000004qMbGAI",
            Installment_amount: "AED 525",
            Total_Installments: "12",
            quotePdf: [{
                "pdfContent": "JVBERi0xLjQKJeLjz9MKNCAwIG9iaiA8PC9Db2xvclNwYWNlL0RldmljZUdyYXkvU3VidHlwZS9JbWFnZS9IZWlnaHQgMTA4MC9GaWx0ZXIvRmxhdGVEZWNvZGUvVHlwZS9YT2JqZWN0L1dpZHRoIDIxNzYvTGVuZ3RoIDIzMDMvQml0c1BlckNvbXBvbmVudCA4Pj5zdHJlYW0K...", // Truncated for brevity
                "name": "Q09490",
                "ContentType": "application/pdf"
            }]
        };

        console.log('🧪 Testing Salesforce PDF webhook with sample data');

        // Use the test data to send request to the main handler
        req.body = testData;
        
        return await handleSalesforcePdfWebhook(req, res);

    } catch (error) {
        console.error('❌ Error in test endpoint:', error);
        return res.status(500).json({
            success: false,
            error: 'Test endpoint error',
            details: error.message
        });
    }
};

export default {
    handleSalesforcePdfWebhook,
    testSalesforcePdfWebhook
};
