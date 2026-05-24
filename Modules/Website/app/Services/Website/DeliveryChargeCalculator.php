<?php

namespace App\Modules\Website\Services\Website;

use Illuminate\Support\Facades\DB;

/**
 * Dynamic delivery charge calculator.
 *
 * All rates are configurable from admin panel via database settings.
 * Supports: Inside Dhaka, Outside Dhaka, and Flat Rate (everywhere)
 */
class DeliveryChargeCalculator
{
    /**
     * Get all delivery settings as array.
     * Pure function - no cross-module dependencies
     */
    private static function getSettings(): array
    {
        return DB::table('settings')
            ->where('group', 'delivery')
            ->pluck('value', 'key')
            ->toArray();
    }

    /**
     * Calculate delivery charge based on weight and destination.
     */
    public static function calculate(float $weightKg, string $division, ?float $orderAmount = null): float
    {
        $settings = self::getSettings();

        $baseCharge = self::calculateBaseCharge($weightKg, $division, $settings);

        // Apply progressive discount if enabled
        if (($settings['delivery_progressive_enabled'] ?? false) == true && $orderAmount !== null) {
            return self::applyProgressiveDiscount($baseCharge, $orderAmount, $settings);
        }

        // Check if traditional free delivery applies (backward compatibility)
        if (self::isFreeDelivery($settings, $orderAmount)) {
            return 0;
        }

        return $baseCharge;
    }

    /**
     * Inside Dhaka charge calculation.
     */
    private static function calculateInsideDhaka(float $weightKg, array $settings): float
    {
        $baseWeight = (float) ($settings['delivery_base_weight'] ?? 2);
        $baseCharge = (float) ($settings['delivery_inside_dhaka_base_charge'] ?? 60);
        $perKgCharge = (float) ($settings['delivery_inside_dhaka_per_kg_charge'] ?? 15);

        if ($weightKg <= $baseWeight) {
            return $baseCharge;
        }

        $additionalKg = $weightKg - $baseWeight;
        $additionalKgRounded = ceil($additionalKg);

        return $baseCharge + ($additionalKgRounded * $perKgCharge);
    }

    /**
     * Outside Dhaka charge calculation.
     */
    private static function calculateOutsideDhaka(float $weightKg, array $settings): float
    {
        $baseWeight = (float) ($settings['delivery_base_weight'] ?? 2);
        $baseCharge = (float) ($settings['delivery_outside_dhaka_base_charge'] ?? 120);
        $perKgCharge = (float) ($settings['delivery_outside_dhaka_per_kg_charge'] ?? 20);

        if ($weightKg <= $baseWeight) {
            return $baseCharge;
        }

        $additionalKg = $weightKg - $baseWeight;
        $additionalKgRounded = ceil($additionalKg);

        return $baseCharge + ($additionalKgRounded * $perKgCharge);
    }

    /**
     * Flat rate calculation (same for everywhere).
     */
    private static function calculateFlatRate(float $weightKg, array $settings): float
    {
        $baseWeight = (float) ($settings['delivery_base_weight'] ?? 2);
        $baseCharge = (float) ($settings['delivery_flat_base_charge'] ?? 100);
        $perKgCharge = (float) ($settings['delivery_flat_per_kg_charge'] ?? 25);

        if ($weightKg <= $baseWeight) {
            return $baseCharge;
        }

        $additionalKg = $weightKg - $baseWeight;
        $additionalKgRounded = ceil($additionalKg);

        return $baseCharge + ($additionalKgRounded * $perKgCharge);
    }

    /**
     * Check if division is inside Dhaka.
     */
    public static function isInsideDhaka(string $division): bool
    {
        return in_array(strtolower(trim($division)), ['dhaka']);
    }

    /**
     * Check if free delivery applies.
     */
    public static function isFreeDelivery(array $settings = [], ?float $orderAmount = null): bool
    {
        $settings = $settings ?: self::getSettings();

        $enabled = ($settings['delivery_free_enabled'] ?? false) == true;
        if (!$enabled) {
            return false;
        }

        if ($orderAmount !== null) {
            $minAmount = (float) ($settings['delivery_free_min_amount'] ?? 0);
            return $orderAmount >= $minAmount;
        }

        return false;
    }

    /**
     * Calculate base delivery charge (without progressive discount).
     */
    private static function calculateBaseCharge(float $weightKg, string $division, array $settings): float
    {
        // Check if flat rate is enabled
        if (($settings['delivery_flat_enabled'] ?? false) == true) {
            return self::calculateFlatRate($weightKg, $settings);
        }

        // Zone-based calculation
        $isInsideDhaka = self::isInsideDhaka($division);

        if ($isInsideDhaka) {
            return self::calculateInsideDhaka($weightKg, $settings);
        }

        return self::calculateOutsideDhaka($weightKg, $settings);
    }

