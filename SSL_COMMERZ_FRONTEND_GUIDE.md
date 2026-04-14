# SSL Commerz Integration — Frontend Developer Guide

Complete guide for integrating SSL Commerz payment gateway with the Hook & Hunt API.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Payment Flow](#payment-flow)
4. [Frontend Implementation](#frontend-implementation)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)
8. [Production Checklist](#production-checklist)

---

## Overview

### Architecture

```
┌─────────────────┐     POST /api/v2/store/payments/initiate
│   Frontend       │◄──────────────────────────────────┐
│  (Next.js/React) │─────────────────────────────────────┤
└─────────────────┘                                     │
                                                   ▼
┌──────────────────────────────────────────────────────┐
│  Backend API                                       │
│                                                    │
│  1. Create payment_transaction (pending)           │
│  2. Call SSL Commerz API                          │
│  3. Return: { gateway_url, tran_id }               │
│    └───────────────────────────────────────┐     │
│                                            ▼       │
│  4. Frontend redirects user to gateway_url        │
└─────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  SSL Commerz Payment Page                          │
│  - User selects payment method                       │
│  - User completes payment                            │
└─────────────────────────────────────────────────────┘
                          │
              ┌─────────────┴────────────────┐
              ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│  User Redirect        │         │  IPN (Webhook)        │
│  (Browser)            │         │  (Server-to-Server)    │
│                       │         │                        │
│  success_url          │         │  ipn_url              │
│  fail_url             │         │                        │
│  cancel_url           │         │                        │
└──────────────────────┘         └──────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────────────────────────────────────┐
│  Backend API                                        │
│                                                      │
│  - Verify hash                                       │
│  - Update payment_transaction (status: paid)        │
│  - Update sales_order (payment_status: paid)        │
│  - Send confirmation email                            │
│                                                      │
│  Return JSON to frontend                             │
└──────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Base URL
```
https://api.yourdomain.com/api/v2/store
```

---

### 1. Initiate Payment

**Endpoint:** `POST /payments/initiate`

**Authentication:** Optional — works for both guest and authenticated users

**Request Body:**
```typescript
{
  sales_order_id: number;        // Required
  customer_name: string;         // Required
  customer_email?: string;        // Optional
  customer_phone: string;        // Required — BD format
  customer_address: {            // Required
    address_line1: string;       // Required
    address_line2?: string;      // Optional
    city: string;                // Required
    district?: string;            // Optional
    country: string;             // Required — "Bangladesh"
    postal_code?: string;        // Optional
  };
  emi_option?: number;           // Optional — 0-13 (default: 0)
}
```

**Success Response (200):**
```typescript
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "payment_id": 1,
    "gateway_url": "https://securepay.sslcommerz.com/...",
    "tran_id": "PG-20240413123456-12345",
    "amount": 5000.00,
    "currency": "BDT",
    "sandbox": true
  }
}
```

**Error Response (422):**
```typescript
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "sales_order_id": ["Order not found"],
    "customer_phone": ["Required"]
  }
}
```

---

### 2. Get EMI Options

**Endpoint:** `POST /payments/emi-options`

**Request Body:**
```typescript
{
  amount: number;  // Required — Payment amount in BDT
}
```

**Success Response (200):**
```typescript
{
  "success": true,
  "data": {
    "amount": 5000.00,
    "currency": "BDT",
    "emi_enabled": true,
    "min_amount": 1000,
    "options": [
      {
        "tenure": 3,
        "interest_rate": 15.00,
        "monthly_payment": 1747.22,
        "total_amount": 5241.67,
        "total_interest": 241.67
      },
      {
        "tenure": 6,
        "interest_rate": 15.00,
        "monthly_payment": 893.61,
        "total_amount": 5361.67,
        "total_interest": 361.67
      },
      // ... more options
    ],
    "banks": {
      "0": "All Banks",
      "1": "DBBL (Dutch Bangla Bank)",
      "2": "BRAC Bank",
      // ... more banks
    }
  }
}
```

---

### 3. Payment Status

**Endpoint:** `GET /payments/status/{tran_id}`

**Authentication:** Required — Bearer token

**URL Parameter:**
- `tran_id` — Transaction ID from initiate response

**Success Response (200):**
```typescript
{
  "success": true,
  "data": {
    "payment_id": 1,
    "tran_id": "PG-20240413123456-12345",
    "amount": 5000.00,
    "status": "paid",
    "paid_at": "2024-04-13T12:34:56.000000Z",
    "order_id": 123,
    "order_invoice": "WEB-1234567890",
    "order_payment_status": "paid"
  }
}
```

---

### 4. Payment Callbacks (Webhooks)

SSL Commerz sends POST requests to these endpoints:

#### Success Callback
**Endpoint:** `POST /payments/success`

**SSL Commerz sends:**
```typescript
{
  tran_id: string;
  tran_date: string;
  val_id: string;
  amount: string;
  store_amount: string;
  currency: string;
  card_type: string;
  card_no: string;
  card_holder: string;
  card_issuer: string;
  card_brand: string;
  card_sub_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  store_id: string;
  verify_sign: string;
  verify_key: string;
  risk_level: number;
  risk_title: string;
  status: string;
  error_code: string;
  error_reason: string;
  bank_tran_id: string;
  invoice_no: string;
  store_passwd: string;
  type: string;
  EMItranId: string;
  EMI_tenure_month: number;
  EMI_tenure_year: number;
}
```

**Backend Response:**
```typescript
{
  success: true,
  message: "Payment success recorded",
  data: {
    payment_id: 1,
    tran_id: "PG-20240413123456-12345",
    order_id: 123,
    order_invoice: "WEB-1234567890",
    amount: 5000.00,
    status: "paid",
    callback_type: "success"
  }
}
```

#### Fail Callback
**Endpoint:** `POST /payments/fail`

#### Cancel Callback
**Endpoint:** `POST /payments/cancel`

#### IPN (Instant Payment Notification)
**Endpoint:** `POST /payments/ipn`

---

## Payment Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Completes Checkout                                │
│                                                                  │
│  Cart → Checkout → Review Order → Click "Pay Now"              │
│                                                                  │
│  Frontend needs:                                                   │
│  - sales_order_id (from order creation API)                     │
│  - customer info (from checkout form or logged-in user)          │
│  - shipping_address                                               │
│  - emi_option (if user selected EMI)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend Initiates Payment                                │
│                                                                  │
│  POST /api/v2/store/payments/initiate                            │
│  {                                                               │
│    sales_order_id: 123,                                          │
│    customer_name: "John Doe",                                    │
│    customer_email: "john@example.com",                           │
│    customer_phone: "01712345678",                                │
│    customer_address: { ... },                                     │
│    emi_option: 0                                                  │
│  }                                                               │
│                                                                  │
│  Backend Response:                                               │
│  {                                                               │
│    gateway_url: "https://...",                                   │
│    tran_id: "PG-20240413123456-12345"                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Frontend Redirects to SSL Commerz                           │
│                                                                  │
│  window.location.href = gateway_url                              │
│                                                                  │
│  OR                                                             │
│                                                                  │
│  Open in new window (recommended):                               │
│  window.open(gateway_url, '_blank', 'noreferrer')              │
│                                                                  │
│  Store tran_id in localStorage/state for callback handling        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: SSL Commerz Payment Page                                  │
│                                                                  │
│  User sees:                                                       │
│  - Order amount                                                   │
│  - Payment method options:                                       │
│    • Card (Visa/Mastercard)                                       │
│    • bKash                                                         │
│    • Nagad                                                         │
│    • Mobile Banking (all BD banks)                               │
│  - EMI options (if enabled)                                      │
│  - Payment button                                                 │
│                                                                  │
│  User completes payment → SSL Commerz handles transaction        │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴──────────────────┐
            ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────┐
│  User Redirected     │         │  IPN Sent              │
│  (Browser)            │         │  (Server-to-Server)    │
│                       │         │                        │
│  Frontend receives:   │         │  Backend:               │
│  - success_url        │         │  - Verifies hash        │
│  - fail_url           │         │  - Updates payment       │
│  - cancel_url         │         │  - Updates order         │
│                       │         │  - Sends email           │
│  Frontend shows:       │         │  - Returns 200 OK        │
│  - Success page       │         │                        │
│  - Failed page        │         │                        │
│  - Cancelled page     │         │                        │
└──────────────────────┘         └──────────────────────┘
```

