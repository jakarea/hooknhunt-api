<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Product Code Service
 *
 * Handles product code generation and validation.
 * Product codes are based on category codes.
 * Example: Category 1000 → Products 1001, 1002, 1003, etc.
 */
class ProductCodeService
{
    /**
     * Get the next available product code for a given category.
     *
     * Logic:
     * - Find the last product code in the same category
     * - Increment by 1
     * - Fill gaps if possible (find actual last used code)
     *
     * @param int $categoryCode The category code (e.g., 1000)
     * @return int|null The next product code (e.g., 1001), or null if category has no code
     */
    public static function getNextProductCode(int $categoryCode): ?int
    {
        if ($categoryCode < 100) {
            return null; // Category codes are at least 3 digits (100)
        }

        // Find the last product with the highest code in this category range
        // Products with category_code 1000 will have codes like 1001, 1002, etc.
        // We need to find products where product_code >= (category_code + 1)
        // and product_code <= (category_code + 999) (to stay in same thousand range)

        $minProductCode = $categoryCode + 1;
        $maxProductCode = $categoryCode + 999;

        $lastProduct = DB::table('products')
            ->where('product_code', '>=', $minProductCode)
            ->where('product_code', '<=', $maxProductCode)
            ->orderBy('product_code', 'desc')
            ->first();

        if ($lastProduct) {
            return (int) $lastProduct->product_code + 1;
        }

        // No products yet in this category range
        return $minProductCode;
    }

    /**
     * Generate product code based on category.
     *
     * @param int $categoryId The category ID
     * @return int|null The generated product code, or null if category has no code
     */
    public static function generateProductCode(int $categoryId): ?int
    {
        $category = DB::table('categories')
            ->where('id', $categoryId)
            ->first();

        if (!$category || $category->category_code === null) {
            return null; // Category has no code, skip generation
        }

        return self::getNextProductCode((int) $category->category_code);
    }

    /**
     * Validate if a product code is valid for its category.
     *
     * Rules:
     * - Product code must be in the category's range (category_code + 1 to category_code + 999)
     * - Example: Category 1000 → Product codes 1001-1999
     *
     * @param int $productCode The product code to validate
     * @param int $categoryCode The category code
     * @return bool True if valid, false otherwise
     */
    public static function isValidProductCode(int $productCode, int $categoryCode): bool
    {
        $minCode = $categoryCode + 1;
        $maxCode = $categoryCode + 999;

        return $productCode >= $minCode && $productCode <= $maxCode;
    }

    /**
     * Check if a product code is unique (not used by another product).
     *
     * @param int $productCode The product code to check
     * @param int|null $excludeProductId Exclude a specific product (for updates)
     * @return bool True if unique, false if already exists
     */
    public static function isProductCodeUnique(int $productCode, ?int $excludeProductId = null): bool
    {
        $query = DB::table('products')
            ->where('product_code', $productCode);

        if ($excludeProductId !== null) {
            $query->where('id', '!=', $excludeProductId);
        }

        return !$query->exists();
    }
}
