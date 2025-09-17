## Working Flows

This document describes the actual end-to-end flows used by the application.

### 1) One-time Payment Flow (AFS Widget)

1. Backend receives quote/payment data and creates a payment link
   - Endpoint: POST `/api/vzat_recurring_create_payment_link`
   - Response contains: `afs_checkout_id`, `payment_widget_url`, `shopper_result_url`, `quotepaymentId`

2. Frontend renders AFS widget
   - Component: `payment-widget` injects `<script src="payment_widget_url">` and `<form class="paymentWidgets">`

3. Shopper completes payment in widget
   - AFS posts to backend form endpoint:
     - POST `/payment-result` with `resourcePath` (and optionally `quotepaymentId`)

4. Backend redirects to frontend result page
   - Redirect: `/payment/result?resourcePath=...&quotepaymentId=...`
   - Alternative: GET `/payment-result?id=<checkoutId>` augments missing `quotepaymentId` then redirects

5. Frontend `payment-result` page queries result
   - Calls GET `/api/payment/result?resourcePath=...` to resolve final status via `getAFSPaymentResult`

6. On success, backend updates Salesforce and internal records

### 2) Card Registration Only

1. Prepare registration
   - POST `/api/cards/prepare-registration` with `{ customerEmail }`
   - Response includes `afs_checkout_id`, `payment_widget_url`, `shopper_result_url`, `payment_required: false`

2. Frontend loads widget using `payment_widget_url`

3. AFS posts result
   - POST `/card-registration-result?resourcePath=...` handled by backend
   - Redirect to frontend `/saved-card/add-card?resourcePath=...`

4. Backend finalizes via callback
   - POST `/api/cards/registration-callback` with `{ checkoutId, customerEmail }`
   - Saves card, sets default as needed, migrates subscriptions if applicable

### 3) Card Registration With Payment

1. Prepare combined flow
   - POST `/api/cards/prepare-registration-with-payment`

2. Widget flow proceeds, payment captured

3. Backend callback
   - POST `/api/cards/payment-callback`

4. Card saved and payment recorded; subscriptions may update default card

### 4) Recurring Subscriptions

1. Create payment link with `InstallmentType = "Installments"`
   - POST `/api/vzat_recurring_create_payment_link`

2. Shopper completes first payment via widget (Flow 1)

3. Webhook notifications
   - AFS calls POST `/api/subscription/webhook/afs`

4. Recurring processing
   - Cron triggers POST `/api/subscription/process-recurring`
   - Controller charges saved card tokens and updates Salesforce

5. Status and management
   - GET `/api/subscription/status/:quotepaymentId`
   - PUT `/api/subscription/cancel/:quotepaymentId`

### 5) Saved Cards Management

- List: GET `/api/saved-cards/customer/:customerId/cards`
- Set default: PUT `/api/saved-cards/card/:cardId/set-default`
- Remove: DELETE `/api/saved-cards/card/:cardId`
- Fix/update tools: `/api/saved-cards/fix-card-numbers`, `/api/saved-cards/card/:cardId/update-last-four`

### 6) Aux Endpoints

- Payment schedule: GET `/api/payment_schedule/:checkoutId` (410 if expired)
- Test helpers: POST `/test-payment-link`, POST `/test-subscription-link`


