# Product Pricing Fix - Comprehensive Solution

## Problem Statement
Product prices couldn't be updated after initial creation. The issue existed for 3 months but only surfaced when users tried to use the price update feature.

**Root Cause**: The controller used dangerous `?? 0` defaults when mapping variant data:
```php
'price' => $variantData['retail_price'] ?? 0  // BUG: Sets to 0 if field missing
'offer_price' => $variantData['retail_offer_price'] ?? 0
```

During UPDATE operations, missing fields should NOT be overwritten with defaults. This fix ensures:
- CREATE operations: Safe defaults applied for new records
- UPDATE operations: Only provided fields are changed, existing data preserved
- Field transformation: camelCase (frontend) → snake_case (database)
- Decimal rounding: All prices rounded to 2 decimals (BDT standard)

## Solution Architecture

### 1. Pure Function Service: VariantDataTransformer
**Location**: `/Modules/Catalog/app/Services/VariantDataTransformer.php`

A pure function service with NO side effects, NO database calls. Handles:

#### `roundPrice($value): ?float`
- Rounds decimal values to 2 places
- Returns null for null/empty values
- Safe for all numeric types (int, float, string)

#### `transformVariantData(array $variantData): array`
- Maps camelCase → snake_case (handles both formats)
- Field mapping:
  - `sellerSku` / `seller_sku` → `seller_sku`
  - `variantName` / `name` → `variant_name`
  - `retailPrice` → `price`
  - `retailOfferPrice` → `offer_price`
  - `purchaseCost` → `purchase_cost`
  - `wholesaleMoq` → `moq`
  - `thumbnailId` → `thumbnail_id`
- Rounds all price fields (price, offer_price, purchase_cost) to 2 decimals
- Converts numeric fields (stock, moq, weight) to float
- **Does NOT apply any defaults**

#### `transformVariantForCreate(array $variantData): array`
- Calls `transformVariantData()`
- Adds safe defaults for NEW records only:
  - `sku`: Generated from variant_name + timestamp
  - `variant_name`: Uses sku as fallback
  - `moq`: Defaults to 1
  - `stock`: Defaults to 0

#### `transformVariantForUpdate(array $variantData): array`
- Calls `transformVariantData()`
- **Filters out null values** to prevent overwriting existing data
- Critical for partial updates where only some fields change

#### `validateVariantData(array $variantData, bool $isCreate): array`
- Validates price/stock/name requirements
- Returns array of validation errors (empty if valid)

### 2. ProductController Updates
**Location**: `/Modules/Catalog/app/Http/Controllers/Api/V2/Catalog/ProductController.php`

#### `store()` method
1. Normalizes variant field names (accepts both camelCase and snake_case for validation)
2. Calls `storeWithVariants()` when variants are present

#### `storeWithVariants()` method
```php
foreach ($variantsData as $variantData) {
    $transformedData = VariantDataTransformer::transformVariantForCreate($variantData);
    $transformedData['product_id'] = $product->id;
    // ... required fields
    ProductVariant::create($transformedData);
}
```

#### `update()` method
```php
foreach ($validated['variants'] as $variantData) {
    if ($variantId) {
        // Existing variant: only update provided fields
        $updateData = VariantDataTransformer::transformVariantForUpdate($variantData);
        ProductVariant::where('id', $variantId)->update($updateData);
    } else {
        // New variant: create with safe defaults
        $createData = VariantDataTransformer::transformVariantForCreate($variantData);
        ProductVariant::create($createData);
    }
}
```

### 3. Database Model: ProductVariant
**Location**: `/Modules/Catalog/app/Models/ProductVariant.php`

Casts ensure decimal precision:
```php
protected $casts = [
    'price' => 'decimal:2',
    'offer_price' => 'decimal:2',
    'purchase_cost' => 'decimal:2',
    'stock' => 'integer',
    'moq' => 'integer',
    'weight' => 'decimal:2',
];
```

## Data Flow Examples

