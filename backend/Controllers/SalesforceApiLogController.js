import { getSalesforceApiLogs, getSalesforceApiStats } from '../services/salesforceApiLogService.js';
import SalesforceApiLog from '../model/SalesforceApiLogModel.js';

/**
 * Get Salesforce API logs with filtering
 */
export const getSalesforceApiLogsController = async (req, res) => {
    try {
        console.log('📊 Getting Salesforce API logs...');
        console.log('Query parameters:', req.query);

        const {
            endpoint,
            isSuccess,
            startDate,
            endDate,
            quotepaymentId,
            limit = 50,
            skip = 0
        } = req.query;

        // Parse isSuccess parameter
        let successFilter;
        if (isSuccess ***REMOVED***= 'true') successFilter = true;
        else if (isSuccess ***REMOVED***= 'false') successFilter = false;

        const filters = {
            endpoint,
            isSuccess: successFilter,
            startDate,
            endDate,
            quotepaymentId,
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => 
            filters[key] ***REMOVED***= undefined && delete filters[key]
        );

        const result = await getSalesforceApiLogs(filters);

        res.status(200).json({
            success: true,
            data: result.logs,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
            filters: filters,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting Salesforce API logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve Salesforce API logs',
            message: error.message
        });
    }
};

/**
 * Get Salesforce API statistics
 */
export const getSalesforceApiStatsController = async (req, res) => {
    try {
        console.log('📊 Getting Salesforce API statistics...');

        const stats = await getSalesforceApiStats();

        res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting Salesforce API statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve Salesforce API statistics',
            message: error.message
        });
    }
};

/**
 * Get a specific Salesforce API log by ID
 */
export const getSalesforceApiLogByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📊 Getting Salesforce API log by ID: ${id}`);

        const log = await SalesforceApiLog.findById(id);

        if (!log) {
            return res.status(404).json({
                success: false,
                error: 'Salesforce API log not found',
                message: `No log found with ID: ${id}`
            });
        }

        res.status(200).json({
            success: true,
            data: log,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Error getting Salesforce API log by ID ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve Salesforce API log',
            message: error.message
        });
    }
};
