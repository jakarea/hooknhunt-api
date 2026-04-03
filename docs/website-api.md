# Website Storefront API Documentation

> **Base URL**: `http://localhost:8000/api/v2/store`
> **Response Format**: All keys are **camelCase** (auto-converted by middleware)
> **Auth**: Laravel Sanctum Bearer token in `Authorization` header

---

## Standard Response Format

Every response follows this structure:

```json
{
  "status": true,
  "message": "Success",
  "data": {},
  "errors": null,
  "responseTime": 0.35
}
```

**Error response:**

```json
{
  "status": false,
  "message": "Error description",
  "data": null,
  "errors": { "field": ["Validation message"] },
  "responseTime": 0.12
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 401 | Unauthenticated (missing/invalid token) |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

### Authentication Header

For all authenticated endpoints:

```
Authorization: Bearer 1|abcdef123456
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Categories](#2-categories)
3. [Products](#3-products)
4. [Orders](#4-orders)
5. [Customer Account](#5-customer-account)
6. [Customer Addresses](#6-customer-addresses)
7. [Customer Orders](#7-customer-orders)
8. [Implementation Status](#8-implementation-status)

---

## 1. Authentication

All auth endpoints are **public** (no token required).

### POST /auth/register

Register a new customer account.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Full name (max 255) |
| `phone` | string | Yes | BD phone: `01[3-9]XXXXXXXX` (10 digits) |
| `email` | string | No | Email address (must be unique if provided) |
| `password` | string | Yes | Min 6 characters |
| `password_confirmation` | string | Yes | Must match `password` |

**Example Request:**

```json
{
  "name": "John Doe",
  "phone": "01712345678",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response (201):**

```json
{
  "status": true,
  "message": "Registration successful. Please verify OTP sent to your phone.",
  "data": null,
  "errors": null
}
```

> After registration, an OTP is sent to the phone number. Call `/auth/verify-otp` to activate the account.

---

### POST /auth/login

Login with phone/email and password.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `login_id` | string | Yes | Phone number or email |
| `password` | string | Yes | Min 6 characters |

**Example Request:**

```json
{
  "loginId": "01712345678",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "accessToken": "1|abcdef123456",
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "01712345678",
      "roleId": 10,
      "isActive": true,
      "emailVerifiedAt": "2026-03-29T10:00:00.000000Z",
      "phoneVerifiedAt": "2026-03-29T10:00:00.000000Z"
    }
  }
}
```

**Error (401):**

```json
{
  "status": false,
  "message": "Invalid credentials",
  "data": null
}
```

---

### POST /auth/verify-otp

Verify OTP to activate account (after registration).

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone` | string | Yes | Phone number used during registration |
| `otp` | string | Yes | 4-digit OTP code |

**Example Request:**

```json
{
  "phone": "01712345678",
  "otp": "1234"
}
```

**Response (200):**

```json
{
  "status": true,
  "message": "Phone verified successfully.",
  "data": {
    "accessToken": "1|abcdef123456",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "01712345678",
      "role": {
        "id": 10,
        "name": "Retail Customer"
      }
    }
  }
}
```

**Error (422):** Invalid or expired OTP.

---

### POST /auth/send-otp

Resend OTP to a phone number.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone` | string | Yes | Registered phone number |

**Response (200):**

```json
{
  "status": true,
  "message": "OTP sent successfully"
}
```

---

### POST /auth/send-reset-otp

> **Status: Not yet implemented** - Route exists but controller method is missing.

Send OTP for password reset.

---

### POST /auth/reset-password

> **Status: Not yet implemented** - Route exists but controller method is missing.

Reset password using OTP verification.

---

## 2. Categories

All category endpoints are **public**.

### GET /categories

List all active categories (paginated).

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Filter by category name |
| `page` | int | No | 1 | Page number |
| `per_page` | int | No | 20 | Items per page |

**Example Request:**

```
GET /api/v2/store/categories?search=electro&page=1&per_page=10
```

**Response (200):**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "currentPage": 1,
    "data": [
      {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "parentId": null,
        "imageId": 5,
        "isActive": true,
        "parent": null,
        "image": {
          "id": 5,
          "filePath": "/uploads/images/electronics.jpg"
        },
        "productsCount": 45
      }
    ],
    "firstPageUrl": "http://localhost:8000/api/v2/store/categories?page=1",
    "lastPageUrl": "http://localhost:8000/api/v2/store/categories?page=3",
    "nextPageUrl": "http://localhost:8000/api/v2/store/categories?page=2",
    "prevPageUrl": null,
    "path": "http://localhost:8000/api/v2/store/categories",
    "perPage": 20,
    "to": 20,
    "total": 45
  }
}
```

---

### GET /categories/featured

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

### GET /categories/{slug}

Get a single category with its children.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Category slug (e.g., `electronics`) |

**Response (200):**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "parentId": null,
    "imageId": 5,
    "isActive": true,
    "children": [
      {
        "id": 2,
        "name": "Mobile Phones",
        "slug": "mobile-phones",
        "parentId": 1
      }
    ],
    "parent": null,
    "image": {
      "id": 5,
      "filePath": "/uploads/images/electronics.jpg"
    }
  }
}
```

**Error (404):** Category not found.

---

## 3. Products

All product endpoints are **public**. Only **retail-channel** data is returned.

> **Important**: The store API only returns retail variants. Fields like `purchaseCost`, `moq`, `wholesaleName`, `customName`, and base `name` are **never exposed**. The `name` field in responses is the `retailName` (fallback to base name if retail name is null).

### GET /products

List published products with filtering, sorting, and pagination (retail only).

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search by retail name, base name, or SKU |
| `brand_id` | int | No | - | Filter by brand ID |
| `sort_by` | string | No | `created_at_desc` | Sort order (see below) |
| `page` | int | No | 1 | Page number |
| `per_page` | int | No | 20 | Items per page |

**Sort Options:**

| Value | Description |
|-------|-------------|
| `created_at_desc` | Newest first (default) |
| `created_at_asc` | Oldest first |
| `price_desc` | Highest retail price first |
| `price_asc` | Lowest retail price first |

**Example Request:**

```
GET /api/v2/store/products?brand_id=1&sort_by=price_asc&per_page=12
```

**Response (200):**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "currentPage": 1,
    "data": [
      {
        "id": 1,
        "name": "Smartphone X",
        "slug": "smartphone-x",
        "description": "High-end smartphone with advanced features",
        "shortDescription": "A great phone",
        "highlights": ["6.7\" Display", "128GB Storage", "5G Ready"],
        "includesInBox": ["Phone", "Charger", "Case"],
        "videoUrl": null,
        "warrantyEnabled": true,
        "warrantyDetails": "1 year manufacturer warranty",
        "seoTitle": "Smartphone X - Best Price",
        "seoDescription": "Buy Smartphone X at best price",
        "seoTags": ["smartphone", "mobile"],
        "thumbnail": {
          "id": 10,
          "fullUrl": "https://example.com/storage/uploads/smartphone-x.jpg",
          "alt": "smartphone-x.jpg"
        },
        "galleryImages": [
          { "fullUrl": "https://example.com/storage/uploads/img1.jpg" },
          { "fullUrl": "https://example.com/storage/uploads/img2.jpg" }
        ],
        "category": {
          "id": 1,
          "name": "Electronics",
          "slug": "electronics"
        },
        "brand": {
          "id": 1,
          "name": "TechBrand"
        },
        "variants": [
          {
            "id": 1,
            "variantName": "Black - 128GB",
            "variantSlug": "smartphone-x-black-128gb-retail",
            "sku": "ELEC-TCH-B128-R-1234",
            "price": 85000,
            "offerPrice": 80000,
            "offerStarts": null,
            "offerEnds": null,
            "stock": 50,
            "weight": "200.00",
            "size": null,
            "color": "Black",
            "isActive": true
          }
        ]
      }
    ],
    "perPage": 20,
    "total": 45
  }
}
```

---

### GET /products/hot-deals

Get products with the biggest discounts (retail only). Sorted by highest discount amount descending (`price - offerPrice`). Only includes variants where `offerPrice > 0` and `offerPrice < price`.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | int | No | 12 | Max products to return |

**Example Request:**

```
GET /api/v2/store/products/hot-deals?limit=8
```

**Response (200):**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": 5,
      "name": "Smartphone X",
      "slug": "smartphone-x",
      "thumbnail": {
        "id": 10,
        "fullUrl": "https://example.com/storage/uploads/img.jpg",
        "alt": "img.jpg"
      },
      "category": { "id": 1, "name": "Electronics", "slug": "electronics" },
      "brand": { "id": 1, "name": "TechBrand" },
      "variants": [
        {
          "id": 1,
          "variantName": "Black - 128GB",
          "sku": "SKU-R-1234",
          "price": 85000,
          "offerPrice": 75000,
          "stock": 50
        }
      ]
    }
  ]
}
```

> **Note:** Response uses the same full product structure as other product endpoints. Shorthand above for brevity.

---

### GET /products/featured

Get featured/published products for homepage (newest first, retail only).

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | int | No | 12 | Max products to return |

**Response (200):** Returns an array (not paginated) of product objects with the same structure as above.

```json
{
  "status": true,
  "message": "Success",
  "data": [
    { "id": 1, "name": "...", "variants": [...] },
    { "id": 2, "name": "...", "variants": [...] }
  ]
}
```

---

### GET /products/{slug}

Get a single published product with full details (retail only).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Product slug (e.g., `smartphone-x`) |

**Response (200):** Same product object structure as in the list (non-paginated).

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "Smartphone X",
    "slug": "smartphone-x",
    "description": "High-end smartphone with advanced features",
    "shortDescription": "A great phone",
    "highlights": ["6.7\" Display", "128GB Storage", "5G Ready"],
    "includesInBox": ["Phone", "Charger", "Case"],
    "videoUrl": null,
    "warrantyEnabled": true,
    "warrantyDetails": "1 year manufacturer warranty",
    "seoTitle": "Smartphone X - Best Price",
    "seoDescription": "Buy Smartphone X at best price",
    "seoTags": ["smartphone", "mobile"],
    "thumbnail": {
      "id": 10,
      "fullUrl": "https://example.com/storage/uploads/smartphone-x.jpg",
      "alt": "smartphone-x.jpg"
    },
    "galleryImages": [
      { "fullUrl": "https://example.com/storage/uploads/img1.jpg" }
    ],
    "category": {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics"
    },
    "brand": {
      "id": 1,
      "name": "TechBrand"
    },
    "variants": [
      {
        "id": 1,
        "variantName": "Black - 128GB",
        "variantSlug": "smartphone-x-black-128gb-retail",
        "sku": "ELEC-TCH-B128-R-1234",
        "price": 85000,
        "offerPrice": 80000,
        "offerStarts": null,
        "offerEnds": null,
        "stock": 50,
        "weight": "200.00",
        "size": null,
        "color": "Black",
        "isActive": true
      }
    ]
  }
}
```

