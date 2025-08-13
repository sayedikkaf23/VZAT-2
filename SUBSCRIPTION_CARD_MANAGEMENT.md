# Subscription Card Management Feature

## Overview
This feature allows customers to change and manage their payment methods for existing subscriptions. Customers can add new cards or switch between their saved cards for subscription payments.

## Architecture

### Backend Components

#### 1. SubscriptionCardController.js
Main controller handling all subscription card management operations:

- **createCardChangePaymentForm()** - Creates AFS payment form for new card registration
- **handleCardChangeWebhook()** - Processes AFS webhook for new card registration
- **getCardChangeHistory()** - Retrieves card change history for a subscription
- **getCustomerPaymentMethods()** - Gets all saved cards for a customer
- **updateSubscriptionCard()** - Updates subscription to use a different existing card

#### 2. Database Models Enhanced

**VzatRecurringDataModel.js** - Added fields:
```javascript
card_updated_date: Date        // When card was last changed
old_registration_id: String    // Previous registration ID for reference
```

**SavedCardModel.js** - Added fields:
```javascript
deactivated_date: Date         // When card was deactivated
deactivation_reason: String    // Reason for deactivation
```

#### 3. API Routes (SubscriptionCardRoute.js)
```
POST   /api/subscription-card/:quotepaymentId/change-card      - Create new card form
POST   /api/subscription-card/webhook/card-change             - Handle AFS webhook
GET    /api/subscription-card/:quotepaymentId/card-history    - Get card history
GET    /api/subscription-card/payment-methods                 - Get customer cards
PUT    /api/subscription-card/:quotepaymentId/update-card     - Update subscription card
```

### Frontend Components

#### 1. SubscriptionCardService.ts
Service providing:
- API calls to backend endpoints
- URL parameter checking for card update status
- Response type definitions

#### 2. PaymentScheduleComponent Enhanced
Added card management functionality:
- Card management panel toggle
- Display of saved payment methods
- New card addition workflow
- Existing card selection
- Card change history display

## User Workflows

### 1. Add New Card to Subscription

**Customer Journey:**
1. Customer views payment schedule page
2. Clicks "Show" on Payment Method Management
3. Clicks "Add New Card"
4. Redirected to AFS payment form (minimal 1 AED charge)
5. Enters new card details
6. After successful registration, redirected back with success message
7. New card becomes active for subscription

**Technical Flow:**
1. Frontend calls `createCardChangePaymentForm()`
2. Backend creates AFS checkout with `createRegistration: true`
3. Customer completes payment form
4. AFS sends webhook to `handleCardChangeWebhook()`
5. Backend updates subscription with new `afs_registration_id`
6. Old cards marked as inactive
7. New card saved to database

### 2. Switch to Existing Card

**Customer Journey:**
1. Customer views saved payment methods
2. Selects desired card via radio button
3. Clicks "Use Selected Card for Subscription"
4. Confirmation message displayed
5. Subscription updated immediately

**Technical Flow:**
1. Frontend calls `updateSubscriptionCard()`
2. Backend validates card ownership
3. Subscription `afs_registration_id` updated
4. Card `lastUsed` timestamp updated

### 3. View Card History

**Customer Journey:**
1. Customer opens card management panel
2. Views table of all cards (active/inactive)
3. Sees which card is currently used for subscription
4. Views add/deactivation dates

## Security Features

### Authentication & Authorization
- Customer email verification required for all operations
- Subscription ownership validated via `quotepaymentId` matching
- No card details exposed in APIs (only masked numbers)

### Data Protection
- Card details never stored in database
- Only AFS registration IDs and display info saved
- Old registration IDs kept for audit trail
- Deactivation reasons logged

### AFS Integration Security
- Webhook validation (can be enhanced with signature verification)
- Minimal charge (1 AED) for card registration to prevent abuse
- Registration IDs used for future payments (not card numbers)

## Configuration

### Environment Variables Required
```
AFS_DOMAIN=https://eu-test.oppwa.com
AFS_ENTITY_ID=your_entity_id
AFS_ACCESS_TOKEN=your_access_token
BACKEND_URL=your_backend_url
FRONTEND_URL=your_frontend_url
```

### AFS Setup
- Webhooks configured for card registration events
- `createRegistration: true` parameter enables tokenization
- Notification URLs set for success/failure handling

## API Documentation

### Create Card Change Form
```http
POST /api/subscription-card/{quotepaymentId}/change-card
Content-Type: application/json

{
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "checkoutId": "checkout_id",
  "paymentFormUrl": "https://frontend.com/payment/checkout_id",
  "subscriptionInfo": {
    "quotepaymentId": "quote_123",
    "nextPaymentAmount": 150.00,
    "paymentsRemaining": 5,
    "nextChargeDate": "2025-09-15T09:00:00.000Z"
  }
}
```

