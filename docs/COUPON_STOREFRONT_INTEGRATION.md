# Storefront Coupon Integration - Implementation Guide

## Overview

Integrate the coupon/discount system into the storefront checkout flow. When a customer applies a coupon code during checkout, the backend validates it, calculates the discount, and after order placement, records the usage.

**Backend is complete.** This doc covers what the storefront (Next.js) dev needs to do, plus one small backend addition.

---

## Architecture Summary

### Existing Backend (Already Built)

| Component | File | Purpose |
|-----------|------|---------|
| Discount model | `app/Models/Discount.php` | Full `validateForOrder()` with 11-step validation chain |
| CouponUsage model | `app/Models/CouponUsage.php` | Tracks usage; auto-increments `used_count` on creation |
| DiscountController | `app/Http/Controllers/Api/V2/DiscountController.php` | CRUD + `checkValidity()` + `bulkGenerate()` + `toggleStatus()` |
| Migrations | `database/migrations/2026_04_04_100001_add_columns_to_discounts_table.php` | Extended `discounts` table |
| | `database/migrations/2026_04_04_100002_create_coupon_usages_table.php` | `coupon_usages` table |

### Key Validation Rules (in `Discount::validateForOrder()`)

The `validateForOrder()` method checks these in order:
1. Coupon is active (`is_active`)
2. Start date reached (`starts_at`)
3. Not expired (`expires_at`)
4. Global usage limit not exceeded (`max_uses` vs `used_count`)
5. Minimum order amount met (`min_order_amount`)
6. Per-customer usage limit (`usage_limit_per_customer`)
7. Customer restriction (`customer_ids` — null = all customers)
8. First purchase only (`first_purchase_only`)
9. Product restriction (`product_ids` — null = all products)
10. Category restriction (`category_ids` — null = all categories)
11. Calculate discount with `max_discount_amount` cap for percentage type

### Database Tables

**`discounts` table** — key columns:
```
id, code, description, type (percentage|fixed_amount), amount,
max_discount_amount, min_order_amount, starts_at, expires_at,
max_uses, usage_limit_per_customer, used_count, is_active,
is_auto_apply, first_purchase_only, product_ids (JSON),
category_ids (JSON), customer_ids (JSON)
```

**`coupon_usages` table**:
```
id, coupon_id (FK), user_id (nullable FK), order_id, discount_amount, timestamps
```
- `CouponUsage::created` boot event auto-increments `Discount.used_count`

---

## Implementation Tasks

### Task 1: Backend — Add coupon validation to `placeOrder()`

**File**: `app/Http/Controllers/Api/V2/Website/OrderController.php`

**What to do**: Inside `placeOrder()`, AFTER validation (line 46) and BEFORE `SalesOrder::create()` (line 51):

```php
// ADD: Accept optional coupon_code in validation
// Add to the $request->validate() array:
'coupon_code' => 'nullable|string|max:50',

// ADD: Between line 48 (resolveCustomer) and line 51 (SalesOrder::create):
$couponDiscount = 0;
$appliedCoupon = null;

if (!empty($validated['coupon_code'])) {
    $coupon = \App\Models\Discount::where('code', strtoupper($validated['coupon_code']))->first();

    if (!$coupon) {
        return $this->sendError('Invalid coupon code', null, 422);
    }

    // Collect cart product IDs and category IDs from items
    $cartProductIds = collect($validated['items'])->pluck('product_id')->unique()->toArray();
    $cartCategoryIds = [];
    foreach ($validated['items'] as $item) {
        $product = \App\Models\Product::find($item['product_id']);
        if ($product && $product->category_ids) {
            $ids = is_string($product->category_ids)
                ? json_decode($product->category_ids, true)
                : $product->category_ids;
            if (is_array($ids)) {
                $cartCategoryIds = array_merge($cartCategoryIds, $ids);
            }
        }
    }
    $cartCategoryIds = array_unique($cartCategoryIds);

    $result = $coupon->validateForOrder(
        (float) $validated['subtotal'],
        $request->user()?->id,
        $cartProductIds,
        $cartCategoryIds
    );

    if (!$result['valid']) {
        return $this->sendError($result['error'], null, 422);
    }

    // Verify the discount matches what frontend sent (prevent tampering)
    $frontendDiscount = (float) ($validated['coupon_discount'] ?? 0);
    if (abs($frontendDiscount - $result['discount_amount']) > 0.01) {
        return $this->sendError('Coupon discount mismatch. Please reapply the coupon.', null, 422);
    }

    $couponDiscount = $result['discount_amount'];
    $appliedCoupon = $coupon;
}
```

Then **after** `$order = SalesOrder::create(...)` and AFTER the items loop (after line 83), add:

