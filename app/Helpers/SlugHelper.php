<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SlugHelper
{
    /**
     * Generate unique slug for any table
     *
     * @param string $name - Original name (e.g., "Nike Shoes")
     * @param string $table - Table name (e.g., "products")
     * @param string $column - Column name (default: "slug")
     * @return string - Unique slug (e.g., "nike-shoes" or "nike-shoes-1")
     */
    public static function generateUniqueSlug(string $name, string $table, string $column = 'slug'): string
    {
        // 1. Convert name to slug format
        $baseSlug = Str::slug($name);

        // 2. Handle empty/invalid slugs
        if (empty($baseSlug)) {
            $baseSlug = 'item-' . time();
        }

        // 3. Check if base slug exists
        $exists = DB::table($table)
            ->where($column, $baseSlug)
            ->exists();

        // 4. If not exists, return base slug
        if (!$exists) {
            return $baseSlug;
        }

        // 5. If exists, find highest suffix number
        $highestSuffix = DB::table($table)
            ->where($column, 'like', $baseSlug . '-%')
            ->where($column, 'regexp', $baseSlug . '-[0-9]+$')
            ->pluck($column)
            ->map(function ($slug) use ($baseSlug) {
                // Extract suffix number from "base-slug-N"
                $parts = explode('-', $slug);
                $lastPart = end($parts);
                return is_numeric($lastPart) ? (int) $lastPart : 0;
            })
            ->max() ?? 0;

        // 6. Return base slug with incremented suffix
        return $baseSlug . '-' . ($highestSuffix + 1);
    }

    /**
     * Generate unique variant slug with parent product slug
     *
     * @param string $productSlug - Parent product slug (e.g., "nike-shoes")
     * @param string $variantName - Variant name (e.g., "Red Large")
     * @param string|null $channel - Channel name (retail/wholesale/daraz/pos) - for uniqueness check only
     * @return string - Unique variant slug (e.g., "nike-shoes-red-large")
     *
     * Note: Channel is NOT included in the slug, but used for uniqueness check
     * Same slug is allowed for different channels, but same channel requires suffix
     */
    public static function generateVariantSlug(string $productSlug, string $variantName, ?string $channel = null): string
    {
        // 1. Convert variant name to slug format
        $variantSlug = Str::slug($variantName);

        // 2. Handle empty/invalid variant slugs
        if (empty($variantSlug)) {
            $variantSlug = 'variant';
        }

        // 3. Build base slug: product-slug + variant-slug (NO channel in slug)
        $baseSlug = $productSlug . '-' . $variantSlug;

        // 4. Check if base slug exists on the SAME channel
        $query = DB::table('product_variants')->where('variant_slug', $baseSlug);

        // Add channel condition for uniqueness check
        if ($channel) {
            $query->where('channel', $channel);
        }

        $exists = $query->exists();

        // 5. If not exists on same channel, return base slug
        if (!$exists) {
            return $baseSlug;
        }

        // 6. If exists on same channel, find highest suffix number on that channel
        $suffixQuery = DB::table('product_variants')
            ->where('variant_slug', 'like', $baseSlug . '-%')
            ->where('variant_slug', 'regexp', $baseSlug . '-[0-9]+$');

        // Add channel condition for suffix search
        if ($channel) {
            $suffixQuery->where('channel', $channel);
        }

        $highestSuffix = $suffixQuery
            ->pluck('variant_slug')
            ->map(function ($slug) use ($baseSlug) {
                // Extract suffix number from "base-slug-N"
                $parts = explode('-', $slug);
                $lastPart = end($parts);
                return is_numeric($lastPart) ? (int) $lastPart : 0;
            })
            ->max() ?? 0;

        // 7. Return base slug with incremented suffix
        return $baseSlug . '-' . ($highestSuffix + 1);
    }
}
