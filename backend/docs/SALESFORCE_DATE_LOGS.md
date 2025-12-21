# Salesforce Date Logs - Second Payment Investigation

## Issue Summary

When processing the **second payment** (or any recurring payment), the system is sending **today's date** to Salesforce instead of the actual `next_charge_date`.

### Code Location

1. **SubscriptionController.js** (lines 580-582):
   - Correctly passes `nextDueDate: subscription.next_charge_date` to Salesforce

2. **salesforceService.js** (lines 143-149):
   - **ISSUE**: Ignores the `nextDueDate` parameter and always uses today's date
   - Always sets `Current_due_date` to today's date in format `YYYY-MM-DD`

## What Date is Actually Sent?

The date sent to Salesforce is **always today's date** in format `YYYY-MM-DD`, regardless of what `nextDueDate` is passed in.

Example:
- If payment processed on: `2024-01-15`
- And `next_charge_date` is: `2024-02-15`
- **Date sent to Salesforce**: `2024-01-15` (today) ❌

## How to Check Logs in Database

### Option 1: Using the Script

Run the provided script to check logs:

```bash
# Check all recent logs
node scripts/check-salesforce-date-logs.js

# Check logs for a specific quotepaymentId
node scripts/check-salesforce-date-logs.js "QP-12345"
```

### Option 2: Direct MongoDB Queries

Connect to MongoDB and run these queries:

#### Find all Salesforce API logs for a specific quotepaymentId:

```javascript
// Connect to MongoDB
use your_database_name

// Find logs for a specific quotepaymentId
db.salesforce_api_logs.find({
  quotepaymentId: "YOUR_QUOTE_PAYMENT_ID",
  endpoint: { $regex: /updateQuotePaymentStatus/i },
  method: "PUT"
}).sort({ createdAt: -1 }).limit(10)
```

#### Find logs with date information:

```javascript
// Find recent logs and show the Current_due_date field
db.salesforce_api_logs.find({
  endpoint: { $regex: /updateQuotePaymentStatus/i },
  method: "PUT",
  "requestData.Current_due_date": { $exists: true }
}).sort({ createdAt: -1 }).limit(20).forEach(log => {
  print(`\nQuotePaymentId: ${log.quotepaymentId}`);
  print(`Date: ${log.createdAt}`);
  print(`Current_due_date sent: ${log.requestData.Current_due_date}`);
  print(`Success: ${log.isSuccess}`);
  print('---');
})
```

#### Find second payment logs specifically:

```javascript
// To identify second payments, you need to cross-reference with the subscription data
// First, find the subscription:
db.vzat_recurring_data.findOne({ quotepaymentId: "YOUR_QUOTE_PAYMENT_ID" })

// Then find logs around the time when payments_completed = 2
db.salesforce_api_logs.find({
  quotepaymentId: "YOUR_QUOTE_PAYMENT_ID",
  endpoint: { $regex: /updateQuotePaymentStatus/i },
  method: "PUT",
  isSuccess: true
}).sort({ createdAt: -1 })
```

#### Get all date-related fields from logs:

```javascript
db.salesforce_api_logs.find({
  endpoint: { $regex: /updateQuotePaymentStatus/i },
  method: "PUT"
}).sort({ createdAt: -1 }).limit(10).map(log => ({
  quotepaymentId: log.quotepaymentId,
  createdAt: log.createdAt,
  current_due_date_sent: log.requestData?.Current_due_date,
  success: log.isSuccess,
  statusCode: log.statusCode
}))
```

### Option 3: Using the API Endpoint

The application has an endpoint to query Salesforce logs:

```bash
# Get all logs
GET /api/salesforce-logs

# Get logs for a specific quotepaymentId
GET /api/salesforce-logs?quotepaymentId=YOUR_QUOTE_PAYMENT_ID

# Get logs with date range
GET /api/salesforce-logs?startDate=2024-01-01&endDate=2024-01-31

# Get specific log by ID
GET /api/salesforce-logs/:id
```

## Database Collection Structure

The logs are stored in the `salesforce_api_logs` collection with the following structure:

```javascript
{
  _id: ObjectId,
  endpoint: "https://instance.salesforce.com/services/apexrest/updateQuotePaymentStatus",
  method: "PUT",
  requestData: {
    QuotePaymentId: "QP-12345",
    Status: true,
    Paid_Amount: 1000,
    Transaction_Number: "TXN-123",
    Message: "Transaction completed successfully",
    Current_due_date: "2024-01-15",  // ← This is the date sent to Salesforce
    Payment_Type: "Online_payment",
    Qp_number: "PI-12345"
  },
  responseData: { ... },
  statusCode: 200,
  isSuccess: true,
  errorMessage: null,
  executionTime: 1234,
  quotepaymentId: "QP-12345",
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z")
}
```

## What to Look For

When checking logs for second payments:

1. **Check `requestData.Current_due_date`**: This shows what date was sent to Salesforce
2. **Compare with actual `next_charge_date`**: Query the `vzat_recurring_data` collection to get the actual next charge date
3. **Check timestamps**: Look at `createdAt` to see when the payment was processed

## Fix Required

To fix this issue, modify `salesforceService.js` to use the `nextDueDate` parameter when provided:

```javascript
// Instead of always using today's date:
const formattedNextDueDate = nextDueDate 
  ? new Date(nextDueDate).toISOString().slice(0, 10)
  : (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    })();
```
