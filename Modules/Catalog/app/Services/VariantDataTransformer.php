<?php

namespace App\Modules\Catalog\Services;

/**
 * Pure function service for variant data transformation
 * Handles: camelCase → snake_case, field mapping, decimal rounding
 * NO side effects, NO database calls
 */
class VariantDataTransformer
{
    /**
     * Round decimal to 2 places (BDT standard)
     * Pure function: input → output, no side effects
     */
    public static function roundPrice($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $float = (float) $value;
        return round($float, 2);
    }

    /**
     * Transform variant data from frontend (camelCase) to database (snake_case)
     * Only includes fields that are explicitly provided
     * NO defaults, NO overwrites of missing fields
     *
     * CRITICAL: Database schema has ONLY price and offer_price fields.
     * Pricing per-channel is determined by the 'channel' field (retail|wholesale|daraz|pos).
     * Non-existent fields like retail_price, wholesale_price are IGNORED.
     */
    public static function transformVariantData(array $variantData): array
    {
        $transformed = [];

        // Map provided fields (only if they exist)
        // Database fields: price, offer_price, purchase_cost, stock, moq, weight, channel
        // Do NOT map non-existent fields: retail_price, wholesale_price, etc.
        $fieldMapping = [
            // SKU fields
            'sku' => 'sku',
            'sellerSku' => 'sku',
            'seller_sku' => 'sku',
            'customSku' => 'custom_sku',
            'custom_sku' => 'custom_sku',

            // Variant name fields
            'variantName' => 'variant_name',
            'variant_name' => 'variant_name',
            'name' => 'variant_name',

            // Channel field - determines if retail/wholesale/daraz/pos
            // This is how multi-channel pricing works (not separate fields)
            'channel' => 'channel',

            // Price fields - ONLY price and offer_price exist in database
            // Both retail and wholesale use the SAME fields, distinguished by 'channel'
            'retailPrice' => 'price',
            'wholesalePrice' => 'price',
            'price' => 'price',
            'retail_price' => 'price',
            'wholesale_price' => 'price',
            'retailOfferPrice' => 'offer_price',
            'wholesaleOfferPrice' => 'offer_price',
            'offerPrice' => 'offer_price',
            'offer_price' => 'offer_price',
            'retail_offer_price' => 'offer_price',

            // Cost field
            'purchaseCost' => 'purchase_cost',
            'purchase_cost' => 'purchase_cost',
            'costPrice' => 'purchase_cost',

            // Media
            'thumbnailId' => 'thumbnail_id',
            'thumbnail_id' => 'thumbnail_id',

            // MOQ - ONLY moq exists (not wholesale_moq)
            'moq' => 'moq',
            'wholesaleMoq' => 'moq',
            'wholesale_moq' => 'moq',

            // Stock and physical properties
            'stock' => 'stock',
            'weight' => 'weight',
            'size' => 'size',
            'color' => 'color',
            'material' => 'material',
        ];

        foreach ($fieldMapping as $inputKey => $dbKey) {
            if (array_key_exists($inputKey, $variantData)) {
                // Skip if this output field was already set (first format wins)
                if (isset($transformed[$dbKey])) {
                    continue;
                }

                $value = $variantData[$inputKey];

                // Handle price fields: convert to integer (no fractions per user requirement)
                if (in_array($dbKey, ['price', 'offer_price', 'purchase_cost'])) {
                    if ($value !== null && $value !== '') {
                        $transformed[$dbKey] = (int) round((float) $value);
                    }
                }
                // Handle numeric fields (only set if value is not null/empty)
                elseif (in_array($dbKey, ['stock', 'moq', 'weight'])) {
                    if ($value !== null && $value !== '') {
                        $transformed[$dbKey] = (float) $value;
                    }
                }
                // Handle string fields
                else {
                    $transformed[$dbKey] = $value;
                }
            }
        }

        return $transformed;
    }

    /**
     * Transform variant for UPDATE (only include changed fields)
     * This prevents overwriting existing values with nulls or defaults
     */
    public static function transformVariantForUpdate(array $variantData): array
    {
        $transformed = self::transformVariantData($variantData);

        // Remove null values to prevent overwriting existing data
        return array_filter($transformed, fn($value) => $value !== null);
    }

    /**
     * Transform variant for CREATE (with required field handling)
     * All fields are safe because we're creating new records
     */
    public static function transformVariantForCreate(array $variantData): array
    {
        $transformed = self::transformVariantData($variantData);

        // Set defaults only for CREATE (new records)
        if (!isset($transformed['sku'])) {
            $transformed['sku'] = \Illuminate\Support\Str::slug($transformed['variant_name'] ?? 'variant') . '-' . time();
        }

        if (!isset($transformed['variant_name'])) {
            $transformed['variant_name'] = $transformed['sku'] ?? 'Variant';
        }

        if (!isset($transformed['moq'])) {
            $transformed['moq'] = 1;
        }

        if (!isset($transformed['stock'])) {
            $transformed['stock'] = 0;
        }

        // Channel is NOT defaulted - must be provided or set by controller
        // Valid channels: retail, wholesale, daraz, pos
        // If not provided, controller should set it or validation will fail

        return $transformed;
    }

    /**
     * Validate variant data structure
     * Returns array of validation errors (empty if valid)
     */
    public static function validateVariantData(array $variantData, bool $isCreate = false): array
    {
        $errors = [];

        // Price validation
        if (isset($variantData['retailPrice']) || isset($variantData['retail_price'])) {
            $price = $variantData['retailPrice'] ?? $variantData['retail_price'];
            if (!is_numeric($price) || $price < 0) {
                $errors[] = 'Price must be a non-negative number';
            }
        } elseif ($isCreate) {
            $errors[] = 'Price is required for new variants';
        }

        // Stock validation
        if (isset($variantData['stock'])) {
            if (!is_numeric($variantData['stock']) || $variantData['stock'] < 0) {
                $errors[] = 'Stock must be a non-negative integer';
            }
        } elseif ($isCreate) {
            $errors[] = 'Stock is required for new variants';
        }

        // Name validation
        if (isset($variantData['name']) || isset($variantData['variantName'])) {
            $name = $variantData['name'] ?? $variantData['variantName'];
            if (empty($name)) {
                $errors[] = 'Variant name cannot be empty';
            }
        } elseif ($isCreate) {
            $errors[] = 'Variant name is required';
        }

        return $errors;
    }
}
