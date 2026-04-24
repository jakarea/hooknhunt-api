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

            // Free Delivery (optional)
            'delivery_free_enabled' => false,
            'delivery_free_min_amount' => 0,
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
