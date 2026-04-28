# EPS Payment Integration - Complete Analysis & Implementation Guide

## Current Status: ✅ Backend Ready, 🔄 Frontend Needs Updates

---

## 📋 Configuration Status

### ✅ Backend Configuration (COMPLETE)
- **Environment Variables** (`.env`):
  - `EPS_MODE=sandbox`
  - `EPS_STORE_ID_SANDBOX=35b518f6-aab7-4af1-b16c-335052e9a55c`
  - `EPS_STORE_USERNAME_SANDBOX=xyz.eps@gmail.com`
  - `EPS_STORE_PASSWORD_SANDBOX=Emon258@`
  - Callback URLs configured

- **Config File** ([`config/eps.php`](config/eps.php)):
  - Sandbox URL: `https://sandboxpgapi.eps.com.bd`
  - Live URL: `https://pgapi.eps.com.bd`
  - Username, password, and store_id configured

- **Database Migration** ([`update_payment_transactions_table_for_eps.php`](database/migrations/2026_04_24_125459_update_payment_transactions_table_for_eps.php)):
  - Added `auth_token`, `eps_tran_id`, `payment_channel`, `bank_name`, `card_type`, `eps_response` fields

### ✅ Backend Service (COMPLETE)
- **EPSService** ([`EPSService.php`](app/Services/PaymentGateways/EPSService.php)):
  - ✅ GetToken authentication flow
  - ✅ Bearer token caching
  - ✅ x-hash signature generation
  - ✅ InitializeEPS endpoint
  - ✅ CheckMerchantTransactionStatus endpoint
  - ✅ IPN verification

### ✅ Backend Controller (COMPLETE)
- **PaymentGatewayController** ([`PaymentGatewayController.php`](app/Http/Controllers/Api/V2/PaymentGatewayController.php)):
  - ✅ `initiateEPSPayment()` - Initiates EPS payment
  - ✅ `epsSuccess()` - Success callback
  - ✅ `epsFail()` - Failure callback
  - ✅ `epsCancel()` - Cancel callback
  - ✅ `epsIPN()` - IPN webhook
  - ✅ `epsStatus()` - Payment status check

### ✅ API Routes (COMPLETE)
- **Website Routes** ([`routes/website.php`](routes/website.php:66-76)):
  ```
  POST /api/v2/store/payments/initiate
  POST /api/v2/store/payments/eps/success
  POST /api/v2/store/payments/eps/fail
  POST /api/v2/store/payments/eps/cancel
  POST /api/v2/store/payments/eps/ipn
  GET  /api/v2/store/payments/eps/status/{order_id}
  ```

---

## 🔄 Frontend Updates Needed

### 1. Payment Types Extension
**File**: [`src/types/payment.ts`](/Users/jakareaparvez/Sites/hooknhunt-ui/src/types/payment.ts)

Need to add EPS to payment methods:
```typescript
type PaymentMethod = 'cod' | 'sslcommerz' | 'eps';
```

### 2. Checkout Page Update
**File**: [`src/app/checkout/page.tsx`](/Users/jakareaparvez/Sites/hooknhunt-ui/src/app/checkout/page.tsx)

Current PaymentMethod type: `'cod' | 'sslcommerz'`
Needs to be updated to: `'cod' | 'sslcommerz' | 'eps'`

Add EPS payment option UI and handler.

### 3. API Client Update
**File**: [`src/lib/api.ts`](/Users/jakareaparvez/Sites/hooknhunt-ui/src/lib/api.ts)

Add `payment_method` parameter to `initiatePayment()` method.

---

## 🚀 Complete Payment Flow

### User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER PAYMENT JOURNEY                                │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER CHECKS OUT
   ├─ Cart → Checkout Page
   ├─ Fills customer information
   └─ Selects Payment Method: COD | SSLCommerz | EPS

2. USER SELECTS EPS PAYMENT
   ├─ Clicks "Pay with EPS" button
   ├─ Frontend calls: POST /api/v2/store/payments/initiate
   │  {
   │    "sales_order_id": 123,
   │    "customer_name": "John Doe",
   │    "customer_email": "john@example.com",
   │    "customer_phone": "01712345678",
   │    "customer_address": {...},
   │    "payment_method": "eps"  ← Routes to EPS
   │  }
   └─ Backend validates order and creates payment transaction

