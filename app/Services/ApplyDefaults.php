<?php

namespace App\Services;

/**
 * Pure function service for applying default values to variants
 * Implements NEW logic: if (default > 0) → OVERWRITE all
 * OLD logic: if (!v.field) → only fill empty (WRONG - removed)
 * NO side effects, NO database calls
 * Used by both CREATE and EDIT pages
 */
class ApplyDefaults
{
    /**
     * Apply default values to multiple variants
     * Pure function: variants + defaults → updated variants
     *
     * Rules:
     * - If default value > 0 (or !== undefined for optional fields)
     * - Then OVERWRITE all variants with that value
     * - If default = 0 or empty, skip (don't touch existing values)
     *
     * @param array $variants Array of variant objects
     * @param array $defaults Default values to apply
     * @return array Updated variants
     */
    public static function applyDefaultsToVariants(array $variants, array $defaults): array
    {
        return array_map(function ($variant) use ($defaults) {
            return self::applyDefaultsToVariant($variant, $defaults);
        }, $variants);
    }

    /**
     * Apply defaults to single variant
     * Pure function: variant + defaults → updated variant
     *
     * @param array $variant Single variant object
     * @param array $defaults Default values to apply
     * @return array Updated variant
     */
    public static function applyDefaultsToVariant(array $variant, array $defaults): array
    {
        $updated = $variant;

        // Text fields: only apply if not empty
        if (!empty($defaults['name']) && trim((string)$defaults['name']) !== '') {
            $updated['name'] = $defaults['name'];
        }

        // Price fields: only apply if > 0
        if (isset($defaults['purchaseCost']) && (float)$defaults['purchaseCost'] > 0) {
            $updated['purchaseCost'] = $defaults['purchaseCost'];
        }

        if (isset($defaults['price']) && (float)$defaults['price'] > 0) {
            $updated['price'] = $defaults['price'];
        }

        if (isset($defaults['wholesalePrice']) && (float)$defaults['wholesalePrice'] > 0) {
            $updated['wholesalePrice'] = $defaults['wholesalePrice'];
        }

        if (isset($defaults['specialPrice']) && (float)$defaults['specialPrice'] > 0) {
            $updated['specialPrice'] = $defaults['specialPrice'];
        }

        if (isset($defaults['wholesaleOfferPrice']) && (float)$defaults['wholesaleOfferPrice'] > 0) {
            $updated['wholesaleOfferPrice'] = $defaults['wholesaleOfferPrice'];
        }

        // MOQ: only apply if > 0
        if (isset($defaults['wholesaleMoq']) && (int)$defaults['wholesaleMoq'] > 0) {
            $updated['wholesaleMoq'] = $defaults['wholesaleMoq'];
        }

        // Stock: only apply if > 0
        if (isset($defaults['stock']) && (int)$defaults['stock'] > 0) {
            $updated['stock'] = $defaults['stock'];
        }

        // Weight: only apply if > 0
        if (isset($defaults['weight']) && (float)$defaults['weight'] > 0) {
            $updated['weight'] = $defaults['weight'];
        }

        return $updated;
    }

    /**
     * Check if default value should be applied
     * Pure function: default → should apply bool
     *
     * @param mixed $value Default value to check
     * @return bool True if value should be applied (not 0, not empty, not null)
     */
    public static function shouldApplyDefault($value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        if (is_numeric($value) && (float)$value <= 0) {
            return false;
        }

        return true;
    }
}