---

## Frontend Implementation

### TypeScript Types

```typescript
// types/payment.ts

export interface CustomerAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  district?: string;
  country: string;
  postal_code?: string;
}

export interface InitiatePaymentRequest {
  sales_order_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  customer_address: CustomerAddress;
  emi_option?: number;
}

export interface InitiatePaymentResponse {
  payment_id: number;
  gateway_url: string;
  tran_id: string;
  amount: number;
  currency: string;
  sandbox: boolean;
}

export interface PaymentStatusResponse {
  payment_id: number;
  tran_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paid_at?: string;
  order_id: number;
  order_invoice: string;
  order_payment_status: 'unpaid' | 'paid' | 'partial';
}

export interface EmiOption {
  tenure: number;
  interest_rate: number;
  monthly_payment: number;
  total_amount: number;
  total_interest: number;
}

export interface EmiOptionsResponse {
  amount: number;
  currency: string;
  emi_enabled: boolean;
  min_amount: number;
  options: EmiOption[];
  banks: Record<number | string, string>;
}

export interface PaymentCallbackResponse {
  payment_id: number;
  tran_id: string;
  order_id: number;
  order_invoice: string;
  amount: number;
  status: string;
  callback_type: 'success' | 'fail' | 'cancel';
}
```

---

### React Hook Example

