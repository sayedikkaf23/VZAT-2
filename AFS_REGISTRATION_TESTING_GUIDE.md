# AFS Card Registration - Testing Guide

## Issue Resolution Summary

✅ **FIXED: Authentication Issues**
- AFS API authentication is working correctly
- All API endpoints are accessible and functional
- Error 800.900.300 was caused by timing/flow issues, not authentication

✅ **FIXED: URL Configuration Issues**
- Backend now sets correct shopperResultUrl pointing to frontend
- Frontend form action now matches the shopperResultUrl
- Callback URL parsing handles both /registration and /payment endpoints

✅ **FIXED: Integration Flow Issues**
- Proper standalone registration setup (no payment parameters)
- Correct widget script loading sequence
- Enhanced error handling and retry logic

## What Was The Problem?

The `800.900.300 - user authorization failed` error was occurring because:

1. **Wrong Callback URL**: The form action was pointing to a backend endpoint instead of the frontend URL
2. **Premature Status Checks**: The frontend was checking registration status before users completed the form
3. **Flow Misalignment**: AFS expects specific URL patterns for standalone registration

## Current Implementation Status

### ✅ Backend (AddCardController.js)
- **Checkout Creation**: Working perfectly
- **Authentication**: All API calls successful
- **Configuration**: Proper standalone registration setup
- **Callback Handling**: Correct /registration endpoint usage
- **Error Handling**: Comprehensive logging and retry logic

### ✅ Frontend (add-card.component.ts)
- **Widget Loading**: Proper script loading sequence
- **Form Setup**: Correct action URL to frontend
- **Callback Handling**: Proper resourcePath extraction
- **Error Handling**: User-friendly error messages

### ✅ AFS Integration
- **Standalone Registration**: Properly configured with createRegistration=true
- **Widget Script**: Correct URL format for registration
- **Callback Flow**: Frontend receives resourcePath, calls backend for verification

## Testing Instructions

### 1. Start the Application
```bash
cd backend
npm start

cd frontend
npm start
```

### 2. Test Card Registration Flow

#### A. Navigate to Add Card Page
- Go to `http://localhost:4200/customer-portal/add-card`
- Should see "Preparing secure payment form..." loading state

#### B. Verify Widget Loading
Watch browser console for these logs:
```
🔄 AddCardComponent initialized
📞 Attempt 1/3 - Calling AFS registration endpoint...
✅ Registration preparation successful
🔄 Loading AFS widget after timeout
✅ AFS library detected after [X] attempts
✅ Payment form element found
✅ Form action set to: http://localhost:4200/customer-portal/add-card
✅ AFS widgets successfully rendered
```

#### C. Fill Card Details
Use these test card numbers:
- **Visa**: `4200000000000000`
- **Mastercard**: `5454545454545454`
- **American Express**: `378282246310005`

Use any future expiry date and any 3-4 digit CVV.

#### D. Submit Form
After clicking submit:
1. AFS processes the registration
2. Redirects back to add-card page with `?resourcePath=/v1/checkouts/{id}/registration`
3. Frontend detects the callback and calls backend
4. Backend verifies registration status
5. Should show success message and redirect to saved cards

### 3. Expected Behavior

#### Success Flow:
```
User fills form → AFS processes → Callback with resourcePath → 
Frontend calls backend → Backend gets success → Frontend shows success
```

#### Error Flow:
```
User cancels → AFS redirects with error → Frontend shows error message
```

#### No Completion Flow:
```
User leaves page → Backend status check returns 800.900.300 (expected)
```

## Debug Information

### Backend Logs to Watch For:
```
✅ AFS checkout prepared successfully
🔑 Checkout ID: [ID]
📊 AFS Response code: 000.200.100
```

### Frontend Logs to Watch For:
```
✅ Registration preparation successful
✅ AFS widgets successfully rendered
🔄 Detected AFS callback with parameters
✅ Registration callback handled successfully
```

### AFS Response Codes:
- `000.200.100` - Checkout created successfully
- `000.200.000` - Registration pending (user hasn't completed)
- `800.900.300` - User authorization failed (user didn't complete/cancelled)
- `000.000.000` - Registration completed successfully

## Manual Testing Checklist

- [ ] Page loads without errors
- [ ] Loading spinner appears initially
- [ ] AFS form widgets render correctly
- [ ] Test card details can be entered
- [ ] Form submission redirects properly
- [ ] Success/error messages display correctly
- [ ] Navigation to saved cards works
- [ ] Error handling works for cancellation

## Still Having Issues?

If you're still experiencing problems:

1. **Check Browser Console**: Look for any JavaScript errors
2. **Check Network Tab**: Verify API calls are successful
3. **Check Backend Logs**: Ensure AFS API calls are working
4. **Try Different Browser**: Rule out browser-specific issues
5. **Clear Browser Cache**: Ensure latest code is loaded

## Debug Scripts Available

Run these in the backend directory for testing:

```bash
# Test AFS API authentication and configuration
node test-afs-registration-debug.js

# Test complete registration flow simulation
node test-afs-complete-flow.js
```

Both scripts should show "✅ Test completed successfully!" if everything is working.

## Key Implementation Notes

1. **Never call registration status** before user completes the form
2. **Always use frontend URLs** for shopperResultUrl
3. **Handle both success and error callbacks** properly
4. **Implement proper loading states** for better UX
5. **Use comprehensive error handling** with retry logic

The integration is now properly configured and should work as expected!
