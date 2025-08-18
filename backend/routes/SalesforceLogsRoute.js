import express from 'express';
import { 
    getSalesforceApiLogsController, 
    getSalesforceApiStatsController, 
    getSalesforceApiLogByIdController 
} from '../Controllers/SalesforceApiLogController.js';

const router = express.Router();

/**
 * @route GET /api/salesforce-logs
 * @description Get Salesforce API logs with filtering options
 * @query endpoint - Filter by endpoint (optional)
 * @query isSuccess - Filter by success status: true/false (optional)  
 * @query startDate - Filter from date YYYY-MM-DD (optional)
 * @query endDate - Filter to date YYYY-MM-DD (optional)
 * @query quotepaymentId - Filter by quote payment ID (optional)
 * @query limit - Number of results to return, default 50 (optional)
 * @query skip - Number of results to skip for pagination, default 0 (optional)
 */
router.get('/', getSalesforceApiLogsController);

/**
 * @route GET /api/salesforce-logs/stats
 * @description Get Salesforce API usage statistics
 */
router.get('/stats', getSalesforceApiStatsController);

/**
 * @route GET /api/salesforce-logs/:id
 * @description Get a specific Salesforce API log by ID
 * @param id - Log ID
 */
router.get('/:id', getSalesforceApiLogByIdController);

export default router;