```typescript
// hooks/usePayment.ts

import { useState, useCallback } from 'react';
import axios from 'axios';
import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  EmiOptionsResponse
} from '@/types/payment';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2';

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initiate payment for an order
   */
  const initiatePayment = useCallback(async (data: InitiatePaymentRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<InitiatePaymentResponse>(
        `${API_BASE_URL}/store/payments/initiate`,
        data
      );

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Payment initiation failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Get EMI options for an amount
   */
  const getEmiOptions = useCallback(async (amount: number) => {
    try {
      const response = await axios.post<EmiOptionsResponse>(
        `${API_BASE_URL}/store/payments/emi-options`,
        { amount }
      );

      return response.data;
    } catch (err) {
      console.error('Failed to fetch EMI options:', err);
      return null;
    }
  }, []);

  /**
   * Get payment status by transaction ID
   */
  const getPaymentStatus = useCallback(async (tranId: string) => {
    try {
      const response = await axios.get<PaymentStatusResponse>(
        `${API_BASE_URL}/store/payments/status/${tranId}`
      );

      return response.data;
    } catch (err) {
      console.error('Failed to fetch payment status:', err);
      return null;
    }
  }, []);

  /**
   * Redirect to SSL Commerz gateway
   */
  const redirectToGateway = useCallback((gatewayUrl: string) => {
    // Save current URL for redirect back
    const returnUrl = window.location.href;
    sessionStorage.setItem('payment_return_url', returnUrl);

    // Redirect to SSL Commerz
    window.location.href = gatewayUrl;
  }, []);

  return {
    loading,
    error,
    initiatePayment,
    getEmiOptions,
    getPaymentStatus,
    redirectToGateway,
  };
}
```

---

## Code Examples

### 1. Payment Page Component

