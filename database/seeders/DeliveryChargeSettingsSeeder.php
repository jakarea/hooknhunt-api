<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class DeliveryChargeSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // Base weight (kg) - used for all calculation types
            'delivery_base_weight' => 2,

            // Delivery mode (standard, flat_rate, free_delivery, progressive_delivery)
            'delivery_mode' => 'standard',

            // Inside Dhaka
            'delivery_inside_dhaka_base_charge' => 60,
            'delivery_inside_dhaka_per_kg_charge' => 15,

            // Outside Dhaka
            'delivery_outside_dhaka_base_charge' => 120,
            'delivery_outside_dhaka_per_kg_charge' => 20,

            // Flat Rate (everywhere)
            'delivery_flat_enabled' => false,
            'delivery_flat_base_charge' => 100,
            'delivery_flat_per_kg_charge' => 25,

            // Free Delivery (optional - all deliveries free when enabled)
            'delivery_free_enabled' => false,
            'delivery_free_min_amount' => 0, // Not used (always 0 - free delivery means all orders free)

            // Progressive Free Delivery (tier-based discount)
            'delivery_progressive_enabled' => false,
            'delivery_progressive_min_amount' => 3000,
            'delivery_progressive_mode' => 'linear',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                [
                    'group' => 'delivery',
                    'key' => $key,
                ],
                [
                    'value' => $value,
                ]
            );
        }

        $this->command->info('✓ Delivery charge settings seeded successfully');
    }
}
