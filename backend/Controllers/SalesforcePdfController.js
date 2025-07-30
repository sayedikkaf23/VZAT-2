import { sendPdfEmail } from '../services/emailService.js';
import Post_Common_DB_Log_Data from './PostCommonDBLogData.js';

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
            quotePdf
        } = req.body;

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
            console.log(logData);

            return res.status(400).json({
                success: false,
                error: errorMessage,
                received_fields: Object.keys(req.body)
            });
        }

        // Validate quote PDF format
        if (!Array.isArray(quotePdf) || quotePdf.length === 0) {
            const errorMessage = 'quotePdf must be a non-empty array';
            console.error('❌ PDF validation error:', errorMessage);
            
            const logData = Post_Common_DB_Log_Data(
                "/api/salesforce/pdf-webhook",
                req.body,
                { success: false, error: errorMessage }
            );
            console.log(logData);

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
                console.log(logData);

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
            console.log(logData);

            return res.status(400).json({
                success: false,
                error: errorMessage
            });
        }

        console.log(`📧 Preparing to send PDF email to: ${quote_email}`);
        console.log(`📄 Number of PDFs to attach: ${quotePdf.length}`);

        // Prepare email data
        const emailData = {
            quote_payment_number,
            Total_After_VAT_Currency,
            quote_email,
            quotepaymentId,
            paymentLink,
            Installment_amount,
            Total_Installments,
            quotePdf
        };

        // Send the PDF email
        const emailResult = await sendPdfEmail(emailData);

        if (emailResult.success) {
            console.log(`✅ PDF email sent successfully to ${quote_email}`);
            console.log(`📧 Message ID: ${emailResult.messageId}`);

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
            console.log(logData);

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
            console.log(logData);

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
        console.log(logData);

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