**Error (404):** Product not found or not published.

---

### GET /products/{slug}/related

Get related products in the same category (retail only).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Product slug |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | int | No | 8 | Max products to return |

**Response (200):** Returns an array of product objects with the same structure.

---

### GET /categories/{categorySlug}/products

Get all published products in a specific category (retail only, paginated).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `categorySlug` | string | Category slug (e.g., `electronics`) |

**Query Parameters:** Same filters and sorting as `GET /products`.

**Response (200):** Same paginated structure as `GET /products`.

---

## 4. Orders

### POST /orders

Place a new order. Works for both **guest** and **authenticated** users. The backend resolves the variant and calculates the effective price (offer price if active).

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_name` | string | Yes | Full name (max 255) |
| `customer_phone` | string | Yes | Phone number (max 20) |
| `customer_email` | string | No | Email address |
| `items` | array | Yes | Array of order items (min 1) |
| `items[].product_id` | int | Yes | Product ID |
| `items[].variant_id` | int | No | Variant ID (if null, uses first active retail variant) |
| `items[].quantity` | int | Yes | Quantity (min 1) |
| `items[].unit_price` | numeric | Yes | Unit price from frontend (for validation) |
| `shipping_address` | string | Yes | Delivery address (max 500) |
| `shipping_city` | string | Yes | City (max 100) |
| `shipping_district` | string | No | District |
| `shipping_division` | string | No | Division |
| `shipping_thana` | string | No | Thana/Upazila |
| `payment_method` | string | Yes | `cod`, `bkash`, `nagad`, `bank`, etc. |
| `payment_details` | string | No | Payment reference/details |
| `subtotal` | numeric | Yes | Sum of item prices |
| `delivery_charge` | numeric | No | Delivery fee |
| `coupon_discount` | numeric | No | Coupon discount amount |
| `payable_amount` | numeric | Yes | Total payable (subtotal - discount + delivery) |
| `notes` | string | No | Order notes (max 1000) |

**Example Request:**

```json
{
  "customer_name": "Jakarea Parvez",
  "customer_phone": "01728247398",
  "customer_email": "jakarea@example.com",
  "items": [
    {
      "product_id": 14,
      "variant_id": null,
      "quantity": 1,
      "unit_price": 550
    }
  ],
  "shipping_address": "709 West Oak Road",
  "shipping_city": "Dhaka",
  "shipping_district": "Barishal",
  "shipping_division": "Barishal",
  "shipping_thana": "Babuganj",
  "payment_method": "cod",
  "payment_details": "Cash on delivery",
  "subtotal": 550,
  "delivery_charge": 60,
  "coupon_discount": 0,
  "payable_amount": 610,
  "notes": null
}
```

**Response (201):**

```json
{
  "status": true,
  "message": "Order placed successfully",
  "data": {
    "id": 1,
    "orderNumber": "WEB-69C912C03EF04",
    "status": "pending",
    "paymentStatus": "unpaid",
    "subTotal": 550,
    "discountAmount": 0,
    "deliveryCharge": 60,
    "totalAmount": 610,
    "paidAmount": 0,
    "dueAmount": 610,
    "notes": null,
    "shipping": {
      "address": "709 West Oak Road",
      "city": "Dhaka",
      "district": "Barishal",
      "division": "Barishal",
      "thana": "Babuganj"
    },
    "customer": {
      "name": "Jakarea Parvez",
      "phone": "01728247398",
      "email": "jakarea@example.com"
    },
    "items": [
      {
        "id": 1,
        "variantId": 14,
        "quantity": 1,
        "unitPrice": 550,
        "totalPrice": 550,
        "productName": "Product Name",
        "variantName": "Variant Name",
        "sku": "SKU-R-1234",
        "image": "https://example.com/storage/uploads/product.jpg"
      }
    ],
    "createdAt": "2026-03-29T17:53:36+06:00"
  }
}
```

**Important Notes:**

- **Price is server-authoritative**: The backend uses the variant's actual `offer_price` (if active) or `price`, NOT the frontend-submitted `unit_price`. This prevents price manipulation.
- **`variant_id: null`**: If the frontend sends `variant_id` as null, the backend automatically picks the first active retail variant for that product.
- **COD orders**: `paymentStatus` is `unpaid`, `dueAmount` equals `totalAmount`.
- **Non-COD orders**: `paymentStatus` is `paid`, `paidAmount` equals `totalAmount`.
- **Stock is decremented** immediately upon order placement.

**Error (422):** Validation failed (missing required fields, invalid product_id, etc.)
**Error (500):** Order placement failed (stock insufficient, database error)

---

### POST /orders/verify

Verify/confirm payment for an order (e.g., after online payment gateway callback).

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | int | Yes | Sales order ID |
| `payment_ref` | string | No | Payment reference from gateway |

**Response (200):**

```json
{
  "status": true,
  "message": "Order verified successfully",
  "data": {
    "id": 1,
    "orderNumber": "WEB-69C912C03EF04",
    "status": "processing",
    "paymentStatus": "paid",
    "totalAmount": 610
  }
}
```

**Error (400):** Invalid order channel.
**Error (404):** Order not found.

---

## 5. Customer Account

All account endpoints require **authentication** (`auth:sanctum`).

### GET /account/me

Get authenticated customer's full profile with addresses.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "status": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Retail Customer",
      "phoneNumber": "01712345678",
      "emailVerifiedAt": "2026-03-29T10:00:00.000000Z",
      "phoneVerifiedAt": "2026-03-29T10:00:00.000000Z",
      "createdAt": "2026-03-29T10:00:00.000000Z",
      "updatedAt": "2026-03-29T10:00:00.000000Z",
      "customerProfile": {
        "dob": "1990-01-01",
        "gender": "male",
        "whatsappNumber": "01712345678",
        "preferredLanguage": "en",
        "preferredCurrency": "BDT",
        "loyaltyTier": "bronze",
        "loyaltyPoints": 100,
        "totalOrders": 5,
        "totalSpent": 125000.00,
        "avgOrderValue": 25000.00
      },
      "addresses": [
        {
          "id": 1,
          "type": "home",
          "recipientName": "John Doe",
          "phone": "01712345678",
          "address": "123 Main Street",
          "city": "Dhaka",
          "district": "Dhaka",
          "postalCode": "1000",
          "isDefault": true
        }
      ]
    }
  }
}
```