    /**
     * Calculate progressive discount percentage based on order amount.
     * Returns discount percentage (0-100).
     * \App\Modules\Website\Models\Discount only applies at specific tiers: 40%, 60%, 80%, 100%
     * Motivational message shows starting at 25%
     */
    public static function calculateProgressiveDiscount(float $orderAmount, array $settings = []): float
    {
        $settings = $settings ?: self::getSettings();

        $enabled = ($settings['delivery_progressive_enabled'] ?? false) == true;
        if (!$enabled) {
            return 0;
        }

        $minAmount = (float) ($settings['delivery_progressive_min_amount'] ?? 0);

        // Edge case: min amount is zero or negative
        if ($minAmount <= 0) {
            return 0;
        }

        // Edge case: order amount is zero or negative
        if ($orderAmount <= 0) {
            return 0;
        }

        // Calculate percentage of threshold reached
        $percentage = ($orderAmount / $minAmount) * 100;

        // Only apply discount at specific tiers: 40%, 60%, 80%, 100%
        // 0-39%: No discount
        // 40-59%: 40% discount tier
        // 60-79%: 60% discount tier
        // 80-99%: 80% discount tier
        // 100%+: 100% discount (free)
        if ($percentage < 40) {
            return 0; // No discount yet
        } elseif ($percentage < 60) {
            return 40; // 40% discount tier
        } elseif ($percentage < 80) {
            return 60; // 60% discount tier
        } elseif ($percentage < 100) {
            return 80; // 80% discount tier
        } else {
            return 100; // Free delivery
        }
    }

    /**
     * Apply progressive discount to base charge.
     */
    private static function applyProgressiveDiscount(float $baseCharge, float $orderAmount, array $settings): float
    {
        $discountPercentage = self::calculateProgressiveDiscount($orderAmount, $settings);

        // If 100% discount, delivery is free
        if ($discountPercentage >= 100) {
            return 0;
        }

        // Calculate discount amount
        $discountAmount = ($discountPercentage / 100) * $baseCharge;

        // Apply discount
        return max(0, $baseCharge - $discountAmount);
    }

    /**
     * Get charge breakdown for display.
     */
    public static function breakdown(float $weightKg, string $division, ?float $orderAmount = null): array
    {
        $settings = self::getSettings();
        $isInsideDhaka = self::isInsideDhaka($division);
        $flatEnabled = ($settings['delivery_flat_enabled'] ?? false) == true;
        $charge = self::calculate($weightKg, $division, $orderAmount);

        $baseWeight = (float) ($settings['delivery_base_weight'] ?? 2);

        if ($flatEnabled) {
            $baseCharge = (float) ($settings['delivery_flat_base_charge'] ?? 100);
            $perKgCharge = (float) ($settings['delivery_flat_per_kg_charge'] ?? 25);
            $zone = 'flat_rate';
        } elseif ($isInsideDhaka) {
            $baseCharge = (float) ($settings['delivery_inside_dhaka_base_charge'] ?? 60);
            $perKgCharge = (float) ($settings['delivery_inside_dhaka_per_kg_charge'] ?? 15);
            $zone = 'inside_dhaka';
        } else {
            $baseCharge = (float) ($settings['delivery_outside_dhaka_base_charge'] ?? 120);
            $perKgCharge = (float) ($settings['delivery_outside_dhaka_per_kg_charge'] ?? 20);
            $zone = 'outside_dhaka';
        }

        $breakdown = [
            'total_weight' => $weightKg,
            'base_weight' => $baseWeight,
            'zone' => $zone,
            'is_inside_dhaka' => $isInsideDhaka,
            'is_flat_rate' => $flatEnabled,
            'base_charge' => $baseCharge,
            'additional_kg' => $weightKg > $baseWeight ? ceil($weightKg - $baseWeight) : 0,
            'per_kg_rate' => $perKgCharge,
            'total_charge' => $charge,
            'free_delivery' => self::isFreeDelivery($settings, $orderAmount),
        ];

        // Add progressive delivery information
        $progressiveEnabled = ($settings['delivery_progressive_enabled'] ?? false) == true;
        $breakdown['progressive_delivery'] = [
            'enabled' => $progressiveEnabled,
        ];

        if ($progressiveEnabled && $orderAmount !== null) {
            $discountPercentage = self::calculateProgressiveDiscount($orderAmount, $settings);
            $minAmount = (float) ($settings['delivery_progressive_min_amount'] ?? 0);
            $discountAmount = $baseCharge - $charge;

            // Generate motivational message
            $motivationalMessage = self::generateMotivationalMessage($orderAmount, $minAmount, $baseCharge, $discountPercentage);

            $breakdown['progressive_delivery'] = [
                'enabled' => true,
                'order_amount' => $orderAmount,
                'min_amount' => $minAmount,
                'discount_percentage' => $discountPercentage,
                'discount_amount' => $discountAmount,
                'amount_needed_for_free' => max(0, $minAmount - $orderAmount),
                'is_free' => $discountPercentage >= 100,
                'motivational_message' => $motivationalMessage,
            ];
        }

        return $breakdown;
    }

