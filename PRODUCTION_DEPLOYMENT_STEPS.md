# Production Server Deployment Steps

## 1. SSH to Production Server
```bash
ssh ubuntu@vzatnew.yeepeey.com
# Enter your password/key
```

## 2. Navigate to Project Directory
```bash
cd /home/ubuntu/VZAT-2
# Or wherever your project is located
```

## 3. Pull Latest Changes
```bash
git fetch origin
git reset --hard origin/sandbox-2
# This will reset to match the reverted state
```

## 4. Update Backend (Critical Fix)
```bash
cd backend

# Make sure .env.sandbox has correct credentials
# Especially: SALESFORCE_PASSWORD=Virtuzone@12345

# Restart the backend
pm2 restart app

# Check logs to verify it's running
pm2 logs app --lines 50
```

## 5. Rebuild Frontend
```bash
cd ../frontend

# Install any new dependencies (if needed)
npm install

# Build the frontend
npm run build

# Built files will be in: dist/frontend/browser/
```

## 6. Verify Deployment
```bash
# Check backend is running
pm2 status

# Check backend logs for errors
pm2 logs app --err --lines 20

# Test the API endpoint
curl https://vzatnew.yeepeey.com/api/generate_checkout/aAWdu000000BJSLGA4 -X POST
```

## 7. Test Payment Flow
1. Open browser: https://vzatnew.yeepeey.com
2. Navigate to a payment link (or create new one)
3. Click "Pay Now"
4. Verify payment widget loads without "invalid or missing entity type" error

## Critical Changes Reverted
- Backend app.js is now WITHOUT the entityId in widget URL fix
- Frontend payment-widget component is back to original state
- You need to manually apply the entityId fix again

## Apply Entity ID Fix (REQUIRED)
Edit `/home/ubuntu/VZAT-2/backend/app.js` line ~378:

**CHANGE FROM:**
```javascript
const paymentWidgetUrl = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
```

**CHANGE TO:**
```javascript
const paymentWidgetUrl = `${process.env.AFS_DOMAIN}/v1/paymentWidgets.js?checkoutId=${checkoutId}&entityId=${entityId}`;
```

Then restart: `pm2 restart app`

## Troubleshooting
If payment widget still shows error:
1. Check browser console for errors
2. Verify entity ID is in URL: View page source, search for "paymentWidgets.js"
3. Check backend logs: `pm2 logs app`
4. Verify .env.sandbox has correct AFS_ENTITY_ID=8acda4cc97f436a801981cb37ede2e0b