```typescript
// app/checkout/payment-page.tsx

'use client';

import { useState, useEffect } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { useSearchParams } from 'next/navigation';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      address_line1: '',
      city: '',
      country: 'Bangladesh',
      postal_code: '',
    },
  });

  const [selectedEmi, setSelectedEmi] = useState<number>(0);
  const [emiOptions, setEmiOptions] = useState(null);

  const {
    loading,
    error,
    initiatePayment,
    getEmiOptions,
    redirectToGateway,
  } = usePayment();

  // Fetch order details and EMI options
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  // Fetch EMI options when amount is known
  const fetchEmiOptions = async (amount: number) => {
    const response = await getEmiOptions(amount);
    if (response?.emi_enabled) {
      setEmiOptions(response);
    }
  };

  const handlePayment = async () => {
    try {
      const response = await initiatePayment({
        sales_order_id: parseInt(orderId!),
        customer_name: customerInfo.name,
        customer_email: customerInfo.email || undefined,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        emi_option: selectedEmi,
      });

      // Redirect to SSL Commerz
      redirectToGateway(response.gateway_url);

      // Store tran_id for status polling (optional)
      sessionStorage.setItem('payment_tran_id', response.tran_id);
    } catch (err) {
      // Show error to user
      alert(err.message);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1>Complete Your Payment</h1>

      {/* Order Summary */}
      <div className="mb-6">
        <h2>Order Summary</h2>
        {/* Display order details here */}
      </div>

      {/* Customer Information */}
      <div className="mb-6">
        <h2>Contact Information</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={customerInfo.name}
          onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
          className="w-full border p-2 rounded"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={customerInfo.email}
          onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
          className="w-full border p-2 rounded mt-2"
        />
        <input
          type="tel"
          placeholder="Mobile Number"
          value={customerInfo.phone}
          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
          className="w-full border p-2 mt-2"
        />
      </div>

      {/* Shipping Address */}
      <div className="mb-6">
        <h2>Shipping Address</h2>
        <input
          type="text"
          placeholder="Address Line 1"
          value={customerInfo.address.address_line1}
          onChange={(e) => setCustomerInfo({
            ...customerInfo,
            address: { ...customerInfo.address, address_line1: e.target.value }
          })}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="City"
          value={customerInfo.address.city}
          onChange={(e) => setCustomerInfo({
            ...customerInfo,
            address: { ...customerInfo.address, city: e.target.value }
          })}
          className="w-full border p-2 rounded mt-2"
        />
      </div>

      {/* EMI Options */}
      {emiOptions?.emi_enabled && (
        <div className="mb-6">
          <h2>EMI Options</h2>
          <select
            value={selectedEmi}
            onChange={(e) => setSelectedEmi(parseInt(e.target.value))}
            className="w-full border p-2 rounded"
          >
            <option value={0}>No EMI</option>
            {Object.entries(emiOptions.banks).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>

          {selectedEmi > 0 && (
            <div className="mt-4">
              <h3>EMI Plans</h3>
              {emiOptions.options.map((option) => (
                <div key={option.tenure} className="border p-3 rounded mb-2">
                  <div className="flex justify-between">
                    <span>{option.tenure} Months</span>
                    <span className="font-bold">
                      ৳{option.monthly_payment.toFixed(2)}/month
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: ৳{option.total_amount.toFixed(2)}
                    (Interest: ৳{option.total_interest.toFixed(2)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Processing...' : `Pay ৳${orderDetails?.total_amount || 0}`}
      </button>

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
```

---

### 2. Payment Success Page

```typescript
// app/payment/success/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    handlePaymentCallback();
  }, []);

  const handlePaymentCallback = async () => {
    const callbackData = {
      tran_id: searchParams.get('tran_id'),
      status: searchParams.get('status'),
      error_code: searchParams.get('error_code'),
      error_reason: searchParams.get('error_reason'),
    };

    // Call your backend to verify the payment
    try {
      const response = await fetch('/api/payment/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callbackData),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setOrderData(result.data);

        // Redirect to order confirmation page after 3 seconds
        setTimeout(() => {
          router.push(`/account/orders/${result.data.order_invoice}`);
        }, 3000);
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('Payment callback failed:', err);
      setStatus('failed');
    }
  };

  return (
    <div className="container mx-auto py-16 text-center">
      {status === 'loading' && (
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl">Processing your payment...</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl mb-8">
            Thank you for your payment. Your order is being processed.
          </p>
          {orderData && (
            <div className="bg-gray-50 p-6 rounded-lg inline-block text-left">
              <p><strong>Order:</strong> {orderData.order_invoice}</p>
              <p><strong>Amount:</strong> ৳{orderData.amount}</p>
              <p><strong>Transaction ID:</strong> {orderData.tran_id}</p>
            </div>
          )}
          <p className="text-sm text-gray-600 mt-4">
            Redirecting to your order details...
          </p>
        </div>
      )}

      {status === 'failed' && (
        <div>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Payment Failed
          </h1>
          <p className="text-xl mb-8">
            Unfortunately, your payment could not be processed.
          </p>
          <button
            onClick={() => router.push('/checkout')}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 3. Payment with Polling (Alternative Approach)

If you prefer to poll for payment status instead of relying solely on callbacks:

```typescript
// hooks/usePaymentPolling.ts

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLLING_DURATION = 300000; // 5 minutes

