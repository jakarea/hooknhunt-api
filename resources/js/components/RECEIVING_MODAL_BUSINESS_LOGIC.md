# Receiving Modal - Business Logic Documentation

## Overview
The receiving modal handles goods receiving from purchase orders with intelligent cost distribution based on lost/found quantities.

## Business Rules

### 1. Lost Items > 10% (Manual Review Required)
- **Status**: Manual review required
- **Cost Adjustment**: NONE for lost items
- **Extra Cost**: Distributed proportionally across ALL received items
- **Refund**: Lost value will be credited to supplier wallet after manual review
- **Example**:
  ```
  Item A: Ordered 100, Received 79 (lost 21 = 21%)
  → No price adjustment for lost items
  → Extra cost (if any) is distributed
  → 21% > 10% threshold → Manual review required
  ```

### 2. Lost Items ≤ 10% (Partial Completion)
- **Status**: Partially completed
- **Cost Adjustment**: Lost cost distributed TO THAT SPECIFIC ITEM only
- **Extra Cost**: Distributed proportionally across ALL received items
- **Refund**: Auto-credited to supplier wallet
- **Example**:
  ```
  Item A: Ordered 100, Received 95 (lost 5 = 5%)
  Lost value = 5 × original_unit_cost
  Adjustment per unit = Lost value ÷ 95 received
  Final cost = Original cost + Adjustment per unit
  → Only Item A gets price increase
  ```

### 3. Found Items ≤ 10%
- **Status**: Partially completed
- **Cost Adjustment**: Found value reduces FROM THAT SPECIFIC ITEM only
- **Example**:
  ```
  Item B: Ordered 100, Received 107 (found 7 = 7%)
  Found value = 7 × original_unit_cost
  Adjustment per unit = Found value ÷ 107 received
  Final cost = Original cost - Adjustment per unit
  → Only Item B gets price decrease
  ```

### 4. Extra Cost Distribution
- **Always distributed** (regardless of lost/found status)
- **Distribution method**: Proportional to received value
- **Formula**:
  ```
  item_received_value = china_price × received_quantity
  total_received_value = Σ(all items' received_value)
  value_ratio = item_received_value ÷ total_received_value
  extra_cost_per_unit = (extra_cost × value_ratio) ÷ received_quantity
  ```

## Pure Functions

### `toSafeNumber(value, fallback)`
**Purpose**: Safely converts any value to number with validation
**Handles**: null, undefined, empty string, NaN, Infinity
**Returns**: Valid non-negative number or fallback

### `calculateSafePercentage(part, total)`
**Purpose**: Calculates percentage with division-by-zero protection
**Handles**: Zero total, Infinity
**Returns**: Percentage (0-100) or 0

### `calculateBdtAmount(rmbAmount, exchangeRate)`
**Purpose**: Converts RMB to BDT
**Formula**: `rmbAmount × exchangeRate`
**Returns**: Amount in BDT

### `determineReviewRequirement(lostPercentage)`
**Purpose**: Determines if manual review is needed
**Rules**:
- `lostPercentage > 10%` → Manual review required
- `0% < lostPercentage ≤ 10%` → Partial completion
- `lostPercentage = 0%` → Complete

### `calculateItemBreakdown(item, input, exchangeRate)`
**Purpose**: Calculates item-level cost breakdown
**Returns**: `ItemCalculation` object with:
- `orderedQty`, `receivedQty`
- `lostQty`, `foundQty`
- `lostPercentage`, `foundPercentage`
- `originalUnitCostBdt`
- `lostValueBdt`

### `distributeExtraCostOnly(calculations, extraCost)` ⭐ NEW
**Purpose**: Distributes ONLY extra cost (no lost/found adjustment)
**Used when**: Lost > 10% (manual review required)
**Logic**:
```typescript
1. Calculate total_received_value = Σ(received_qty × original_unit_cost)
2. For each item:
   a. Calculate value_ratio = (received_qty × original_cost) ÷ total_received_value
   b. Calculate extra_cost_per_unit = (extra_cost × value_ratio) ÷ received_qty
   c. final_unit_cost = original_unit_cost + extra_cost_per_unit
```

### `distributeCostsToReceivedItems(calculations, extraCost)`
**Purpose**: Distributes lost/found costs + extra cost
**Used when**: Lost ≤ 10% (partial completion)
**Logic**:
```typescript
For each item:
  1. If lost_qty > 0:
     lost_adjustment = (lost_qty × original_unit_cost) ÷ received_qty

  2. If found_qty > 0:
     found_adjustment = (found_qty × original_unit_cost) ÷ received_qty

  3. Extra cost (proportional across ALL items):
     extra_adjustment = (extra_cost × value_ratio) ÷ received_qty

  4. final_adjustment = lost_adjustment - found_adjustment + extra_adjustment
  5. final_unit_cost = original_unit_cost + final_adjustment
```

### `calculateOverallStats(calculations)`
**Purpose**: Aggregates statistics across all items
**Returns**: Total ordered, received, lost, found, values, percentages

### `validateItemInputs(items, itemInputs)`
**Purpose**: Validates unit_weight for all items
**Error**: Returns list of items missing unit weight

## UI Components

### `SummaryAlert`
**Displays**: Order summary with status badge
**Shows**:
- Total ordered → received
- Lost/found quantities and percentages
- Warning messages based on review requirement