```php
// ADD: Create coupon usage record after successful order creation
if ($appliedCoupon) {
    \App\Models\CouponUsage::create([
        'coupon_id' => $appliedCoupon->id,
        'user_id'   => $request->user()?->id,
        'order_id'  => $order->id,
        'discount_amount' => $couponDiscount,
    ]);
}
```

**Important**: The `CouponUsage::created` boot event will auto-increment `Discount.used_count` — do NOT increment it manually.

---

### Task 2: Backend — Add storefront coupon validation route (public)

**File**: `routes/website.php`

Add a public route for the storefront to validate coupons before placing orders:

```php
// Add near line 49 (after sliders route, before authenticated routes):
Route::post('/coupons/validate', [OrderController::class, 'validateCoupon']);
```

**File**: `app/Http/Controllers/Api/V2/Website/OrderController.php`

Add this new method:

```php
/**
 * Validate a coupon code for the storefront checkout.
 * POST /api/v2/store/coupons/validate
 */
public function validateCoupon(Request $request): JsonResponse
{
    $validated = $request->validate([
        'code' => 'required|string|max:50',
        'cart_total' => 'required|numeric|min:0',
    ]);

    $coupon = \App\Models\Discount::where('code', strtoupper($validated['code']))->first();

    if (!$coupon) {
        return $this->sendError('Invalid coupon code', null, 404);
    }

    // For storefront, we pass user_id if authenticated for per-customer checks
    $result = $coupon->validateForOrder(
        (float) $validated['cart_total'],
        $request->user()?->id
    );

    if (!$result['valid']) {
        return $this->sendError($result['error']);
    }

    return $this->sendSuccess([
        'code' => $coupon->code,
        'type' => $coupon->type,
        'amount' => (float) $coupon->amount,
        'maxDiscountAmount' => $coupon->max_discount_amount ? (float) $coupon->max_discount_amount : null,
        'discountAmount' => $result['discount_amount'],
        'finalTotal' => $result['final_total'],
    ], 'Coupon is valid');
}
```

**Why a separate route?** The existing `POST /api/v2/catalog/discounts/check-validity` is behind auth middleware (admin panel). The storefront needs a public endpoint that also handles optional auth (guests can use coupons too).

---

### Task 3: Storefront (Next.js) — Add coupon code input to checkout

**Files to modify** (in the Next.js storefront project):
- Checkout page component (likely `src/app/checkout/page.tsx` or similar)
- Cart summary component

**UI Flow**:

```
┌─────────────────────────────────────┐
│ Cart Summary                        │
│ ────────────────────────────────    │
│ Subtotal:          ৳3,000           │
│ Delivery:          ৳60              │
│                                     │
│ ┌──────────────────────┐ ┌───────┐  │
│ │ Coupon code...       │ │ Apply │  │
│ └──────────────────────┘ └───────┘  │
│                                     │
│ ✅ SUMMER500 applied                │
│ Discount:         -৳500             │
│                                     │
│ Total:             ৳2,560           │
│ ────────────────────────────────    │
│ [Place Order]                       │
└─────────────────────────────────────┘
```

**State to manage**:
```typescript
interface CouponState {
  code: string;                    // input value
  appliedCoupon: {                 // null until validated
    code: string;
    type: 'percentage' | 'fixed_amount';
    discountAmount: number;
  } | null;
  isValidating: boolean;
  error: string | null;
}
```

**Apply coupon flow** (called when user clicks "Apply"):
```typescript
async function applyCoupon(code: string, cartTotal: number) {
  // Call: POST /api/v2/store/coupons/validate
  // Body: { code, cart_total: cartTotal }
  // On success: set appliedCoupon state, update cart total
  // On error: show error message under input
}
```

**Remove coupon flow**:
```typescript
function removeCoupon() {
  // Clear appliedCoupon state
  // Restore original cart total
}
```

**Place order flow** — add `coupon_code` and `coupon_discount` to the order payload:
```typescript
const orderPayload = {
  // ... existing fields ...
  coupon_code: appliedCoupon?.code || null,     // ADD
  coupon_discount: appliedCoupon?.discountAmount || 0,  // ADD (already sent as field)
};
// POST /api/v2/store/orders
```

---

### Task 4: Storefront — Error handling

| Scenario | Expected behavior |
|----------|-------------------|
| Invalid/expired coupon | Show error message under the coupon input, don't apply |
| Coupon removed during checkout | Clear discount, restore original total |
| Server validation fails at order time | Show error: "Coupon validation failed. Please reapply." |
| Discount tampering detected | Backend returns 422 with "discount mismatch" message |
| Guest uses first-purchase-only coupon | Backend rejects — `validateForOrder` gets `null` user_id, passes check 8, but check 6 (per-customer) is skipped. **Recommendation**: consider requiring login for first-purchase coupons on frontend |

---

### Task 5: Storefront — Auto-apply coupons

Coupons with `is_auto_apply = true` should be applied automatically at checkout.

