<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Supplier>
 */
class SupplierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'email' => fake()->unique()->companyEmail(),
            'whatsapp' => fake()->optional()->phoneNumber(),
            'shop_url' => fake()->optional()->url(),
            'shop_name' => fake()->company() . ' Shop',
            'contact_person' => fake()->name(),
            'phone' => fake()->phoneNumber(),
            'wechat_id' => fake()->optional()->word(),
            'wechat_qr_file' => null,
            'wechat_qr_url' => fake()->optional()->url(),
            'alipay_id' => fake()->optional()->word(),
            'alipay_qr_file' => null,
            'alipay_qr_url' => fake()->optional()->url(),
            'address' => fake()->address(),
            'is_active' => true,
        ];
    }
}