**Error (401):** Unauthenticated.

---

### POST /account/logout

Logout and invalidate the current token.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "status": true,
  "message": "Logged out successfully"
}
```

---

### PUT /account/profile

Update the authenticated customer's profile.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Full name (max 255) |
| `email` | string | No | Email (must be unique) |
| `phone_number` | string | No | Phone number (must be unique) |
| `dob` | string | No | Date of birth (YYYY-MM-DD) |
| `gender` | string | No | `male`, `female`, `other` |
| `preferred_language` | string | No | Language code (max 10) |
| `preferred_currency` | string | No | Currency code (max 10) |

> **Note:** All fields are optional (`sometimes` validation). Only send fields you want to update.

**Example Request:**

```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "dob": "1990-01-01",
  "gender": "male"
}
```

**Response (200):**

```json
{
  "status": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Updated",
      "email": "john.updated@example.com"
    }
  }
}
```

> **Status: Partially implemented** - Route exists but controller method needs completion.

---

## 6. Customer Addresses

All address endpoints require **authentication** (`auth:sanctum`).

### GET /account/addresses

List all saved addresses for the authenticated customer.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "label": "Home",
      "fullName": "John Doe",
      "phone": "01712345678",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apt 4B",
      "area": "Gulshan",
      "city": "Dhaka",
      "postalCode": "1000",
      "division": "Dhaka",
      "country": "Bangladesh",
      "isDefault": true,
      "isBillingAddress": true,
      "isShippingAddress": true
    }
  ]
}
```

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