    /**
     * Generate motivational message for progressive delivery.
     * Shows actual delivery charge amount instead of percentage.
     * Message starts showing at 25% to motivate reaching 40% tier.
     * Tiers: 40% (delivery in 60% of base), 60% (delivery in 40% of base), 80% (delivery in 20% of base), 100% (FREE)
     */
    private static function generateMotivationalMessage(float $orderAmount, float $minAmount, float $baseCharge, float $discountPercentage): string
    {
        // Already free delivery
        if ($discountPercentage >= 100) {
            return '🎉 Free delivery applied!';
        }

        $currentPercentage = min(100, ($orderAmount / $minAmount) * 100);

        // Below 25%: Don't show message yet
        if ($currentPercentage < 25) {
            return '';
        }

        // 25-39%: Motivate to reach 40% tier (delivery in 60% of base charge)
        if ($currentPercentage < 40) {
            $amountFor40Tier = $minAmount * 0.4;
            $amountNeededFor40 = max(0, $amountFor40Tier - $orderAmount);
            $chargeAt40 = round($baseCharge * 0.6);

            if ($amountNeededFor40 > 0) {
                return "Add ৳{$amountNeededFor40} more get delivery in ৳{$chargeAt40}";
            }
        }

        // 40-59%: Motivate to reach 60% tier (delivery in 40% of base charge)
        if ($currentPercentage < 60) {
            $amountFor60Tier = $minAmount * 0.6;
            $amountNeededFor60 = max(0, $amountFor60Tier - $orderAmount);
            $chargeAt60 = round($baseCharge * 0.4);

            if ($amountNeededFor60 > 0) {
                return "Add ৳{$amountNeededFor60} more get delivery in ৳{$chargeAt60}";
            }
        }

        // 60-79%: Motivate to reach 80% tier (delivery in 20% of base charge)
        if ($currentPercentage < 80) {
            $amountFor80Tier = $minAmount * 0.8;
            $amountNeededFor80 = max(0, $amountFor80Tier - $orderAmount);
            $chargeAt80 = round($baseCharge * 0.2);

            if ($amountNeededFor80 > 0) {
                return "Add ৳{$amountNeededFor80} more get delivery in ৳{$chargeAt80}";
            }
        }

        // 80-99%: Motivate to reach FREE delivery
        $amountNeeded = max(0, $minAmount - $orderAmount);
        if ($amountNeeded > 0) {
            return "Add ৳{$amountNeeded} more for FREE delivery";
        }

        return '';
    }

    /**
     * Get all delivery settings for admin panel.
     */
    public static function getSettingsForAdmin(): array
    {
        $settings = self::getSettings();

        // Determine which delivery mode is active
        $deliveryMode = $settings['delivery_mode'] ?? 'standard';

        return [
            'base_weight' => (float) ($settings['delivery_base_weight'] ?? 2),
            'delivery_mode' => $deliveryMode,
            'inside_dhaka' => [
                'base_charge' => (float) ($settings['delivery_inside_dhaka_base_charge'] ?? 60),
                'per_kg_charge' => (float) ($settings['delivery_inside_dhaka_per_kg_charge'] ?? 15),
            ],
            'outside_dhaka' => [
                'base_charge' => (float) ($settings['delivery_outside_dhaka_base_charge'] ?? 120),
                'per_kg_charge' => (float) ($settings['delivery_outside_dhaka_per_kg_charge'] ?? 20),
            ],
            'flat_rate' => [
                'enabled' => ($settings['delivery_flat_enabled'] ?? false) == true,
                'base_charge' => (float) ($settings['delivery_flat_base_charge'] ?? 100),
                'per_kg_charge' => (float) ($settings['delivery_flat_per_kg_charge'] ?? 25),
            ],
            'free_delivery' => [
                'enabled' => ($settings['delivery_free_enabled'] ?? false) == true,
            ],
            'progressive_delivery' => [
                'enabled' => ($settings['delivery_progressive_enabled'] ?? false) == true,
                'min_amount' => (float) ($settings['delivery_progressive_min_amount'] ?? 3000),
                'mode' => $settings['delivery_progressive_mode'] ?? 'linear',
            ],
        ];
    }
}
