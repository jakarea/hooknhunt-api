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
     */
    public static function transformVariantData(array $variantData): array
    {
        $transformed = [];

        // Map provided fields (only if they exist)
        // Process camelCase first, then snake_case as fallback
        $fieldMapping = [
            'sellerSku' => 'seller_sku',
            'seller_sku' => 'seller_sku',
            'variantName' => 'variant_name',
            'variant_name' => 'variant_name',
            'name' => 'variant_name',
            'retailPrice' => 'price',
            'retail_price' => 'price',
            'retailOfferPrice' => 'offer_price',
            'retail_offer_price' => 'offer_price',
            'purchaseCost' => 'purchase_cost',
            'purchase_cost' => 'purchase_cost',
            'thumbnailId' => 'thumbnail_id',
            'thumbnail_id' => 'thumbnail_id',
            'wholesaleMoq' => 'moq',
            'wholesale_moq' => 'moq',
            'weight' => 'weight',
            'stock' => 'stock',
            'sku' => 'sku',
            'size' => 'size',
            'color' => 'color',
            'material' => 'material',
            'moq' => 'moq',
        ];

        foreach ($fieldMapping as $inputKey => $dbKey) {
            if (array_key_exists($inputKey, $variantData)) {
                $value = $variantData[$inputKey];

                // Handle price fields: round to 2 decimals
                if (in_array($dbKey, ['price', 'offer_price', 'purchase_cost'])) {
                    $transformed[$dbKey] = self::roundPrice($value);
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