### POST /account/addresses

Add a new address.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `label` | string | No | Address label (max 50), e.g., "Home", "Office" |
| `full_name` | string | Yes | Recipient name (max 255) |
| `phone` | string | Yes | Contact phone (max 20) |
| `address_line1` | string | Yes | Address line 1 (max 255) |
| `address_line2` | string | No | Address line 2 (max 255) |
| `area` | string | No | Area/locality (max 100) |
| `city` | string | Yes | City (max 100) |
| `postal_code` | string | No | Postal/ZIP code (max 20) |
| `division` | string | No | Division/state (max 100) |
| `country` | string | No | Country (max 100) |
| `is_default` | boolean | No | Set as default address |
| `is_billing_address` | boolean | No | Set as billing address |
| `is_shipping_address` | boolean | No | Set as shipping address |

**Response (201):**

```json
{
  "status": true,
  "message": "Address added successfully",
  "data": {
    "id": 2,
    "label": "Office",
    "fullName": "John Doe",
    "phone": "01712345678",
    "addressLine1": "456 Office Road",
    "addressLine2": null,
    "area": "Motijheel",
    "city": "Dhaka",
    "postalCode": "1205",
    "division": "Dhaka",
    "country": "Bangladesh",
    "isDefault": false,
    "isBillingAddress": true,
    "isShippingAddress": false
  }
}
```

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