3. BACKEND PROCESSES PAYMENT INITIATION
   ├─ PaymentGatewayController.initiate()
   ├─ Routes to EPSService.createPayment()
   ├─ EPSService calls EPS GetToken API
   │  POST https://sandboxpgapi.eps.com.bd/v1/Auth/GetToken
   │  Headers: x-hash (HMAC signature)
   │  Body: { userName, password }
   │  → Returns: { token: "eyJhbG..." }
   ├─ Caches token for 50 minutes
   ├─ Generates unique merchantTransactionId
   ├─ Calls EPS InitializeEPS API
   │  POST https://sandboxpgapi.eps.com.bd/v1/EPSEngine/InitializeEPS
   │  Headers: Authorization: Bearer {token}, x-hash
   │  Body: {
   │    storeId, merchantTransactionId, CustomerOrderId,
   │    totalAmount, successUrl, failUrl, cancelUrl,
   │    customer details, ProductList
   │  }
   │  → Returns: { redirectUrl: "https://...", ... }
   └─ Returns redirect URL to frontend

4. USER REDIRECTED TO EPS GATEWAY
   ├─ Frontend receives: { gateway_url: "https://sandboxpgapi.eps.com.bd/..." }
   ├─ Opens EPS payment page in new tab/window
   └─ User completes payment on EPS page
      ├─ Selects payment method (Card/Mobile Banking/Internet Banking)
      ├─ Enters payment details
      └─ Confirms payment

5. EPS PROCESSES PAYMENT
   ├─ User pays successfully
   ├─ EPS redirects to: successUrl with parameters
   │  POST /api/v2/store/payments/eps/success
   │  {
   │    merchantTransactionId: "202604251234567890123",
   │    tranId: "EPS123456",
   │    valueA: "123",  ← Our order_id
   │    totalAmount: 1000,
   │    transitionStatus: "SUCCESS"
   │  }
   └─ OR EPS sends IPN (Instant Payment Notification)
      POST /api/v2/store/payments/eps/ipn

6. BACKEND VERIFIES PAYMENT
   ├─ Receives callback/IPN
   ├─ PaymentGatewayController.epsSuccess() or epsIPN()
   ├─ Verifies with EPS: CheckMerchantTransactionStatus API
   │  GET /v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=...
   │  → Returns: { transitionStatus: "SUCCESS", ... }
   ├─ Updates payment_transactions table:
   │  status: 'paid'
   │  gateway_tran_id: merchantTransactionId
   │  eps_tran_id: tranId
   │  payment_channel: "Mobile Banking"
   │  bank_name: "bKash"
   │  paid_at: now()
   ├─ Updates sales_orders table:
   │  payment_status: 'paid'
   │  status: 'processing'
   └─ Sends payment confirmation email

7. USER REDIRECTED TO SUCCESS PAGE
   └─ Frontend: /order-success?invoice=INV-123&payment=eps
```

---

## 🔧 Developer Code Flow

### Backend Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND CODE FLOW                                     │
└──────────────────────────────────────────────────────────────────────────────┘

REQUEST: POST /api/v2/store/payments/initiate
│
├─ PaymentGatewayController@initiate
│  ├─ Gets sales_order_id from request
│  ├─ Checks payment_method (defaults to env('ACTIVE_PAYMENT_GATEWAY'))
│  ├─ IF payment_method === 'eps'
│  │  └─→ initiateEPSPayment()
│  │     ├─ Validate order exists
│  │     ├─ Create PaymentTransaction record (status: pending)
│  │     ├─ Build payment data array
│  │     └─ $this->eps->createPayment($paymentData)
│  │
│  └─ ELSE (sslcommerz)
│     └─→ initiateSSLCommerzPayment()
│
├─ EPSService@createPayment
│  ├─ getCredentials() → Get sandbox/live config
│  ├─ getBearerToken()
│  │  ├─ Check cache for existing token
│  │  └─ IF no cached token
│  │     ├─ Generate x-hash signature
│  │     ├─ POST /v1/Auth/GetToken
│  │     ├─ Store token in cache (50 min)
│  │     └─ Return token
│  ├─ Generate merchantTransactionId
│  ├─ Build EPS payload (storeId, customer info, ProductList)
│  ├─ Generate x-hash for request
│  ├─ POST /v1/EPSEngine/InitializeEPS
│  │  Headers: Authorization: Bearer {token}, x-hash
│  │  Body: JSON payload
│  └─ Return { success: true, redirect_url, merchant_transaction_id }
│
├─ Controller updates payment with merchant_transaction_id
│
└─ Response: { status: true, data: { gateway_url, tran_id, amount } }


CALLBACK: POST /api/v2/store/payments/eps/success
│
├─ PaymentGatewayController@epsSuccess
│  ├─ Get merchantTransactionId and valueA (order_id) from request
│  ├─ eps->queryTransaction(merchantTransactionId)
│  │  └─ EPSService@queryTransaction
│  │     ├─ getBearerToken()
│  │     ├─ Generate x-hash
│  │     └─ GET /v1/EPSEngine/CheckMerchantTransactionStatus
│  │        ?merchantTransactionId={id}
│  │     └─ Return { success: true, data: { status, ... } }
│  ├─ IF status === 'SUCCESS'
│  │  ├─ Find payment by order_id
│  │  ├─ Update payment_transactions (status: paid)
│  │  ├─ Update sales_orders (payment_status: paid)
│  │  └─ Send confirmation email
│  └─ Response: { status: true, message: 'Payment successful' }
│
└─ Frontend redirects to /order-success page


IPN: POST /api/v2/store/payments/eps/ipn
│
├─ PaymentGatewayController@epsIPN
│  ├─ Log raw IPN data
│  ├─ eps->verifyIPN($request->all())
│  │  └─ EPSService@verifyIPN
│  │     ├─ Extract merchantTransactionId, valueA (order_id)
│  │     ├─ Find payment by order_id
│  │     ├─ Check if already processed (duplicate detection)
│  │     ├─ queryTransaction(merchantTransactionId)
│  │     ├─ IF status === 'SUCCESS'
│  │     │  ├─ Update payment_transactions
│  │     │  └─ Update sales_orders
│  │     └─ Return { success: true, payment, sales_order }
│  ├─ Send confirmation email
│  └─ Return XML response: <response><status>OK</status>...</response>
│
└─ EPS server receives acknowledgment
```

