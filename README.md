## Running the Backend

### Environment Setup

  - `.env.sandbox` for sandbox/development
  - `.env.production` for production

Each file should contain your MongoDB connection string:
```
MONGODB_URI=your_mongodb_connection_string
```

# Integrating AFS Payment Widget in Angular Frontend

To display the AFS payment widget using the checkoutId from your backend response, follow these steps:

## 1. Create or Update Payment Widget Component

Create or update `frontend/src/app/payment-widget/payment-widget.component.ts`:

```typescript
import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-payment-widget',
  templateUrl: './payment-widget.component.html',
  styleUrls: ['./payment-widget.component.scss']
})
export class PaymentWidgetComponent implements OnInit, OnDestroy {
  @Input() paymentLink: string = '';
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit(): void {
    if (this.paymentLink) {
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = this.paymentLink;
      this.scriptElement.async = true;
      document.body.appendChild(this.scriptElement);
    }
  }

  ngOnDestroy(): void {
    if (this.scriptElement) {
      document.body.removeChild(this.scriptElement);
    }
  }
}
```

## 2. Update the Component Template

In `frontend/src/app/payment-widget/payment-widget.component.html`:

```html
<form action="" class="paymentWidgets" data-brands="VISA MASTER AMEX"></form>
```

## 3. Use the Component in Your Payment Page

In your payment page (e.g., `payment-result.component.html`):

```html
<app-payment-widget [paymentLink]="paymentLink"></app-payment-widget>
```

Set `paymentLink` to the value received from your backend API response.

## 4. After Payment

After the user completes payment, use the `shopper_result_url` from your backend response to check the payment result.

---

This integration will allow users to complete payments using the AFS widget in your Angular frontend.
### Starting the Server

- **Sandbox (default):**
  ```
  node app.js
  ```
- **Production:**
  ```
  NODE_ENV=production node app.js
  ```

The server will automatically use the correct MongoDB URI based on the environment.