### Get Payment Methods
```http
GET /api/subscription-card/payment-methods?customerEmail=customer@example.com

Response:
{
  "success": true,
  "customerEmail": "customer@example.com",
  "paymentMethods": [
    {
      "cardId": "card_id_1",
      "maskedCardNumber": "**** **** **** 4242",
      "cardBrand": "VISA",
      "expiryMonth": "12",
      "expiryYear": "29",
      "isDefault": true,
      "lastUsed": "2025-08-01T10:30:00.000Z",
      "registrationId": "reg_12345"
    }
  ]
}
```

### Update Subscription Card
```http
PUT /api/subscription-card/{quotepaymentId}/update-card
Content-Type: application/json

{
  "cardId": "card_id_2",
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "message": "Subscription payment method updated successfully",
  "quotepaymentId": "quote_123",
  "newCard": {
    "cardId": "card_id_2",
    "maskedCardNumber": "**** **** **** 1111",
    "cardBrand": "MASTERCARD",
    "registrationId": "reg_67890"
  }
}
```

## Error Handling

### Common Error Responses
- `403 Unauthorized access` - Customer doesn't own subscription
- `404 Subscription not found` - Invalid quotepaymentId
- `404 Card not found or inactive` - Invalid cardId
- `500 Failed to create payment form` - AFS API errors

### Frontend Error Display
- Alert messages with appropriate styling (success/warning/danger)
- Loading indicators during API calls
- Graceful degradation if card management unavailable

## Testing

### Manual Testing Steps
1. **Test New Card Addition:**
   - Access payment schedule page
   - Open card management
   - Add new card with test card numbers
   - Verify webhook processing
   - Check database updates

2. **Test Card Switching:**
   - Ensure customer has multiple saved cards
   - Select different card
   - Verify subscription update
   - Check recurring payment uses new card

3. **Test Security:**
   - Try accessing other customer's cards
   - Test with invalid subscription IDs
   - Verify email validation

### Automated Testing
- Unit tests for controller methods
- Integration tests for API endpoints
- Webhook processing tests
- Database update validation

## Deployment Considerations

### Database Migration
- New fields added to existing schemas
- Indexes updated (removed duplicate afs_registration_id index)
- Existing data remains compatible

### AFS Configuration
- Webhook endpoints must be accessible from AFS servers
- HTTPS required for production webhooks
- Webhook URL: `{BACKEND_URL}/api/subscription-card/webhook/card-change`

### Frontend Deployment
- New service and component files included
- Bootstrap CSS classes used (ensure Bootstrap is loaded)
- FontAwesome icons used (ensure FontAwesome is loaded)

## Future Enhancements

### Planned Features
1. **Card Expiry Notifications** - Email customers before card expiry
2. **Automatic Card Updates** - Integration with card updater services
3. **Payment Method Preferences** - Customer-defined payment schedules
4. **Multi-Currency Support** - Different cards for different currencies

### Security Enhancements
1. **Webhook Signature Verification** - Validate AFS webhook authenticity
2. **Rate Limiting** - Prevent abuse of card change APIs
3. **Audit Logging** - Detailed logs of all card management operations
4. **Two-Factor Authentication** - Additional security for card changes

### UI/UX Improvements
1. **Mobile Responsive Design** - Better mobile card management experience
2. **Real-time Updates** - WebSocket notifications for card changes
3. **Card Brand Recognition** - Automatic card type detection
4. **Payment Calendars** - Visual payment schedules with card info

## Troubleshooting

### Common Issues
1. **Webhook Not Received:**
   - Check AFS webhook configuration
   - Verify URL accessibility
   - Check server logs for errors

2. **Card Change Failed:**
   - Verify customer email matches subscription
   - Check AFS registration ID validity
   - Ensure card is active and not expired

3. **Payment Failure After Card Change:**
   - Verify new registration ID in subscription
   - Check AFS registration status
   - Validate card details with AFS

### Debug Endpoints
- `/api/subscription/{quotepaymentId}/status` - Check subscription details
- `/api/saved-cards/customer/{customerEmail}` - View customer's cards
- Server logs provide detailed operation tracking

## Support Information

### Customer Support Scripts
1. **Card Not Working:** Guide customer through card management panel
2. **Payment Failed:** Check subscription card details and update if needed
3. **Missing Cards:** Verify customer account and card registration

### Technical Support
- All operations logged with correlation IDs
- Database queries available for debugging
- AFS transaction IDs tracked for payment issues

This feature provides a complete solution for subscription payment method management, ensuring customers can easily update their payment information while maintaining security and audit trails.
