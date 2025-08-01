import express from 'express';
import { handleSalesforcePdfWebhook, testSalesforcePdfWebhook } from '../Controllers/SalesforcePdfController.js';
import Post_Common_DB_Log_Data from '../Controllers/PostCommonDBLogData.js';

const router = express.Router();

/**
 * @route POST /api/salesforce/pdf-webhook
 * @description Handle Salesforce PDF webhook - receive quote data with PDF and send email
 * @access Public (for Salesforce to call)
 */
router.post('/pdf-webhook', handleSalesforcePdfWebhook);

/**
 * @route POST /api/salesforce/test-pdf-webhook
 * @description Test endpoint for Salesforce PDF webhook functionality
 * @access Public (for testing)
 */
router.post('/test-pdf-webhook', testSalesforcePdfWebhook);

/**
 * @route GET /api/salesforce/health
 * @description Health check endpoint for Salesforce integration
 * @access Public
 */
router.get('/health', (req, res) => {
    const responseData = {
        success: true,
        message: 'Salesforce integration service is healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            pdf_webhook: '/api/salesforce/pdf-webhook',
            test_webhook: '/api/salesforce/test-pdf-webhook'
        }
    };
    
    // Log health check to database
    Post_Common_DB_Log_Data('/api/salesforce/health', req.query, responseData);
    
    res.status(200).json(responseData);
});

export default router;