### `CostBreakdownInfo` ⭐ UPDATED
**Displays**: Per-item cost breakdown (NOT aggregated)
**Shows**:
- Lost value distributed to received units
- Adjustment per unit
- Original cost → Final cost comparison
**Only shows**: Items with losses and positive adjustments

### `ItemsTable`
**Displays**: Table of all items with editable fields
**Columns**:
- Item (with China price)
- Ordered (badge)
- Received (editable number input)
- Unit Weight (editable number input, required)
- Extra Weight (editable number input)
- Original Cost (৳ formatted)
- Adjustment (shows ±৳ or -)
- Final Cost (৳ formatted, bold)

## State Management Flow

```
1. User opens modal
   ↓
2. useEffect initializes itemInputs with defaults
   ↓
3. rawCalculations (useMemo)
   - Calculates initial costs (no distribution)
   - Returns Record<number, ItemCalculation>
   ↓
4. rawStats (useMemo)
   - Aggregates statistics
   ↓
5. reviewRequirement (useMemo)
   - Determines if manual review needed
   - Based on totalLostPercentage
   ↓
6. finalCalculations (useMemo) ⭐ KEY LOGIC
   - IF lost > 10%: distributeExtraCostOnly()
   - ELSE IF lost ≤ 10%: distributeCostsToReceivedItems()
   - ELSE: distributeExtraCostOnly()
   - Returns Record<number, ItemCalculation>
   ↓
7. finalStats (useMemo)
   - Aggregates final statistics
```

## Critical Implementation Details

### Array-to-Object Mapping Issue (RESOLVED)
**Problem**: `distributeCostsToReceivedItems()` returns array, but table expects object with item IDs
**Solution**: Convert array back to object preserving item IDs
```typescript
const calcsObject: Record<number, ItemCalculation> = {}
let index = 0
items.forEach((item) => {
  if (distributedCalcs[index]) {
    calcsObject[item.id] = distributedCalcs[index]
    index++
  }
})
```

### Optional Chaining for Calculations (RESOLVED)
**Problem**: `calc?.originalUnitCostBdt.toFixed(2)` fails when calc is undefined
**Solution**: `(calc?.originalUnitCostBdt || 0).toFixed(2)`

### Per-Item Cost Distribution (CORRECT)
**OLD (WRONG)**: Distributed ALL lost items cost across ALL received items
**NEW (CORRECT)**: Each item's lost cost distributed to THAT ITEM only

## Backend Integration

### API Endpoint
`POST /api/v2/purchase-orders/{id}/status`

### Request Body
```json
{
  "status": "received_hub" | "partially_completed",
  "items": [
    {
      "id": 123,
      "received_quantity": 95,
      "unit_weight": 500,
      "extra_weight": 50
    }
  ],
  "extra_cost": 1000,
  "is_partial_completion": true
}
```

### Backend Logic (PurchaseOrderController.php)
- Lines 537-602: Handles receiving with refund logic
- **Lost ≤ 10%**: Auto-credits supplier wallet
- **Lost > 10%**: Marks for manual review
- Backend uses PER-ITEM lost percentage check (line 547-550)

## Translation Keys

### English (en.json)
```json
{
  "procurement.receivingModal.costAdjustment": {
    "title": "Cost Adjustment (Lost Items Distributed)",
    "itemBreakdown": "Lost items value ({{lostValue}} BDT) has been distributed across {{receivedUnits}} received units. Adjustment per unit: ৳ {{adjustmentPerUnit}}",
    "itemNote": "Original cost: ৳ {{originalCost}} → Final cost: ৳ {{finalCost}} (Increase: ৳ {{increase}})"
  }
}
```

### Bengali (bn.json)
```json
{
  "procurement.receivingModal.costAdjustment": {
    "title": "খরচ সমন্বয় (হারানো আইটেম বণ্টিত)",
    "itemBreakdown": "হারানো আইটেমের মূল্য ({{lostValue}} টাকা) {{receivedUnits}} গ্রহণ করা ইউনিটের মধ্যে বণ্টন করা হয়েছে। প্রতি ইউনিটে সমন্বয়: ৳ {{adjustmentPerUnit}}",
    "itemNote": "মূল মূল্য: ৳ {{originalCost}} → চূড়ান্ত মূল্য: ৳ {{finalCost}} (বৃদ্ধি: ৳ {{increase}})"
  }
}
```

## Maintenance Guidelines

### Adding New Cost Types
1. Add calculation in `calculateItemBreakdown()`
2. Add distribution logic in `distributeCostsToReceivedItems()`
3. Update `ItemCalculation` interface
4. Add table column if needed
5. Add translation keys

### Modifying Threshold Percentages
1. Update `determineReviewRequirement()` function
2. Update backend `PurchaseOrderController.php` line 548
3. Update translation messages

### Testing Checklist
- [ ] Lost = 0%: No adjustment, only extra cost
- [ ] Lost ≤ 10%: Per-item cost increase + extra cost
- [ ] Lost > 10%: No cost adjustment, only extra cost
- [ ] Found ≤ 10%: Per-item cost decrease + extra cost
- [ ] Extra cost: Always distributed proportionally
- [ ] Validation: Unit weight required
- [ ] UI: All calculations display correctly

---

**Last Updated**: 2025-02-21
**Status**: ✅ Production Ready
**Maintained by**: Development Team
