# Add Card Error Fix Documentation

## Problem Description

When trying to add a new card, users encounter this error:

```html
<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
    </head>
    <body>
        <p>Payment cannot be completed because no valid URL to redirect your browser after payment was defined. Please click your browser's back button.</p>
        <p>Please provide support with the following information:</p>
        <p>ndc: 4BB28D636E07B6CC98A5B18281BE7B93.uat01-vm-tx02</p>
        <p>date: 2025-08-18 20:29:53+0000</p>
    </body>
</html>
```

## Root Cause

The error occurs because the AFS (Payment Gateway) checkout request was missing the required `shopperResultUrl` parameter, which tells the payment gateway where to redirect the user after the card registration process.

## Solution Implemented

### 1. Backend Changes (`AddCardController.js`)

**Added Missing Parameters:**
```javascript
// Before (Missing redirect URL)
const checkoutData = new URLSearchParams({
  entityId: AFS_CONFIG.entityId,
  testMode: AFS_CONFIG.testMode,
  createRegistration: 'true',
  'customer.email': customerEmail
});

// After (With proper redirect URL)
const checkoutData = new URLSearchParams({
  entityId: AFS_CONFIG.entityId,
  testMode: AFS_CONFIG.testMode,
  createRegistration: 'true',
  'customer.email': customerEmail,
  'shopperResultUrl': `${baseUrl}/CustomerPortal/add-card?resourcePath={{resourcePath}}`,
  'defaultPaymentMethod': 'CARD',
  'recurringType': 'INITIAL'
});
```

**Enhanced Logging:**
- Added comprehensive logging for debugging
- Logs the checkout data being sent to AFS
- Logs the full AFS response
- Logs the base URL being used for redirects

### 2. Frontend Changes (`add-card.component.ts`)

**Enhanced Error Handling:**
- Added URL parameter checking for errors
- Better extraction of checkout ID from resource path
- More detailed logging for debugging
- Added origin and URL logging

**Improved Callback Handling:**
- Check for error parameters in URL first
- Better error messages for users
- Enhanced logging for troubleshooting

### 3. Configuration Changes (`config.env.js`)

**Added Frontend URL Configuration:**
```javascript
development: {
  FRONTEND_URL: 'http://localhost:4200',
  // ... other config
},
production: {
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://vzatnew.yeepeey.com',
  // ... other config
}
```

## Testing and Debugging

### Debug Script
Created `test-add-card-debug.js` to test the add card functionality:

```bash
# Run the debug script
cd backend
node test-add-card-debug.js
```

### Manual Testing Steps

1. **Check Backend Logs:**
   ```bash
   # Start backend with detailed logging
   cd backend
   npm start
   ```

2. **Check Frontend Network Tab:**
   - Open browser developer tools
   - Go to Network tab
   - Try adding a card
   - Check the API calls and responses

3. **Verify Configuration:**
   - Ensure `FRONTEND_URL` is correctly set
   - Verify AFS credentials are valid
   - Check that redirect URLs are accessible

### Key Log Messages to Look For

**Success Indicators:**
```
🔄 Preparing AFS checkout for card registration...
📧 Customer email: test@example.com
🌐 Base URL for redirects: http://localhost:4200
📋 Checkout data being sent to AFS: { ... }
✅ AFS checkout prepared successfully
🔑 Checkout ID: [checkout-id]
```

**Error Indicators:**
```
❌ Error preparing AFS checkout: [error details]
❌ Could not extract checkout ID from resourcePath
❌ Error in callback URL: [error]
```

## Production Deployment

### Environment Variables
Set these environment variables in production:

```bash
FRONTEND_URL=https://vzatnew.yeepeey.com
AFS_BASE_URL=https://eu-prod.oppwa.com  # Use production URL
AFS_ENTITY_ID=your_production_entity_id
AFS_AUTHORIZATION=Bearer your_production_auth_token
```

### Verification Steps

1. Test the add card flow in production
2. Check that redirect URLs work correctly
3. Verify error handling and user feedback
4. Monitor logs for any issues

## References

- [AFS API Documentation](https://docs.oppwa.com/)
- [Checkout Parameters Reference](https://docs.oppwa.com/reference/parameters)
- [Registration Parameters](https://docs.oppwa.com/tutorials/integration-guide/registration)

## Troubleshooting

### Common Issues

1. **"No valid URL" Error:**
   - Check `shopperResultUrl` is included in checkout request
   - Verify frontend URL is accessible
   - Ensure URL format is correct

2. **Callback Not Working:**
   - Check resource path extraction
   - Verify checkout ID matching
   - Check frontend routing for `/CustomerPortal/add-card`

3. **Configuration Issues:**
   - Verify environment variables
   - Check config.env.js settings
   - Ensure AFS credentials are valid

### Debug Commands

```bash
# Test backend connectivity
curl -X POST http://localhost:3000/api/add-card/prepare \
  -H "Content-Type: application/json" \
  -d '{"customerEmail":"test@example.com"}'

# Check frontend build
cd frontend
npm run build

# Check backend logs
cd backend
npm start
```
