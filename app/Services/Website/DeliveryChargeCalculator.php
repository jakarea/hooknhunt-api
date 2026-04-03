<?php

namespace App\Services\Website;

/**
 * Steadfast weight-based delivery charge calculator.
 *
 * Inside Dhaka:  base 60 BDT for first 1KG, +15 BDT per additional KG
 * Outside Dhaka: base 120 BDT for first 1KG, +20 BDT per additional KG
 */
class DeliveryChargeCalculator
{
    // Rate config — move to DB/settings if needed later
    private const INSIDE_DHAKA_BASE   = 60;
    private const INSIDE_DHAKA_PER_KG = 15;
    private const OUTSIDE_DHAKA_BASE  = 120;
    private const OUTSIDE_DHAKA_PER_KG = 20;
    private const FREE_DELIVERY_THRESHOLD = 0; // 0 = no free delivery

    /**
     * Calculate delivery charge based on weight and destination.
     */
    public static function calculate(float $weightKg, string $division): float
    {
        if (static::isFreeDelivery($weightKg)) {
            return 0;
        }

        $isInsideDhaka = static::isInsideDhaka($division);

        if ($isInsideDhaka) {
            return static::insideDhakaCharge($weightKg);
        }

        return static::outsideDhakaCharge($weightKg);
    }

    /**
     * Inside Dhaka: 60 BDT for first 1KG, +15 per additional KG (ceiling).
     */
    public static function insideDhakaCharge(float $weightKg): float
    {
        if ($weightKg <= 1) {
            return (float) self::INSIDE_DHAKA_BASE;
        }

        $additionalKg = ceil($weightKg - 1);

        return (float) (self::INSIDE_DHAKA_BASE + ($additionalKg * self::INSIDE_DHAKA_PER_KG));
    }

    /**
     * Outside Dhaka: 120 BDT for first 1KG, +20 per additional KG (ceiling).
     */
    public static function outsideDhakaCharge(float $weightKg): float
    {
        if ($weightKg <= 1) {
            return (float) self::OUTSIDE_DHAKA_BASE;
        }

        $additionalKg = ceil($weightKg - 1);

        return (float) (self::OUTSIDE_DHAKA_BASE + ($additionalKg * self::OUTSIDE_DHAKA_PER_KG));
    }

    /**
     * Check if division is inside Dhaka.
     */
    public static function isInsideDhaka(string $division): bool
    {
        return in_array(strtolower(trim($division)), ['dhaka']);
    }

    /**
     * Check if free delivery applies (based on weight or amount — extend as needed).
     */
    public static function isFreeDelivery(float $weightKg, ?float $orderAmount = null): bool
    {
        // Future: if ($orderAmount && $orderAmount >= self::FREE_DELIVERY_THRESHOLD) return true;
        return false;
    }

    /**
     * Get charge breakdown for display.
     */
    public static function breakdown(float $weightKg, string $division): array
    {
        $isInsideDhaka = static::isInsideDhaka($division);
        $charge = static::calculate($weightKg, $division);

        return [
            'total_weight' => $weightKg,
            'is_inside_dhaka' => $isInsideDhaka,
            'zone' => $isInsideDhaka ? 'inside_dhaka' : 'outside_dhaka',
            'base_charge' => $isInsideDhaka ? self::INSIDE_DHAKA_BASE : self::OUTSIDE_DHAKA_BASE,
            'additional_kg' => $weightKg > 1 ? ceil($weightKg - 1) : 0,
            'per_kg_rate' => $isInsideDhaka ? self::INSIDE_DHAKA_PER_KG : self::OUTSIDE_DHAKA_PER_KG,
            'total_charge' => $charge,
        ];
    }
}
