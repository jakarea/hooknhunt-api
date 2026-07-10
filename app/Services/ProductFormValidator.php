<?php

namespace App\Services;

/**
 * Pure function service for validating product form data
 * NO side effects, NO database calls
 * Used by both CREATE and EDIT pages
 */
class ProductFormValidator
{
    /**
     * Validate complete product form
     * Returns: ['valid' => bool, 'errors' => ['field' => 'message']]
     *
     * @param array $data Form data to validate
     * @return array Validation result with errors
     */
    public static function validateProductForm(array $data): array
    {
        $errors = [];

        // Required: Product Name
        if (empty($data['productName']) || trim((string)$data['productName']) === '') {
            $errors['productName'] = 'Product name is required';
        }

        // Required: Category
        if (empty($data['category'])) {
            $errors['category'] = 'Please select a category';
        }

        // Required: Brand
        if (empty($data['brand'])) {
            $errors['brand'] = 'Please select a brand';
        }

        // Required: Description (min 10 chars)
        if (empty($data['description'])) {
            $errors['description'] = 'Description is required';
        } elseif (strlen(trim((string)$data['description'])) < 10) {
            $errors['description'] = 'Description must be at least 10 characters';
        }

        // Required: At least one variant
        if (empty($data['variants']) || !is_array($data['variants']) || count($data['variants']) === 0) {
            $errors['variants'] = 'At least one variant is required';
        } else {
            // Validate each variant
            foreach ($data['variants'] as $index => $variant) {
                $variantErrors = self::validateVariant($variant, $index);
                $errors = array_merge($errors, $variantErrors);
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Validate single variant
     * Returns errors keyed as "variant.{index}.{field}"
     *
     * @param array $variant Variant data
     * @param int $index Variant index (0-based)
     * @return array Validation errors for this variant
     */
    private static function validateVariant(array $variant, int $index): array
    {
        $errors = [];
        $prefix = "variant.{$index}";
        $variantNumber = $index + 1;

        // Variant Name (required)
        if (empty($variant['name']) || trim((string)$variant['name']) === '') {
            $errors["{$prefix}.name"] = "Variant {$variantNumber} name is required";
        }

        // Seller SKU (required)
        if (empty($variant['sellerSku']) && empty($variant['sku'])) {
            $errors["{$prefix}.sellerSku"] = "Variant {$variantNumber} SKU is required";
        }

        // Purchase Cost (required, must be number, >= 0)
        if (!isset($variant['purchaseCost']) || $variant['purchaseCost'] === '' || $variant['purchaseCost'] === null) {
            $errors["{$prefix}.purchaseCost"] = "Variant {$variantNumber} purchase cost is required";
        } elseif (!is_numeric($variant['purchaseCost'])) {
            $errors["{$prefix}.purchaseCost"] = "Variant {$variantNumber} purchase cost must be a number";
        } elseif ((float)$variant['purchaseCost'] < 0) {
            $errors["{$prefix}.purchaseCost"] = "Variant {$variantNumber} purchase cost cannot be negative";
        }

        // Retail Price / Price (required, must be number, >= 0)
        $price = $variant['price'] ?? $variant['retailPrice'] ?? null;
        if (!isset($price) || $price === '' || $price === null) {
            $errors["{$prefix}.price"] = "Variant {$variantNumber} retail price is required";
        } elseif (!is_numeric($price)) {
            $errors["{$prefix}.price"] = "Variant {$variantNumber} retail price must be a number";
        } elseif ((float)$price < 0) {
            $errors["{$prefix}.price"] = "Variant {$variantNumber} retail price cannot be negative";
        }

        // Stock (required, must be integer, >= 0)
        if (!isset($variant['stock']) || $variant['stock'] === '' || $variant['stock'] === null) {
            $errors["{$prefix}.stock"] = "Variant {$variantNumber} stock is required";
        } elseif (!is_numeric($variant['stock'])) {
            $errors["{$prefix}.stock"] = "Variant {$variantNumber} stock must be a number";
        } elseif ((int)$variant['stock'] < 0) {
            $errors["{$prefix}.stock"] = "Variant {$variantNumber} stock cannot be negative";
        }

        return $errors;
    }

    /**
     * Validate variant data only (for individual variant updates)
     *
     * @param array $variant Variant data
     * @return array Validation errors
     */
    public static function validateVariantOnly(array $variant): array
    {
        return self::validateVariant($variant, 0);
    }
}