export function usePaymentPolling(tranId: string | null) {
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (!tranId || status !== 'pending') return;

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status/${tranId}`);
        const result = await response.json();

        if (result.success && result.data.status === 'paid') {
          setStatus('paid');
          setOrderData(result.data);
        } else if (result.data.status === 'failed') {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Polling failed:', err);
      }
    };

    // Start polling
    const interval = setInterval(pollPaymentStatus, POLL_INTERVAL);

    // Stop polling after max duration
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (status === 'pending') {
        setStatus('timeout');
      }
    }, MAX_POLLING_DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [tranId, status]);

  return { status, orderData };
}
```

---

### 4. Redux Toolkit Implementation (Alternative)

If using Redux:

```typescript
// store/paymentSlice.ts

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

interface PaymentState {
  loading: boolean;
  error: string | null;
  currentTransaction: {
    tran_id: string;
    gateway_url: string;
  } | null;
}

const initialState: PaymentState = {
  loading: false,
  error: null,
  currentTransaction: null,
};

export const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearTransaction: (state) => {
      state.currentTransaction = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiatePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTransaction = {
          tran_id: action.payload.tran_id,
          gateway_url: action.payload.gateway_url,
        };
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Payment initiation failed';
      });
  },
});

export const { clearTransaction } = paymentSlice.actions;

// Async thunk
export const initiatePayment = createAsyncThunk(
  'payment/initiate',
  async (
    args: {
      sales_order_id: number;
      customer_info: CustomerInfo;
      shipping_address: Address;
      emi_option?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/v2/store/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        throw new Error('Payment initiation failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

### 5. Payment Service (API Layer)

```typescript
// services/paymentApi.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2';

export const paymentApi = {
  /**
   * Initiate payment for an order
   */
  async initiatePayment(data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const response = await axios.post<InitiatePaymentResponse>(
      `${API_BASE_URL}/store/payments/initiate`,
      data
    );
    return response.data;
  },

  /**
   * Get EMI options for an amount
   */
  async getEmiOptions(amount: number): Promise<EmiOptionsResponse> {
    const response = await axios.post<EmiOptionsResponse>(
      `${API_BASE_URL}/store/payments/emi-options`,
      { amount }
    );
    return response.data;
  },

  /**
   * Get payment status by transaction ID
   */
  async getPaymentStatus(tranId: string): Promise<PaymentStatusResponse> {
    const response = await axios.get<PaymentStatusResponse>(
      `${API_BASE_URL}/store/payments/status/${tranId}`
    );
    return response.data;
  },

  /**
   * Notify backend about payment callback (for cross-origin callbacks)
   */
  async notifyCallback(callbackData: any): Promise<PaymentCallbackResponse> {
    const response = await axios.post<PaymentCallbackResponse>(
      `${API_BASE_URL}/store/payments/callback`,
      callbackData
    );
    return response.data;
  },
};
```

---

## Error Handling

### Common Error Scenarios

```typescript
// Error types and handling

export enum PaymentErrorType {
  VALIDATION_ERROR = 'validation_error',
  ORDER_NOT_FOUND = 'order_not_found',
  ORDER_ALREADY_PAID = 'order_already_paid',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  NETWORK_ERROR = 'network_error',
  INVALID_CALLBACK = 'invalid_callback',
}

export class PaymentError extends Error {
  constructor(
    public type: PaymentErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// Error handling component
export function handlePaymentError(error: any) {
  console.error('Payment error:', error);

  if (error.response?.status === 422) {
    // Validation error
    const errors = error.response.data.errors;
    return new PaymentError(
      PaymentErrorType.VALIDATION_ERROR,
      'Please check your information',
      errors
    );
  }

  if (error.response?.status === 404) {
    // Order not found
    return new PaymentError(
      PaymentErrorType.ORDER_NOT_FOUND,
      'Order not found. Please check your order ID.'
    );
  }

  if (error.response?.data?.message?.includes('already fully paid')) {
    // Order already paid
    return new PaymentError(
      PaymentErrorType.ORDER_ALREADY_PAID,
      'This order has already been paid.'
    );
  }

  // Network error
  return new PaymentError(
    PaymentErrorType.NETWORK_ERROR,
    'Network error. Please try again.'
  );
}
```

---

## Testing Guide

### Sandbox Test Environment

**SSL Commerz Sandbox Credentials:**
- Store ID: `test_box`
- Store Password: `qwerty` (or your sandbox password)

**Test Card:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/2025`)
- Card Type: VISA

**Test Flow:**

1. Create test order via API
2. Initiate payment with test card
3. On SSL Commerz page:
   - Select "Card" as payment method
   - Enter test card details
   - Click "Process Payment"
4. You'll be redirected to success page
5. Check database — payment should be marked as "paid"

---

### Test API Calls

```bash
# 1. Test EMI options
curl -X POST http://localhost:8000/api/v2/store/payments/emi-options \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# 2. Test payment status (after payment)
curl http://localhost:8000/api/v2/store/payments/status/PG-20240413123456-12345

# 3. Test payment verification cron
curl "http://localhost:8000/api/v2/store/payments/verify-pending?secret=test_secret"
```

---

### Frontend Testing Checklist

- [ ] Customer can select EMI options
- [ ] Form validation works for all required fields
- [ ] Phone number accepts BD format (11 digits starting with 01)
- [ ] Redirect to SSL Commerz gateway works
- [ ] After payment, user lands on success/fail page correctly
- [ ] Order is marked as "paid" in database
- [ ] Email confirmation is sent (check logs)
- [ ] User cannot pay twice for same order
- [ ] Guest checkout works without login
- [ ] Authenticated user checkout works
- [ ] Token-authenticated status check works

---

## Production Checklist

### Before Going Live

- [ ] Update `.env` with live SSL Commerz credentials
- [ ] Set `SSLCOMMERZ_MODE=live`
- [ ] Update all callback URLs to production domain
- [ ] Set strong `PAYMENT_VERIFY_CRON_SECRET`
- [ ] Test live credentials with small amount (৳10)
- [ ] Ensure HTTPS is enabled on all domains
- [ ] Set up cron job for payment verification
- [ ] Configure email (Gmail SMTP) with app password
- [ ] Test complete payment flow in live mode
- [ ] Monitor IPN logs for first few transactions

### Security Checklist

- [ ] All callback URLs use HTTPS
- [ ] Hash verification is implemented
- [ ] SQL injection protection (Eloquent ORM)
- [ ] CSRF protection (token-based)
- [ ] Rate limiting on payment endpoints
- [ ] Input validation on all endpoints
- [ ] Sensitive data not logged (card numbers, etc.)
- [ ] Environment variables not committed to git

---

## Quick Start Example

### Minimal Working Example

```typescript
// app/payment/page.tsx

'use client';

import { useState } from 'react';
import { usePayment } from '@/hooks/usePayment';

export default function PaymentPage() {
  const [orderId] = useState(123);
  
  const { initiatePayment, redirectToGateway } = usePayment();

  const handlePay = async () => {
    const result = await initiatePayment({
      sales_order_id: orderId,
      customer_name: 'John Doe',
      customer_phone: '01712345678',
      customer_address: {
        address_line1: 'House 1, Road 2',
        city: 'Dhaka',
        country: 'Bangladesh',
      },
    });

    // Redirect to SSL Commerz
    window.location.href = result.gateway_url;
  };

  return (
    <button onClick={handlePay}>
      Pay Now
    </button>
  );
}
```

---

## Support

For issues or questions:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check browser console for errors
3. Verify API base URL is correct
4. Ensure CORS is configured for your domain
5. Test with sandbox credentials first

---

**Last Updated:** April 13, 2026  
**API Version:** v2  
**SSL Commerz API Version:** v4
