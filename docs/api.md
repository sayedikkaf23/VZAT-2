## API Reference

Base URL: `http://localhost:3000`

All routes below are prefixed as mounted in `backend/app.js`.

### Cards (`/api/cards`)

- POST `/prepare-registration`
  - Prepares AFS checkout for card registration (no payment).
  - Body: `{ customerEmail: string }`
  - Returns: `{ status, message, afs_checkout_id, payment_widget_url, payment_page_url, shopper_result_url, registration_type, payment_required }`

- POST `/prepare-registration-with-payment`
  - Prepares checkout for card registration with a payment.
  - Body similar to registration plus payment details (see controller contracts).

- POST `/registration-callback`
  - Handles AFS callback after card-only registration.
  - Body: `{ checkoutId, customerEmail }`

- POST `/payment-callback`
  - Handles AFS callback after card+payment registration.

- GET `/payment-status`
  - Checks payment status and supports redirect/navigation handling for add-card flow.

- GET `/:customerEmail`
  - Returns saved cards for a customer.

- POST `/set-default`
  - Sets a card as default.

### Saved Cards (`/api/saved-cards`)

- POST `/test-create-card`
- POST `/fix-card-numbers`
- PUT `/card/:cardId/update-last-four`
- GET `/customer/:customerId/cards`
- DELETE `/card/:cardId`
- PUT `/card/:cardId/set-default`

### Payment Links and Records (`/api/vzat_recurring_create_payment_link`)

- POST `/` Create payment link from Salesforce quote/payment data.
  - Body (example): `{ OpportunityId, quotepaymentId, QuoteId, CreatedDate, Status, TotalPrice, Total_After_VAT_Currency, InstallmentType, Product_details: [...] }`
  - Returns: record with `afs_checkout_id`, `payment_widget_url`, `shopper_result_url`, etc.

- GET `/` List all records
- GET `/search` Search by query
- GET `/:quotepaymentId` Get one by `quotepaymentId`
- GET `/afs-payment-result` | `/payment/result` Get AFS payment result

### Subscriptions (`/api/subscription`)

- POST `/webhook/afs` AFS webhook for notifications
- POST `/process-recurring` Cron-like endpoint to run recurring charges
- GET `/status/:quotepaymentId` Subscription status
- PUT `/cancel/:quotepaymentId` Cancel subscription
- PUT `/update-next-charge/:quotepaymentId` Adjust next charge (testing)
- PUT `/fix-installment-left/:quotepaymentId` Fix installments remaining (testing)
- POST `/test/email-config` Verify email config
- POST `/test/completion-email` Send completion email (testing)
- POST `/test/failure-email` Send failure email (testing)
- POST `/test/salesforce-connection` Validate Salesforce API
- POST `/test/salesforce-update` Push a payment status update to Salesforce
- POST `/test/salesforce-clear-cache` Clear Salesforce token cache

### Payments (Testing) (`/api/test-payment`)

- POST `/complete-payment` Simulate successful payment
- POST `/reset-payment` Reset payment status

### Utility Endpoints (defined in `app.js`)

- GET `/api/payment_schedule/:checkoutId`
  - Returns stored payment data; 410 if link expired.

- GET `/api/payment/result`
  - Proxies to AFS payment result handler.

- POST `/payment-result`
  - Handles AFS payment widget form submission; redirects to frontend `/payment/result` with query params.

- GET `/payment-result`
  - Alternative payment result redirector; augments with `quotepaymentId` if missing.

- POST `/card-registration-result`
  - Handles AFS card registration widget submission; redirects to frontend `/saved-card/add-card`.

- POST `/debug/payment-data`
  - Echoes received fields; extracts potential card-like values for debugging.

- POST `/test-payment-link` | POST `/test-subscription-link`
  - Generate test payment/subscription links via main controller.


