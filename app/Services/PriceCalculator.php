<?php

namespace App\Services;

/**
 * Pure function service for auto-calculating prices
 * Calculates entire price chain from purchase cost
 * NO side effects, NO database calls
 * Used by both CREATE and EDIT pages
 */
class PriceCalculator
{
    /**
     * Auto-calculate all prices from purchase cost
     * Uses pricing settings percentages
     *
     * Price chain: Cost → Wholesale → Retail → Offers
     *
     * @param float $purchaseCost Base cost
     * @param array $pricingSettings Percentages for markups
     * @return array Calculated prices or empty array if cost is 0
     */
    public static function calculatePricesFromCost(float $purchaseCost, array $pricingSettings): array
    {
        // Don't calculate if cost is zero or negative
        if ($purchaseCost <= 0) {
            return [];
        }

        // Extract percentages from settings (safe defaults)
        $wholesaleProfit = (float)($pricingSettings['wholesaleProfitPercentage'] ?? 0);
        $wholesaleOfferPercent = (float)($pricingSettings['wholesaleOfferPercentage'] ?? 0);
        $retailProfit = (float)($pricingSettings['retailProfitPercentage'] ?? 0);
        $retailOfferPercent = (float)($pricingSettings['retailOfferPercentage'] ?? 0);

        // Step 1: Purchase Cost → Wholesale Price
        $wholesalePrice = $purchaseCost * (1 + $wholesaleProfit / 100);

        // Step 2: Wholesale Price → Wholesale Offer Price
        $wholesaleOfferPrice = $wholesalePrice * (1 - $wholesaleOfferPercent / 100);

        // Step 3: Wholesale Offer → Retail Price
        $retailPrice = $wholesaleOfferPrice * (1 + $retailProfit / 100);

        // Step 4: Retail Price → Retail Offer Price
        $retailOfferPrice = $retailPrice * (1 - $retailOfferPercent / 100);

        // Round all to 2 decimals
        return [
            'wholesalePrice' => round($wholesalePrice, 2),
            'retailPrice' => round($retailPrice, 2),
            'retailOfferPrice' => round($retailOfferPrice, 2),
            'wholesaleOfferPrice' => round($wholesaleOfferPrice, 2),
        ];
    }

    /**
     * Calculate profit margin
     * Returns: ['amount' => profit, 'percentage' => margin %]
     *
     * @param float $cost Purchase cost
     * @param float $price Selling price
     * @return array Margin amount and percentage
     */
    public static function calculateMargin(float $cost, float $price): array
    {
        if ($cost <= 0) {
            return ['amount' => 0, 'percentage' => 0];
        }

        $amount = $price - $cost;
        $percentage = ($amount / $cost) * 100;

        return [
            'amount' => round($amount, 2),
            'percentage' => round($percentage, 0)
        ];
    }

    /**
     * Calculate margin percentage only
     * Used for simple margin display
     *
     * @param float $cost
     * @param float $price
     * @return int Margin percentage
     */
    public static function calculateMarginPercentage(float $cost, float $price): int
    {
        if ($cost <= 0) {
            return 0;
        }

        $percentage = (($price - $cost) / $cost) * 100;
        return (int) round($percentage);
    }

    /**
     * Check if price is valid (non-negative number)
     * Pure function: price → valid bool
     *
     * @param mixed $price
     * @return bool True if valid price
     */
    public static function isValidPrice($price): bool
    {
        return is_numeric($price) && (float)$price >= 0;
    }
}
