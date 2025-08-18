import mongoose from "mongoose";

const Schema = mongoose.Schema;

const salesforceApiLogSchema = new Schema({
    endpoint: {
        type: String,
        required: true,
        description: "The API endpoint that was called"
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        description: "HTTP method used"
    },
    requestData: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        description: "Request payload/parameters sent to Salesforce"
    },
    responseData: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        description: "Response received from Salesforce"
    },
    statusCode: {
        type: Number,
        required: false,
        description: "HTTP status code of the response"
    },
    isSuccess: {
        type: Boolean,
        required: true,
        default: false,
        description: "Whether the API call was successful"
    },
    errorMessage: {
        type: String,
        required: false,
        description: "Error message if the API call failed"
    },
    executionTime: {
        type: Number,
        required: false,
        description: "Time taken for the API call in milliseconds"
    },
    quotepaymentId: {
        type: String,
        required: false,
        description: "Related quote payment ID if applicable"
    },
    customerId: {
        type: String,
        required: false,
        description: "Related customer ID if applicable"
    },
    salesAgentToken: {
        type: String,
        required: false,
        description: "Sales agent token used in the request"
    },
    userAgent: {
        type: String,
        required: false,
        description: "User agent of the client making the request"
    },
    ipAddress: {
        type: String,
        required: false,
        description: "IP address of the client"
    }
}, {
    timestamps: true, // This automatically adds createdAt and updatedAt fields
    collection: 'salesforce_api_logs'
});

// Create indexes for better query performance
salesforceApiLogSchema.index({ createdAt: -1 }); // For date-based queries
salesforceApiLogSchema.index({ endpoint: 1 }); // For endpoint-based queries
salesforceApiLogSchema.index({ quotepaymentId: 1 }); // For quote payment tracking
salesforceApiLogSchema.index({ isSuccess: 1 }); // For success/failure analysis
salesforceApiLogSchema.index({ statusCode: 1 }); // For status code analysis

const SalesforceApiLog = mongoose.model('SalesforceApiLog', salesforceApiLogSchema);

export default SalesforceApiLog;
