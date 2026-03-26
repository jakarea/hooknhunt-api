# PER-ITEM Percentage Check Implementation

## Overview
Implemented PER-ITEM lost percentage check logic for receiving goods modal, replacing the previous TOTAL order percentage check.

## Changes Made

### 1. Parent Component (`page.tsx`)
**File**: `hooknhunt-api/resources/js/app/admin/procurement/orders/[id]/page.tsx`

**Line 1184**: Added `shippingCost` prop to `ReceivingModal`
```tsx
shippingCost={Number(order?.totalShippingCost) || extractShippingCostFromHistory() || 0}
```

**Why**: Shipping cost was showing 0 because the prop wasn't being passed from parent component.

---

### 2. Receiving Modal (`receiving-modal.tsx`)
**File**: `hooknhunt-api/resources/js/components/receiving-modal.tsx`

#### New Pure Function: `distributeCostsPerItem()`
**Lines**: 157-224

**Purpose**: Distributes costs PER-ITEM based on each item's own lost percentage

**Logic**:
```typescript
// Process each item independently based on ITS OWN lost percentage
return itemCalculations.map((calc) => {
  let adjustmentPerUnit = 0

  // PER-ITEM CHECK: Only distribute lost cost if THIS item's loss ≤ 10%
  if (calc.lostQty > 0 && calc.lostPercentage <= 10) {
    // Lost ≤ 10%: Distribute lost cost to this item's received units
    adjustmentPerUnit += (calc.lostValueBdt / calc.receivedQty)
  }
  // If lost > 10%, NO lost adjustment (goes to refund/manual review)

  // Found items: Reduce found value from this item
  if (calc.foundQty > 0) {
    adjustmentPerUnit -= (calc.foundQty * calc.originalUnitCostBdt / calc.receivedQty)
  }

  // Extra + shipping cost: Always distribute proportionally across ALL items
  adjustmentPerUnit += additionalCostPerUnit

  return {
    ...calc,
    finalUnitCostBdt: calc.originalUnitCostBdt + adjustmentPerUnit,
    priceAdjustmentBdt: adjustmentPerUnit,
  }
})
```

#### Updated `finalCalculations` useMemo
**Lines**: 877-902

**Old Logic**:
- Used TOTAL order percentage check (`reviewRequirement.requiresManualReview`)
- Applied same distribution strategy to ALL items

**New Logic**:
- Removed `reviewRequirement` dependency
- Now uses `distributeCostsPerItem()` function
- Each item is checked independently

```typescript
const finalCalculations = useMemo(() => {
  const calcsArray = Object.values(rawCalculations)

  // Apply PER-ITEM distribution logic (each item's percentage checked independently)
  const distributedCalcs = distributeCostsPerItem(calcsArray, extraCost, shippingCost)

  // Convert array back to object for easy lookup by item ID
  const calcsObject: Record<number, ItemCalculation> = {}
  let index = 0
  items.forEach((item) => {
    if (distributedCalcs[index]) {
      calcsObject[item.id] = distributedCalcs[index]
      index++
    }
  })

  return calcsObject
}, [rawCalculations, extraCost, shippingCost, items])
```

#### Updated Order Status Determination
**Lines**: 994-998

**Logic**: Order is `partially_completed` if ANY item has losses OR found items
```typescript
const hasAnyLostItems = Object.values(finalCalculations).some(calc => calc.lostQty > 0)
const hasAnyFoundItems = Object.values(finalCalculations).some(calc => calc.foundQty > 0)
const isPartiallyCompleted = hasAnyLostItems || hasAnyFoundItems
```

#### Updated `SummaryAlert` Component
**Lines**: 562-654

**Changes**:
- Removed `reviewRequirement` prop
- Now receives `calculations` object directly
- Calculates refund amount for items with > 10% loss
- Shows appropriate warnings based on per-item analysis

```typescript
// Check if ANY item has > 10% loss (manual review required for that item)
const hasItemsWithHighLoss = Object.values(calculations).some(calc => calc.lostPercentage > 10)
const hasAnyLostItems = Object.values(calculations).some(calc => calc.lostQty > 0)
const hasAnyFoundItems = Object.values(calculations).some(calc => calc.foundQty > 0)

// Calculate total refund amount for items with > 10% loss
const totalRefundAmount = Object.values(calculations)
  .filter(calc => calc.lostPercentage > 10)
  .reduce((sum, calc) => sum + calc.lostValueBdt, 0)
```

#### Updated Submit Button Color & Text
**Lines**: 1113-1133

**New Logic**: Button color/text based on per-item analysis
```typescript
color={
  Object.values(finalCalculations).some(calc => calc.lostPercentage > 10)
    ? 'red'
    : Object.values(finalCalculations).some(calc => calc.lostQty > 0 || calc.foundQty > 0)
    ? 'orange'
    : 'green'
}
```

#### Removed Unused Code
- **Lines 113-117**: Removed `ReviewRequirement` interface (no longer needed)
- **Lines 152-181**: Removed `determineReviewRequirement()` function (no longer needed)
- **Lines 870-875**: Removed `rawStats` useMemo (no longer needed)

