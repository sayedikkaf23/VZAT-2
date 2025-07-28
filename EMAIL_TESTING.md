# Email Testing Documentation

## Overview
The VZAT system now includes email notifications for:
1. **Subscription Completion** - Sent to business team when all installments are paid
2. **Payment Failures** - Sent to operations team when recurring payments fail

## Configuration
- **Sender Email**: workerappzpayments@gmail.com
- **Business Team**: saeedikkaf@gmail.com
- **Operations Team**: saeedikkaf@gmail.com

## Testing Endpoints

### 1. Test Email Configuration
**Endpoint**: `POST /api/subscription/test/email-config`
**Purpose**: Verify that email service is working
**Body**: None required

```bash
curl -X POST http://localhost:3000/api/subscription/test/email-config
```

### 2. Test Subscription Completion Email
**Endpoint**: `POST /api/subscription/test/completion-email`
**Purpose**: Test the email sent when subscription is completed
**Body**:
```json
{
  "quotepaymentId": "test-completion-001"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/subscription/test/completion-email \
  -H "Content-Type: application/json" \
  -d '{"quotepaymentId": "test-completion-001"}'
```

### 3. Test Payment Failure Email
**Endpoint**: `POST /api/subscription/test/failure-email`
**Purpose**: Test the email sent when payment fails
**Body**:
```json
{
  "quotepaymentId": "test-failure-001"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/subscription/test/failure-email \
  -H "Content-Type: application/json" \
  -d '{"quotepaymentId": "test-failure-001"}'
```

## Testing with Postman

### 1. Email Configuration Test
- **Method**: POST
- **URL**: `http://localhost:3000/api/subscription/test/email-config`
- **Headers**: None required
- **Body**: None

### 2. Subscription Completion Email Test
- **Method**: POST
- **URL**: `http://localhost:3000/api/subscription/test/completion-email`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "quotepaymentId": "test-subssz-2025-001"
  }
  ```

### 3. Payment Failure Email Test
- **Method**: POST
- **URL**: `http://localhost:3000/api/subscription/test/failure-email`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "quotepaymentId": "test-subssz-2025-001"
  }
  ```

## Expected Responses

### Success Response:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "unique-message-id"
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "Detailed error message"
}
```

## Troubleshooting

### Common Issues:

1. **Gmail Authentication Error**
   - Ensure the sender email and password are correct
   - Gmail may require "App Passwords" instead of regular password
   - Check if 2FA is enabled on the Gmail account

2. **Network Issues**
   - Verify internet connection
   - Check if firewall is blocking SMTP connections

3. **Email Not Received**
   - Check spam/junk folder
   - Verify recipient email address
   - Check Gmail's sent items to confirm sending

4. **Salesforce API Error 405 (Method Not Allowed)**
   - This error occurs when using POST instead of PUT method
   - **Fix**: The Salesforce API expects PUT requests, not POST
   - **Solution**: Update `salesforceService.js` to use `axios.put()` instead of `axios.post()`

### Debug Steps:

1. **Test basic email config first**:
   ```bash
   curl -X POST http://localhost:3000/api/subscription/test/email-config
   ```

2. **Check console logs** for detailed error messages

3. **Verify Gmail settings**:
   - Login to workerappzpayments@gmail.com
   - Check if "Less secure app access" is enabled (if needed)
   - Consider using App Passwords for better security

## Integration with Real System

The email notifications are automatically triggered when:

1. **Subscription Completed**: 
   - When `payments_completed >= InstallmentLeft`
   - In webhook handler (`handleAFSWebhook`)
   - In cron job processing

2. **Payment Failed**:
   - When AFS returns error codes
   - In webhook handler for failed payments
   - In cron job when payment processing throws errors

## Production Considerations

1. **Email Rate Limits**: Gmail has sending limits
2. **Error Handling**: All email functions include try-catch blocks
3. **Async Processing**: Emails don't block payment processing
4. **Logging**: All email attempts are logged to console

## Security Notes

- Email credentials are in the code (for testing)
- In production, move to environment variables
- Consider using Gmail App Passwords
- Monitor for email delivery failures