**Implementation approach**:
```typescript
// On checkout page load, fetch auto-apply eligible coupons
// GET /api/v2/store/coupons/auto-apply?cart_total=3000
// (or use the validate endpoint with a special flag)

// For now, the simplest approach:
// 1. Add a new backend endpoint: GET /api/v2/store/coupons/auto-apply
// 2. Returns active auto-apply coupons that match the cart
// 3. Frontend applies the best one automatically
```

**Backend addition needed** (add to `OrderController`):
```php
/**
 * Get auto-apply coupons for storefront.
 * GET /api/v2/store/coupons/auto-apply?cart_total=3000
 */
public function autoApplyCoupons(Request $request): JsonResponse
{
    $validated = $request->validate([
        'cart_total' => 'required|numeric|min:0',
    ]);

    $coupons = \App\Models\Discount::where('is_active', true)
        ->where('is_auto_apply', true)
        ->where(function ($q) {
            $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
        })
        ->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
        })
        ->get()
        ->filter(function ($coupon) use ($validated, $request) {
            $result = $coupon->validateForOrder(
                (float) $validated['cart_total'],
                $request->user()?->id
            );
            return $result['valid'];
        })
        ->map(function ($coupon) use ($validated) {
            $result = $coupon->validateForOrder((float) $validated['cart_total']);
            return [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'amount' => (float) $coupon->amount,
                'discountAmount' => $result['discount_amount'],
                'description' => $coupon->description,
            ];
        })
        ->values();

    return $this->sendSuccess($coupons);
}
```

Add route in `routes/website.php`:
```php
Route::get('/coupons/auto-apply', [OrderController::class, 'autoApplyCoupons']);
```

---

## API Reference (Storefront Endpoints)

### Validate Coupon
```
POST /api/v2/store/coupons/validate
Content-Type: application/json

Request:
{
  "code": "SUMMER500",
  "cart_total": 3000
}

Success Response (200):
{
  "success": true,
  "data": {
    "code": "SUMMER500",
    "type": "percentage",
    "amount": 20,
    "maxDiscountAmount": 500,
    "discountAmount": 500,
    "finalTotal": 2500
  },
  "message": "Coupon is valid"
}

Error Response (422):
{
  "success": false,
  "message": "This coupon has expired."
}
```

### Auto-Apply Coupons
```
GET /api/v2/store/coupons/auto-apply?cart_total=3000

Response:
{
  "success": true,
  "data": [
    {
      "code": "WELCOME10",
      "type": "fixed_amount",
      "amount": 100,
      "discountAmount": 100,
      "description": "Welcome discount"
    }
  ]
}
```

### Place Order (existing, modified)
```
POST /api/v2/store/orders
Content-Type: application/json

Request (NEW fields marked):
{
  "customer_name": "John",
  "customer_phone": "01712345678",
  "items": [...],
  "subtotal": 3000,
  "delivery_charge": 60,
  "coupon_code": "SUMMER500",        // NEW - optional
  "coupon_discount": 500,             // existing field, now server-validated
  "payable_amount": 2560,
  "payment_method": "cod",
  "shipping_address": "123 Main St"
}
```

---

## File Change Summary

### Backend (this repo)
| File | Change |
|------|--------|
| `app/Http/Controllers/Api/V2/Website/OrderController.php` | Add `validateCoupon()`, `autoApplyCoupons()`, and coupon logic in `placeOrder()` |
| `routes/website.php` | Add 2 new routes: `/coupons/validate`, `/coupons/auto-apply` |

### Storefront (Next.js repo — separate project)
| Area | Change |
|------|--------|
| Checkout page | Add coupon code input, apply/remove button, discount display |
| Cart state/store | Add coupon state (appliedCoupon, validation status) |
| Order placement | Send `coupon_code` in order payload |

---

## Testing Checklist

- [ ] Valid coupon code → discount applied, order total correct
- [ ] Expired coupon → "expired" error shown
- [ ] Inactive coupon → "inactive" error shown
- [ ] Coupon with min_order_amount not met → error with minimum amount
- [ ] Coupon used up (max_uses) → "limit reached" error
- [ ] Same coupon used twice by same customer → "already used" error (if limit = 1)
- [ ] Coupon restricted to customer A, used by customer B → "not available" error
- [ ] First purchase coupon used by returning customer → "first-time only" error
- [ ] Product-restricted coupon with non-matching cart → "not applicable" error
- [ ] Percentage coupon with max_discount_amount cap → capped correctly
- [ ] Fixed amount coupon → exact amount deducted
- [ ] Coupon discount > cart total → discount = cart total (can't go negative)
- [ ] Order placed → `coupon_usages` row created, `discounts.used_count` incremented
- [ ] Auto-apply coupon appears automatically on checkout page load
- [ ] Guest checkout with coupon → works (user_id null in coupon_usages)
- [ ] Authenticated checkout with coupon → user_id recorded in coupon_usages
