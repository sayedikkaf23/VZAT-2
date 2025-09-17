## Architecture Overview

### Stack

- Frontend: Angular 20 (served independently in dev; static from backend in prod)
- Backend: Node.js (Express, ES modules), MongoDB via Mongoose
- Integrations: AFS Payments, Salesforce API

### High-Level Diagram

Frontend (Angular)
  ↕ REST (`/api/...`)
Backend (Express) — MongoDB (Mongoose)
  ↔ AFS (widget + server APIs)
  ↔ Salesforce (API)

### Modules (Backend)

- `Controllers/` Business logic for payments, cards, subscriptions, Salesforce
- `routes/` Express routers mounted in `app.js`
- `model/` Mongoose models
- `services/` Email + Salesforce helpers
- `config/` DB connection, cron jobs, env config

### Frontend

- `src/app/*` customer/admin modules and components
- `payment-widget` loads AFS widget script and form
- `payment-result` handles result UI and calls `/api/payment/result`

### Data Flow Highlights

- Payment link creation writes a record with `afs_checkout_id`, link URLs, and quote info.
- Widget redirects to backend endpoints that then redirect to frontend with query params.
- Result resolution happens server-side via `getAFSPaymentResult`, with updates to Salesforce.
- Subscriptions rely on webhook + cron processing using stored tokens/registration IDs.


