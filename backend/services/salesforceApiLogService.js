import SalesforceApiLog from '../model/SalesforceApiLogModel.js';

/**
 * Log Salesforce API request and response
 * @param {Object} logData - The data to log
 * @param {string} logData.endpoint - API endpoint
 * @param {string} logData.method - HTTP method
 * @param {Object} logData.requestData - Request payload
 * @param {Object} logData.responseData - Response data
 * @param {number} logData.statusCode - HTTP status code
 * @param {boolean} logData.isSuccess - Success status
 * @param {string} logData.errorMessage - Error message if any
 * @param {number} logData.executionTime - Execution time in milliseconds
 * @param {string} logData.quotepaymentId - Related quote payment ID
 * @param {string} logData.customerId - Related customer ID
 * @param {string} logData.salesAgentToken - Sales agent token
 * @param {string} logData.userAgent - User agent
 * @param {string} logData.ipAddress - IP address
 */
export const logSalesforceApiCall = async (logData) => {
    try {
        console.log('📊 SALESFORCE API LOG - Creating log entry');
        console.log('📊 Log data:', JSON.stringify(logData, null, 2));

        const logEntry = new SalesforceApiLog({
            endpoint: logData.endpoint,
            method: logData.method || 'GET',
            requestData: logData.requestData,
            responseData: logData.responseData,
            statusCode: logData.statusCode,
            isSuccess: logData.isSuccess || false,
            errorMessage: logData.errorMessage,
            executionTime: logData.executionTime,
            quotepaymentId: logData.quotepaymentId,
            customerId: logData.customerId,
            salesAgentToken: logData.salesAgentToken,
            userAgent: logData.userAgent,
            ipAddress: logData.ipAddress
        });

        const savedLog = await logEntry.save();
        console.log('✅ SALESFORCE API LOG - Log entry saved:', savedLog._id);
        return savedLog;

    } catch (error) {
        console.error('❌ SALESFORCE API LOG - Failed to save log entry:', error);
        // Don't throw error to avoid breaking the main flow
        return null;
    }
};

/**
 * Get Salesforce API logs with filtering options
 * @param {Object} filters - Filter options
 * @param {string} filters.endpoint - Filter by endpoint
 * @param {boolean} filters.isSuccess - Filter by success status
 * @param {Date} filters.startDate - Filter from date
 * @param {Date} filters.endDate - Filter to date
 * @param {string} filters.quotepaymentId - Filter by quote payment ID
 * @param {number} filters.limit - Limit number of results
 * @param {number} filters.skip - Skip number of results
 */
export const getSalesforceApiLogs = async (filters = {}) => {
    try {
        console.log('📊 SALESFORCE API LOG - Fetching logs with filters:', filters);

        const query = {};

        // Apply filters
        if (filters.endpoint) {
            query.endpoint = { $regex: filters.endpoint, $options: 'i' };
        }

        if (filters.isSuccess !***REMOVED*** undefined) {
            query.isSuccess = filters.isSuccess;
        }

        if (filters.quotepaymentId) {
            query.quotepaymentId = filters.quotepaymentId;
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }

        const options = {
            limit: filters.limit || 100,
            skip: filters.skip || 0,
            sort: { createdAt: -1 } // Most recent first
        };

        const logs = await SalesforceApiLog.find(query, null, options);
        const totalCount = await SalesforceApiLog.countDocuments(query);

        console.log(`✅ SALESFORCE API LOG - Found ${logs.length} logs (${totalCount} total)`);

        return {
            logs,
            totalCount,
            hasMore: (filters.skip || 0) + logs.length < totalCount
        };

    } catch (error) {
        console.error('❌ SALESFORCE API LOG - Failed to fetch logs:', error);
        throw error;
    }
};

/**
 * Get API call statistics
 */
export const getSalesforceApiStats = async () => {
    try {
        console.log('📊 SALESFORCE API LOG - Generating statistics');

        const stats = await SalesforceApiLog.aggregate([
            {
                $group: {
                    _id: null,
                    totalCalls: { $sum: 1 },
                    successfulCalls: {
                        $sum: { $cond: [{ $eq: ['$isSuccess', true] }, 1, 0] }
                    },
                    failedCalls: {
                        $sum: { $cond: [{ $eq: ['$isSuccess', false] }, 1, 0] }
                    },
                    avgExecutionTime: { $avg: '$executionTime' }
                }
            }
        ]);

        const endpointStats = await SalesforceApiLog.aggregate([
            {
                $group: {
                    _id: '$endpoint',
                    count: { $sum: 1 },
                    successRate: {
                        $avg: { $cond: [{ $eq: ['$isSuccess', true] }, 1, 0] }
                    },
                    avgExecutionTime: { $avg: '$executionTime' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const result = {
            overall: stats[0] || {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                avgExecutionTime: 0
            },
            byEndpoint: endpointStats
        };

        console.log('✅ SALESFORCE API LOG - Statistics generated');
        return result;

    } catch (error) {
        console.error('❌ SALESFORCE API LOG - Failed to generate statistics:', error);
        throw error;
    }
};

/**
 * Helper function to create a log wrapper for API calls
 * @param {string} endpoint - The API endpoint
 * @param {Function} apiCall - The actual API call function
 * @param {Object} options - Additional options
 */
export const withSalesforceLogging = (endpoint, apiCall, options = {}) => {
    return async (...args) => {
        const startTime = Date.now();
        const logData = {
            endpoint,
            method: options.method || 'GET',
            requestData: options.logRequest ? args : undefined,
            quotepaymentId: options.quotepaymentId,
            customerId: options.customerId,
            salesAgentToken: options.salesAgentToken,
            userAgent: options.userAgent,
            ipAddress: options.ipAddress
        };

        try {
            console.log(`🔄 SALESFORCE API - Starting call to ${endpoint}`);
            const result = await apiCall(...args);
            
            const executionTime = Date.now() - startTime;
            
            await logSalesforceApiCall({
                ...logData,
                responseData: options.logResponse ? result : { status: 'success' },
                statusCode: 200,
                isSuccess: true,
                executionTime
            });

            console.log(`✅ SALESFORCE API - Call to ${endpoint} completed in ${executionTime}ms`);
            return result;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            await logSalesforceApiCall({
                ...logData,
                responseData: options.logResponse ? { error: error.message } : undefined,
                statusCode: error.status || 500,
                isSuccess: false,
                errorMessage: error.message,
                executionTime
            });

            console.error(`❌ SALESFORCE API - Call to ${endpoint} failed after ${executionTime}ms:`, error.message);
            throw error;
        }
    };
};