---

### 3. Translation Files

#### English (`en.json`)
**Lines 773-831**: Added `foundItemsInfo` key
```json
"foundItemsInfo": "✓ {{foundUnits}} extra units received. Found items reduce cost proportionally."
```

#### Bengali (`bn.json`)
**Lines 335-393**: Added `foundItemsInfo` key
```json
"foundItemsInfo": "✓ {{foundUnits}} অতিরিক্ত ইউনিট পাওয়া গেছে। পাওয়া আইটেমগুলো খরচ হ্রাস করে।"
```

---

## Business Logic Comparison

### OLD (TOTAL Order Percentage Check)
```
IF total order lost % > 10%:
  → ALL items get NO price adjustment
  → ALL lost costs go to refund

ELSE IF total order lost % ≤ 10%:
  → ALL items get lost cost distributed
```

**Problem**: If Item A has 5% loss and Item B has 50% loss:
- Total might be ~27% → NO adjustments for ANY item
- Item A with 5% loss doesn't get price adjustment (unfair)

### NEW (PER-ITEM Percentage Check)
```
FOR EACH ITEM:
  IF this item's lost % > 10%:
    → THIS item gets NO price adjustment (goes to refund)
    → Extra + shipping cost still distributed

  ELSE IF this item's lost % ≤ 10%:
    → THIS item gets lost cost distributed
    → Extra + shipping cost distributed

  IF this item has found items:
    → Found value reduces cost
    → Extra + shipping cost distributed
```

**Benefit**: If Item A has 5% loss and Item B has 50% loss:
- Item A (5%): Gets price adjustment ✓
- Item B (50%): Lost cost goes to refund, no adjustment ✓

---

## Examples

### Example 1: Mixed Scenario
**Order**:
- Item A: Ordered 100, Received 95 (lost 5%)
- Item B: Ordered 100, Received 50 (lost 50%)
- Extra Cost: 1000 BDT
- Shipping Cost: 2000 BDT

**Results**:
- **Item A** (5% loss ≤ 10%):
  - Lost value: 5 × original_unit_cost
  - Adjustment: Lost cost distributed + (3000 × value_ratio ÷ 95)
  - Status: Price increased ✓

- **Item B** (50% loss > 10%):
  - Lost value: 50 × original_unit_cost
  - Adjustment: ONLY (3000 × value_ratio ÷ 50) - NO lost cost distribution
  - Status: Lost cost goes to refund

- **Order Status**: `partially_completed` (has losses)

### Example 2: All Items Within Threshold
**Order**:
- Item A: Ordered 100, Received 95 (lost 5%)
- Item B: Ordered 200, Received 190 (lost 5%)
- Extra Cost: 500 BDT
- Shipping Cost: 0 BDT

**Results**:
- **Item A**: Lost cost distributed + (500 × value_ratio ÷ 95)
- **Item B**: Lost cost distributed + (500 × value_ratio ÷ 190)
- **Order Status**: `partially_completed`

### Example 3: No Losses
**Order**:
- Item A: Ordered 100, Received 100
- Item B: Ordered 200, Received 200
- Extra Cost: 500 BDT
- Shipping Cost: 1000 BDT

**Results**:
- **Item A**: ONLY (1500 × value_ratio ÷ 100)
- **Item B**: ONLY (1500 × value_ratio ÷ 200)
- **Order Status**: `received_hub` (no losses)

---

## Testing Checklist

- [x] Item A (5% loss) → gets price adjustment
- [x] Item B (50% loss) → no lost adjustment, only extra + shipping
- [x] Mixed items → some adjusted, some not
- [x] No losses → only extra + shipping distributed
- [x] Found items → cost reduced proportionally
- [x] Shipping cost showing correct value (not 0)
- [x] Order status = `partially_completed` if ANY item lost/found
- [x] Manual review warning shows correct refund amount
- [x] Submit button color updates correctly
- [x] Translations work in both English and Bengali

---

## Backend Integration Note

⚠️ **Backend (`PurchaseOrderController.php`) still uses TOTAL order percentage check**

**Current Backend Logic** (lines 547-550):
```php
$lostPercentage = ($totalLostQuantity / $totalOrderedQuantity) * 100;

if ($lostPercentage > 10) {
    // Manual review
}
```

**Required Backend Update**:
```php
foreach ($items as $item) {
    $lostPercentage = ($item->lost_quantity / $item->ordered_quantity) * 100;

    if ($lostPercentage > 10) {
        // This item's lost cost goes to refund
        $refundAmount += $item->lost_value;
    } else {
        // This item gets price adjustment
        $item->final_cost = $original_cost + $adjustment;
    }
}
```

---

## Summary

✅ **Implemented**: PER-ITEM percentage check in frontend
✅ **Fixed**: Shipping cost showing 0
✅ **Updated**: Translation keys for found items
✅ **Removed**: Unused functions and interfaces
⚠️ **Pending**: Backend update to match frontend logic

---

**Date**: 2025-02-21
**Status**: ✅ Frontend Complete, Backend Update Required
