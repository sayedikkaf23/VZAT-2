# Content Security Policy (CSP) Fix for Add Card Feature

## Problem
The AFS payment widget script is being blocked by Content Security Policy (CSP):
```
Refused to load the script 'https://p11.techlab-cdn.com/e/65319_1825172608.js' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

## Solutions

### Option 1: Update CSP Headers (Recommended)
Add the AFS domains to your CSP policy. Update your server configuration or meta tags:

```html
<!-- In index.html or via HTTP headers -->
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com 
  https://*.techlab-cdn.com 
  https://static.oppwa.com;
  
  connect-src 'self' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com 
  https://*.techlab-cdn.com;
  
  frame-src 'self' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com;
">
```

### Option 2: Server-Side CSP Configuration
If using Nginx, add to your server config:
```nginx
add_header Content-Security-Policy "
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com 
  https://*.techlab-cdn.com 
  https://static.oppwa.com;
  
  connect-src 'self' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com 
  https://*.techlab-cdn.com;
  
  frame-src 'self' 
  https://eu-test.oppwa.com 
  https://p11.techlab-cdn.com;
";
```

### Option 3: Angular Configuration
Update your `angular.json` to set CSP-friendly build options:

```json
{
  "build": {
    "options": {
      "allowedCommonJsDependencies": ["oppwa"],
      "buildOptimizer": false
    }
  }
}
```

## Testing Steps

1. **Apply CSP Fix**: Choose one of the options above
2. **Clear Browser Cache**: Hard refresh (Ctrl+F5)
3. **Test Add Card Flow**:
   - Go to `/saved-card/add-card`
   - Check browser console for CSP errors
   - Verify AFS script loads successfully
   - Complete card registration

## Backend Logging Enhancement

The backend is already configured with comprehensive logging. Check these log messages:

```bash
# Success indicators
🔄 Preparing AFS checkout for card registration...
📧 Customer email: [email]
🌐 Base URL for redirects: https://vzatnew.yeepeey.com
✅ AFS checkout prepared successfully
🔑 Checkout ID: [checkout-id]

# After card registration
✅ Registration callback handled successfully
🎉 Card registration successful!
```

## Frontend Logging Enhancement

Added comprehensive logging to track the full flow:

```javascript
// Initialization
🚀 AddCardComponent initialized
🌐 Current URL: [url]
📋 Query params: [params]

// Registration process
🔄 Initializing card registration for: [email]
✅ Registration preparation successful
🔄 Loading AFS script: [script-url]

// Callback handling
🔄 Detected AFS callback with resourcePath: [path]
🔑 Extracted checkout ID from callback: [id]
✅ Registration callback handled successfully
🎉 Card registration successful! Redirecting to saved cards page...
```

## Common Issues and Solutions

### 1. CSP Blocking Script
**Problem**: External scripts blocked by CSP
**Solution**: Update CSP headers as shown above

### 2. Form Element Not Found
**Problem**: AFS widget can't find form element
**Solution**: Added better DOM checking and retries

### 3. Navigation After Success
**Problem**: Not redirecting to saved cards page
**Solution**: Enhanced navigation with proper error handling

### 4. Redirect URL Mismatch
**Problem**: Backend configured for wrong URL path
**Solution**: Updated backend to use `/saved-card/add-card`

## Production Deployment Checklist

- [ ] Update CSP headers to allow AFS domains
- [ ] Test card registration flow end-to-end
- [ ] Verify success message displays correctly
- [ ] Confirm redirect to saved cards page works
- [ ] Check backend logs for any errors
- [ ] Test with different card types

## Debug Commands

```bash
# Check current CSP policy
curl -I https://vzatnew.yeepeey.com

# Test backend API
curl -X POST https://your-backend.com/api/add-card/prepare \
  -H "Content-Type: application/json" \
  -d '{"customerEmail":"test@example.com"}'

# Monitor backend logs
tail -f /path/to/backend/logs
```
