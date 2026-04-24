<?php

namespace App\Services\Website;

use App\Models\Setting;

/**
 * Dynamic delivery charge calculator.
 *
 * All rates are configurable from admin panel via database settings.
 * Supports: Inside Dhaka, Outside Dhaka, and Flat Rate (everywhere)
 */
class DeliveryChargeCalculator
{
    /**
     * Get delivery setting value.
     */
    private static function getSetting(string $key, mixed $default = null): mixed
    {
        return Setting::where('group', 'delivery')
            ->where('key', $key)
            ->value('value') ?? $default;
    }

    /**
     * Get all delivery settings as array.
     */
    private static function getSettings(): array
    {
        return Setting::where('group', 'delivery')
            ->pluck('value', 'key')
            ->toArray();
    }

    /**
     * Calculate delivery charge based on weight and destination.
     */
    public static function calculate(float $weightKg, string $division): float
    {
        $settings = self::getSettings();

        // Check if free delivery applies
        if (self::isFreeDelivery($settings)) {
            return 0;
        }

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
     * Get charge breakdown for display.
     */
    public static function breakdown(float $weightKg, string $division): array
    {
        $settings = self::getSettings();
        $isInsideDhaka = self::isInsideDhaka($division);
        $flatEnabled = ($settings['delivery_flat_enabled'] ?? false) == true;
        $charge = self::calculate($weightKg, $division);

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

        return [
            'total_weight' => $weightKg,
            'base_weight' => $baseWeight,
            'zone' => $zone,
            'is_inside_dhaka' => $isInsideDhaka,
            'is_flat_rate' => $flatEnabled,
            'base_charge' => $baseCharge,
            'additional_kg' => $weightKg > $baseWeight ? ceil($weightKg - $baseWeight) : 0,
            'per_kg_rate' => $perKgCharge,
            'total_charge' => $charge,
            'free_delivery' => self::isFreeDelivery($settings),
        ];
    }

    /**
     * Get all delivery settings for admin panel.
     */
    public static function getSettingsForAdmin(): array
    {
        $settings = self::getSettings();

        return [
            'base_weight' => (float) ($settings['delivery_base_weight'] ?? 2),
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
                'min_amount' => (float) ($settings['delivery_free_min_amount'] ?? 0),
            ],
        ];
    }
}
