## Backend

Express API powering payments, card registration, subscriptions, and Salesforce integration.

### Run

```bash
npm install
cp .env.sandbox .env  # ensure variables exist
npm run dev            # or npm start
```

### Required Environment Variables

- `MONGODB_URI`
- `FRONTEND_URL` (e.g., http://localhost:4200)
- `BACKEND_URL` (e.g., http://localhost:3000)
- `AFS_BASE_URL`, `AFS_ENTITY_ID`, `AFS_AUTHORIZATION`
- `SALESFORCE_LOGIN_URL` (defaults to `https://login.salesforce.com` if not set)
- `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_SECURITY_TOKEN`

### CORS

Allowed origins are configured in `app.js` (`http://localhost:4200`, `http://localhost:3000`, and deployed hosts). Adjust if needed.

### Key Mount Points

- `/api/vzat_recurring_create_payment_link` Payment link creation and records
- `/api/cards` Card registration and status
- `/api/saved-cards` Saved card management
- `/api/subscription` Webhook, recurring, status, Salesforce tests
- `/api/test-payment` Testing utilities
- plus utility redirects in `app.js` for payment/card result handling

More details in `../docs/api.md` and flows in `../docs/flows.md`.

 