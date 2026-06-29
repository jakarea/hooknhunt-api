# Quick Place Order API Documentation

## Overview
Simplified order placement API for landing pages. Prices are fetched server-side - no frontend price manipulation possible.

## Endpoint
```
POST /api/v2/store/orders/quick-place
```

## Request Payload

### Minimal Required Fields
```json
{
  "customer_name": "John Doe",
  "customer_phone": "01712345678",
  "customer_email": "john@example.com",
  "shipping_address": "House 12, Road 5, Gulshan 1, Dhaka-1200",
  "items": [
    {
      "product_id": 34,
      "variant_id": 425,
      "quantity": 1
    }
  ]
}
```

### Validation Rules
- `customer_name`: required, min 2 chars, max 255 chars
- `customer_phone`: required, Bangladesh format (01xxxxxxxxx)
- `customer_email`: optional, valid email format
- `shipping_address`: required, min 10 chars, max 1000 chars
- `items`: required, array, min 1 item, max 10 items
  - `items[].product_id`: required, must exist in products table
  - `items[].variant_id`: required, must exist in product_variants table
  - `items[].quantity`: required, min 1, max 1000

## Server-Side Processing

### Automatic Calculations
1. **Price Fetching**: Gets price from database (offer_price if available, else price)
2. **Stock Validation**: Checks sufficient stock before order creation
3. **Delivery Charge**: Uses config value (default 70 TK)
4. **Total Calculation**: subtotal + delivery_charge
5. **Customer Handling**: Auto-creates account for new users, links existing users

### Fixed Values
- **Customer Type**: retail
- **Payment Method**: COD
- **Channel**: retail_web
- **Order Source**: landing_page

## Response

### Success Response (201)
```json
{
  "success": true,
  "message": "Order placed successfully.",
  "data": {
    "id": 123,
    "invoice_no": "WEB-65A4B3C2D1E2F",
    "customer_name": "John Doe",
    "customer_phone": "01712345678",
    "customer_email": "john@example.com",
    "status": "pending",
    "payment_status": "unpaid",
    "payment_method": "cod",
    "sub_total": 850.00,
    "delivery_charge": 70.00,
    "total_amount": 920.00,
    "paid_amount": 0.00,
    "due_amount": 920.00,
    "items": [
      {
        "id": 456,
        "product_name": "Telescopic Super Hard Fiberglass Sea Fishing Rod",
        "product_sku": "rod-240cm",
        "variant_name": "240 CM",
        "quantity": 1,
        "unit_price": 850.00,
        "total_price": 850.00
      }
    ],
    "credentials": {
      "phone": "01712345678",
      "password": "AB123456"
    },
    "is_returning_customer": false
  }
}
```

### Error Responses

**Validation Error (422)**
```json
{
  "success": false,
  "message": "Order validation failed",
  "errors": {
    "customer_phone": ["Invalid Bangladesh phone number format."]
  }
}
```

**Insufficient Stock (400)**
```json
{
  "success": false,
  "message": "Insufficient stock for this product.",
  "data": {
    "variant_name": "240 CM",
    "available_stock": 5
  }
}
```

**Invalid Product/Variant (400)**
```json
{
  "success": false,
  "message": "Invalid product or variant. Please check your selection.",
  "data": {
    "product_id": 34,
    "variant_id": 999
  }
}
```

## Security Features

1. **Price Protection**: Prices fetched from database - frontend cannot manipulate
2. **Stock Management**: Automatic stock decrement on successful orders
3. **Variant Validation**: Ensures variant belongs to specified product
4. **Active Status Check**: Only allows orders for active products and variants
5. **Transaction Safety**: All operations wrapped in database transaction

## Customer Account Management

### New Customer
- Auto-creates user account with generated password (AB123456 format)
- Creates customer record linked to user
- Sends SMS with credentials
- Returns credentials in API response

### Existing Customer
- Detects by phone number
- Links order to existing account
- No new account created
- Returns `is_returning_customer: true`

## Inventory Management

1. **Stock Validation**: Checks availability before order creation
2. **Stock Decrement**: Reduces variant stock by quantity
3. **Cost Tracking**: Stores purchase cost for profit analysis
4. **Weight Tracking**: Captures product weight for shipping calculations

## Order Workflow

1. **Order Created**: status = "pending", payment_status = "unpaid"
2. **SMS Sent**: Order confirmation + account credentials (if new user)
3. **Event Dispatched**: OrderCreated event for notifications
4. **Inventory Updated**: Stock decremented

## Configuration

Add to `.env` file:
```env
DEFAULT_DELIVERY_CHARGE=70
```

Or modify in `config/orders.php`:
```php
'default_delivery_charge' => env('DEFAULT_DELIVERY_CHARGE', 70),
```

## Landing Page Integration

The landing page only needs to send:
- Customer information
- Shipping address
- Product and variant IDs
- Quantities

All pricing and calculations handled server-side for security and accuracy.

## Testing with cURL

```bash
curl -X POST http://hooknhunt-api.test/api/v2/store/orders/quick-place \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "01712345678",
    "customer_email": "john@example.com",
    "shipping_address": "House 12, Road 5, Gulshan 1, Dhaka-1200",
    "items": [
      {
        "product_id": 34,
        "variant_id": 425,
        "quantity": 1
      }
    ]
  }'
```