### PUT /account/addresses/{address}

Update an existing address.

**Headers:** `Authorization: Bearer {token}`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | int | Address ID |

**Request Body:** Same fields as create address (all optional).

**Response (200):**

```json
{
  "status": true,
  "message": "Address updated successfully",
  "data": { }
}
```

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

### DELETE /account/addresses/{address}

Delete an address.

**Headers:** `Authorization: Bearer {token}`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | int | Address ID |

**Response (200):**

```json
{
  "status": true,
  "message": "Address deleted successfully"
}
```

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

## 7. Customer Orders

All order history endpoints require **authentication** (`auth:sanctum`).

### GET /account/orders

List all orders for the authenticated customer.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**

```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-2026-001",
      "totalAmount": 125000.00,
      "status": "delivered",
      "createdAt": "2026-03-28T14:30:00.000000Z"
    }
  ]
}
```

**Possible Order Statuses:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`

> Returns empty array `[]` if customer has no orders or no customer record is linked.

---

### GET /account/orders/{order}

Get details of a specific order.

**Headers:** `Authorization: Bearer {token}`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `order` | int | Order ID |

> **Status: Not yet implemented** - Route exists but controller method is missing.

---

## 8. Implementation Status

### Fully Implemented

| Endpoint | Status |
|----------|--------|
| `POST /auth/register` | Ready |
| `POST /auth/login` | Ready |
| `POST /auth/verify-otp` | Ready |
| `POST /auth/send-otp` | Ready |
| `GET /categories` | Ready |
| `GET /categories/{slug}` | Ready |
| `GET /products` | Ready (retail only) |
| `GET /products/hot-deals` | Ready (retail only) |
| `GET /products/featured` | Ready (retail only) |
| `GET /products/{slug}` | Ready (retail only) |
| `GET /products/{slug}/related` | Ready (retail only) |
| `GET /categories/{categorySlug}/products` | Ready (retail only) |
| `GET /account/me` | Ready |
| `POST /account/logout` | Ready |
| `POST /orders` | Ready |
| `POST /orders/verify` | Ready |
| `GET /account/orders` | Ready |
| `GET /account/orders/{order}` | Ready |

### Routes Defined, Controller Not Implemented

| Endpoint | Status |
|----------|--------|
| `POST /auth/send-reset-otp` | Route exists, no controller method |
| `POST /auth/reset-password` | Route exists, no controller method |
| `GET /auth/test-sms-balance` | Route exists, dev only |
| `GET /categories/featured` | Route exists, no controller method |
| `PUT /account/profile` | Route exists, controller partial |
| `GET /account/addresses` | Route exists, no controller method |
| `POST /account/addresses` | Route exists, no controller method |
| `PUT /account/addresses/{address}` | Route exists, no controller method |
| `DELETE /account/addresses/{address}` | Route exists, no controller method |
| `GET /account/orders/{order}` | Route exists, no controller method |

---

## Quick Reference: Frontend Integration

### Typical User Flow

```
1. Browse Products   → GET /products, GET /products/{slug}
2. Browse Categories  → GET /categories, GET /categories/{slug}
3. Register/Login     → POST /auth/register → POST /auth/verify-otp
                       → POST /auth/login
4. View Profile       → GET /account/me
5. Manage Addresses   → GET/POST/PUT/DELETE /account/addresses
6. Place Order        → POST /orders
7. View Orders        → GET /account/orders
```

### Image URLs

Images are returned as full URLs in `thumbnail.fullUrl` and `galleryImages[].fullUrl`. No URL construction needed on the frontend.

```json
"thumbnail": { "id": 10, "fullUrl": "https://example.com/storage/uploads/img.jpg", "alt": "img.jpg" }
```

### Phone Number Format

All Bangladeshi phone numbers must match: `01[3-9]XXXXXXXX` (11 digits starting with 01).

### OTP Flow

1. Register or call `/auth/send-otp`
2. OTP is a 4-digit code sent via SMS
3. OTP expires in **5 minutes**
4. Verify via `/auth/verify-otp`
5. To resend: call `/auth/send-otp` again (old OTP is deleted)