---

## 📊 Database Schema Updates

### payment_transactions Table (EPS Columns Added)

```sql
-- Existing columns
id, sales_order_id, customer_id, gateway, amount, currency, status,
gateway_tran_id, payment_method, gateway_response, created_at, updated_at

-- EPS-specific columns (NEW)
auth_token              VARCHAR(255) NULL      -- EPS auth token (not currently used)
eps_tran_id             VARCHAR(255) NULL      -- EPS transaction ID
payment_channel         VARCHAR(100) NULL      -- Internet Banking, Mobile Banking, Card
bank_name               VARCHAR(100) NULL      -- bKash, City Bank, etc.
card_type               VARCHAR(50) NULL       -- Visa, MasterCard, etc.
eps_response            JSON NULL              -- Full EPS API response
```

---

## 🧪 Testing Checklist

### Backend Testing
- [x] Environment variables configured
- [x] Config file updated
- [x] Migration run
- [x] EPSService implements EPS API structure
- [x] Controller methods updated
- [x] API routes defined

### Frontend Testing (TODO)
- [ ] PaymentMethod type includes 'eps'
- [ ] Checkout page shows EPS option
- [ ] initiatePayment sends payment_method: 'eps'
- [ ] Success/fail/cancel pages handle EPS callbacks
- [ ] Payment status check works for EPS

### Integration Testing (TODO)
- [ ] Test sandbox payment flow end-to-end
- [ ] Verify IPN handling
- [ ] Test callback scenarios (success, fail, cancel)
- [ ] Verify database updates
- [ ] Test email notifications

---

## 🔐 Security Notes

1. **Hash Generation**: x-hash header uses HMAC-SHA256 with password as key
2. **Token Caching**: Bearer tokens cached for 50 minutes (expire in 60)
3. **IPN Validation**: Verify signature and duplicate prevention
4. **Callback Validation**: Always query EPS to verify transaction status
5. **Environment Variables**: Sensitive credentials stored in .env

---

## 📝 API Endpoints Reference

### Public Endpoints
```
POST   /api/v2/store/payments/initiate
POST   /api/v2/store/payments/eps/success
POST   /api/v2/store/payments/eps/fail
POST   /api/v2/store/payments/eps/cancel
POST   /api/v2/store/payments/eps/ipn
```

### Authenticated Endpoints
```
GET    /api/v2/store/payments/eps/status/{order_id}
```

### Admin Endpoints
```
GET    /api/v2/system/settings/payment/eps/status
POST   /api/v2/system/settings/payment/eps/test
```

---

## 🎯 Next Steps for Frontend

1. **Update Payment Types** - Add 'eps' to PaymentMethod type
2. **Add EPS Option to Checkout** - UI for selecting EPS payment
3. **Handle EPS Callbacks** - Success/fail/cancel page logic
4. **Add EPS Status Check** - Query payment status for EPS transactions
5. **Test End-to-End** - Complete sandbox payment flow

---

**Generated**: 2026-04-25
**Status**: Backend ✅ Complete | Frontend 🔄 Updates Required