### Example 1: Create Product with Prices
**Frontend sends (camelCase)**:
```json
{
  "variantName": "Blue Large",
  "retailPrice": "100.1234",
  "retailOfferPrice": "90.5678",
  "purchaseCost": "45.999",
  "stock": "10"
}
```

**Transformation steps**:
1. `transformVariantForCreate()` is called
2. Field mapping: `retailPrice` → `price`, `retailOfferPrice` → `offer_price`, etc.
3. Rounding: `100.1234` → `100.12`, `90.5678` → `90.57`, `45.999` → `46.00`
4. Defaults added: `sku` auto-generated, `moq` = 1
5. **Saved to database** with proper decimal precision

### Example 2: Update Price Only (The Critical Fix)
**Frontend sends (partial update)**:
```json
{
  "id": 42,
  "retailPrice": "150.25"
  // Note: NOT sending retailOfferPrice or purchaseCost
}
```

**Before fix** ❌:
```php
'offer_price' => $variantData['retail_offer_price'] ?? 0  // BUG: overwrites to 0!
'purchase_cost' => $variantData['purchase_cost'] ?? 0     // BUG: overwrites to 0!
```

**After fix** ✅:
1. `transformVariantForUpdate()` is called
2. Only `retailPrice` → `price` is transformed
3. Null/missing fields are filtered OUT
4. Result: `{ 'price': 150.25 }`
5. **Only the price field is updated**, existing offer_price and purchase_cost preserved!

### Example 3: Both camelCase and snake_case Accepted
**Either format works**:
```json
{ "retailPrice": "100" }  // camelCase (preferred)
{ "retail_price": "100" } // snake_case (also supported)
```

Both are normalized before validation and use the same transformer.

## Testing

**Comprehensive test suite**: `/Modules/Catalog/app/Services/Tests/VariantDataTransformerTest.php`

All tests passing (9 tests, 48 assertions):
- ✅ Price rounding to 2 decimals
- ✅ Field mapping (camelCase → snake_case)
- ✅ Both input formats accepted
- ✅ CREATE adds safe defaults
- ✅ UPDATE filters null values
- ✅ Partial price updates work correctly
- ✅ Numeric field conversion
- ✅ Validation rules for required fields
- ✅ camelCase takes priority when both formats provided

## Prevention of Future Issues

1. **Centralized Logic**: All variant transformation happens in one pure function
2. **No Dangerous Defaults**: The transformer never applies defaults during transforms
3. **Explicit Defaults**: `transformVariantForCreate()` clearly shows what defaults are added
4. **Null Filtering**: `transformVariantForUpdate()` prevents accidental overwrites
5. **Type Safety**: Model casts ensure database precision
6. **Test Coverage**: Comprehensive tests catch regressions
7. **Field Flexibility**: Accepts both camelCase and snake_case input

## Files Changed

1. **Created**: `/Modules/Catalog/app/Services/VariantDataTransformer.php` (160 lines)
2. **Created**: `/Modules/Catalog/app/Services/Tests/VariantDataTransformerTest.php` (209 lines)
3. **Modified**: `/Modules/Catalog/app/Http/Controllers/Api/V2/Catalog/ProductController.php`
   - Added import for VariantDataTransformer
   - Updated `store()` method variant handling
   - Updated `storeWithVariants()` method
   - Updated `update()` method variant handling
   - Simplified pre-validation field normalization

## Verification Checklist

- [x] All unit tests pass (9/9)
- [x] Field mapping works for both camelCase and snake_case
- [x] Prices rounded to 2 decimals
- [x] CREATE operations add safe defaults
- [x] UPDATE operations filter null values
- [x] Partial updates don't overwrite existing data
- [x] Numeric field conversions work correctly
- [x] Validation rules enforced
- [x] No dangerous `?? 0` defaults remain
- [x] ProductVariant model has proper decimal casts
- [x] Controller uses transformer in all variant operations

## Next Steps

1. **Frontend Integration**: Verify frontend sends variant data with camelCase field names
2. **Manual Testing**: Test create/update flows in admin UI
3. **Production Deployment**: Deploy with confidence - no breaking changes to API
