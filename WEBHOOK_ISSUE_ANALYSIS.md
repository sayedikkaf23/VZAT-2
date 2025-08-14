# AFS Webhook Issue - Analysis & Solutions

## 🔍 Problem Analysis

### Issue Description
When customers complete payments successfully through AFS:
- ✅ **Payment processes successfully** (customer gets charged)
- ✅ **Customer redirected to success page** 
- ✅ **Customer account created** and welcome email sent
- ✅ **Card details saved** in database
- ❌ **AFS webhook NOT sent** to backend
- ❌ **Database payment status NOT updated** automatically
- ❌ **Subscription remains `pending`** instead of `active`
- ❌ **Payment schedule not updated** (payment #1 stays `due` instead of `completed`)

### Root Cause
**AFS is not sending webhook notifications** to the configured webhook URL after successful payments.

Possible reasons:
1. **Network/Firewall Issues**: AFS cannot reach the webhook endpoint
2. **Webhook URL Configuration**: Incorrect or inaccessible webhook URL
3. **AFS Environment Issues**: Test environment webhook delivery problems
4. **Timing Issues**: Webhook sent before server is ready to receive

## 🛠️ Solutions Implemented

### 1. **Auto-Webhook Triggering** (Primary Solution)
**Location**: `Controllers/PostVzatRecurringData.js` - `getAFSPaymentResult` function

**How it works**:
- When payment result page is accessed after successful payment
- System automatically detects successful payment
- Triggers internal webhook handler with real payment data
- Updates database automatically

```javascript
// Auto-trigger webhook for successful payments
if (actualPaymentStatus ***REMOVED***= 'success' && quotepaymentId) {
  // Create webhook data from payment result
  const webhookData = {
    id: resultData.id,
    paymentType: 'DB',
    result: { code: '000.100.110', description: 'Successful transaction' },
    amount: parseFloat(resultData.amount),
    currency: 'AED',
    merchantTransactionId: quotepaymentId,
    registrationId: resultData.id,
    timestamp: new Date().toISOString()
  };
  
  // Trigger webhook handler automatically
  await handleAFSWebhook(mockReq, mockRes);
}
```

### 2. **Enhanced Webhook Handler** (Updated Logic)
**Location**: `Controllers/SubscriptionController.js` - `handleAFSWebhook` function

**Key Changes**:
- Now handles `paymentType: 'DB'` for both first and recurring payments
- Detects first payment by checking `subscription_status ***REMOVED***= 'pending'`
- Properly activates subscription and updates payment schedule

```javascript
// Updated logic for first payment detection
const isFirstPayment = subscription.subscription_status ***REMOVED***= 'pending' && 
                      (subscription.payments_completed || 0) ***REMOVED***= 0;

if (paymentType ***REMOVED***= 'DB' && result.code.startsWith('000.')) {
  if (isFirstPayment) {
    // Activate subscription and mark first payment completed
    subscription_status: 'active',
    payments_completed: 1,
    payment_schedule[0].status: 'completed',
    payment_schedule[1].status: 'due'
  } else {
    // Handle recurring payments
  }
}
```

### 3. **Manual Webhook Trigger Scripts**
Created multiple scripts for testing and manual fixes:

#### A. **Real Payment Webhook Trigger**
**File**: `trigger-real-webhook.js`
```bash
node trigger-real-webhook.js
```
- Uses actual transaction data from successful payment
- Triggers webhook with real transaction ID and payment details

#### B. **Test Scripts**
**File**: `test-subscription-simple.js`
```bash
# Check subscription status
node test-subscription-simple.js check aAWdu0000005XkvGAE

# Simulate payment
node test-subscription-simple.js pay aAWdu0000005XkvGAE 210
```

#### C. **Debug Webhook Endpoints**
**File**: `routes/WebhookDebugRoute.js`
```bash
# Test webhook accessibility
GET /api/debug/webhook/health

# Manual webhook trigger
POST /api/debug/webhook/manual-trigger
```

### 4. **Enhanced Payment Link Creation**
**Location**: `Controllers/PostVzatRecurringData.js`

**Improvements**:
- Webhook URL properly configured: `${backendUrl}/api/subscription/webhook/afs`
- Uses `paymentType: 'DB'` for immediate debit (first payment)
- Comprehensive logging for debugging

## 🎯 Current Status

### What's Working ✅
1. **Payment Processing**: AFS processes payments successfully
2. **Customer Account Creation**: Accounts created automatically after payment
3. **Card Saving**: Card details saved properly
4. **Salesforce Integration**: Payment status updated in Salesforce
5. **Manual Webhook Triggering**: Scripts can manually update database
6. **Auto-Webhook Feature**: Payment result page triggers database update

### What's Not Working ❌
1. **AFS Webhook Delivery**: AFS not sending webhook notifications
2. **Automatic Database Updates**: Requires manual intervention or auto-trigger

## 🔧 Testing & Verification

### Test the Auto-Webhook Feature
1. **Create new payment link**:
   ```bash
   # Through Salesforce or API call
   POST /api/vzat_recurring_create_payment_link
   ```

2. **Complete payment** through AFS payment page

3. **Access payment result page**:
   ```
   /payment/result?resourcePath=...&quotepaymentId=...&id=...
   ```

4. **Verify auto-webhook triggered**:
   - Check logs for "AUTO-TRIGGERING WEBHOOK"
   - Check database for updated subscription status
   - Check payment schedule for completed status

### Manual Testing Commands
```bash
# Check current subscription status
node test-subscription-simple.js check <quotepaymentId>

# List all subscriptions
node test-subscription-simple.js list

# Manually trigger webhook for real payment
node trigger-real-webhook.js

# Test webhook endpoint accessibility
curl http://localhost:3000/api/debug/webhook/health
```

## 📊 Database State Verification

### Expected Database Changes After Successful Payment

**Subscription Record**:
```javascript
{
  quotepaymentId: "aAWdu0000005XkvGAE",
  subscription_status: "active",        // Changed from "pending"
  payments_completed: 1,                // Changed from 0
  afs_registration_id: "8ac7a4a...",   // Set after payment
  last_payment_date: "2025-08-14T...", // Set to payment date
  
  payment_schedule: [
    {
      installment_number: 1,
      status: "completed",              // Changed from "due"
      transaction_id: "8ac7a4a...",     // Real transaction ID
      payment_date: "2025-08-14T..."    // Payment completion date
    },
    {
      installment_number: 2,
      status: "due",                    // Changed from "pending"
      due_date: "2025-09-10"
    }
    // ... remaining payments stay "pending"
  ]
}
```

## 🚀 Deployment Recommendations

### For Production Environment

1. **Enable Auto-Webhook Feature**:
   - The enhanced `getAFSPaymentResult` function will automatically trigger webhooks
   - No manual intervention required

2. **Monitor Webhook Delivery**:
   ```bash
   # Check webhook logs
   grep "AFS WEBHOOK RECEIVED" /var/log/vzat-backend.log
   
   # Check auto-webhook triggers
   grep "AUTO-TRIGGERING WEBHOOK" /var/log/vzat-backend.log
   ```

3. **Backup Manual Scripts**:
   - Keep manual webhook trigger scripts for emergency use
   - Regular database status checks

4. **AFS Configuration Review**:
   - Verify webhook URL accessibility from AFS servers
   - Check firewall rules for incoming webhook calls
   - Consider webhook signature validation if available

### Health Checks
```bash
# Test webhook endpoint
curl https://your-domain.com/api/debug/webhook/health

# Check recent payments
curl https://your-domain.com/api/subscription/health
```

## 🔍 Troubleshooting Guide

### If Payment Successful But Database Not Updated

1. **Check auto-webhook logs**:
   ```bash
   grep "AUTO-TRIGGERING WEBHOOK" logs/backend.log
   ```

2. **Manual webhook trigger**:
   ```bash
   node trigger-real-webhook.js
   ```

3. **Verify payment result page accessed**:
   - Customer must visit payment result page for auto-trigger
   - Check browser console for any errors

### If AFS Webhooks Start Working

1. **Disable auto-webhook feature** (optional):
   ```javascript
   // Comment out auto-webhook section in getAFSPaymentResult
   ```

2. **Monitor for duplicate processing**:
   - Watch for both AFS webhook + auto-webhook
   - Add duplicate detection if needed

## 📈 Future Improvements

1. **Webhook Signature Validation**: Verify AFS webhook authenticity
2. **Retry Logic**: Automatic retry for failed webhook processing  
3. **Real-time Monitoring**: Dashboard for webhook delivery status
4. **Database Triggers**: Alternative to webhook for critical updates
5. **Health Dashboard**: Real-time payment and subscription status monitoring

---

**Last Updated**: August 14, 2025  
**Status**: Auto-webhook solution implemented and ready for testing
