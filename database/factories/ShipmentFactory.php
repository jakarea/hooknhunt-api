<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Shipment>
 */
class ShipmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => \App\Models\Supplier::factory(),
            'po_number' => fake()->unique()->numerify('PO########'),
            'lot_number' => fake()->numerify('LOT###'),
            'status' => fake()->randomElement(['draft', 'payment_confirmed', 'shipped_from_china', 'warehouse_china', 'shipped_to_bd', 'customs_clearing', 'received_bogura', 'completed']),
            'exchange_rate' => fake()->randomFloat(4, 20, 25),
            'total_china_cost_rmb' => fake()->randomFloat(2, 1000, 10000),
            'total_weight_actual' => fake()->randomFloat(2, 100, 500),
            'total_weight_chargeable' => fake()->randomFloat(2, 100, 500),
            'shipping_cost_intl' => fake()->randomFloat(2, 500, 2000),
            'shipping_cost_local' => fake()->randomFloat(2, 200, 1000),
            'misc_cost' => fake()->randomFloat(2, 0, 500),
            'note' => fake()->optional()->text(),
        ];
    }
}
