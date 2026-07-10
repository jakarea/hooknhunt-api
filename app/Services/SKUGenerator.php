<?php

namespace App\Services;

/**
 * Pure function service for generating SKUs from variant names
 * NO side effects, NO database calls
 */
class SKUGenerator
{
    /**
     * Generate SKU from variant name
     * Pure function: name → sku
     *
     * Rules:
     * - Lowercase
     * - Replace spaces with hyphens
     * - Remove special characters
     * - Collapse multiple hyphens
     * - Trim hyphens from ends
     * - Fallback to timestamp if empty
     */
    public static function generateFromVariantName(?string $variantName): string
    {
        if (!$variantName || trim($variantName) === '') {
            return 'variant-' . time();
        }

        $sku = strtolower(trim($variantName));
        $sku = preg_replace('/\s+/', '-', $sku);           // spaces → hyphens
        $sku = preg_replace('/[^a-z0-9-]/', '', $sku);     // remove special chars
        $sku = preg_replace('/-+/', '-', $sku);            // collapse multiple hyphens
        $sku = trim($sku, '-');                             // trim hyphens from ends

        return $sku ?: 'variant-' . time();
    }

    /**
     * Generate SKU for new variant during create
     * Uses manual SKU if provided, otherwise auto-generates from name
     *
     * @param string $defaultName - Default variant name from form
     * @param string|null $manualSku - Manual SKU if user provided one
     * @return string Generated or manual SKU
     */
    public static function generateForNewVariant(?string $defaultName, ?string $manualSku): string
    {
        // If manual SKU provided, use it
        if ($manualSku && trim($manualSku) !== '') {
            return trim($manualSku);
        }

        // Auto-generate from name
        return self::generateFromVariantName($defaultName);
    }

    /**
     * Validate SKU format
     * Pure function: sku → valid bool
     */
    public static function isValidSKU(?string $sku): bool
    {
        if (!$sku || trim($sku) === '') {
            return false;
        }

        // SKU should only have alphanumeric and hyphens
        return preg_match('/^[a-z0-9-]+$/', strtolower(trim($sku))) === 1;
    }
}
