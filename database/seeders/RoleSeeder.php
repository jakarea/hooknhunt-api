<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'description' => 'Full system control. All modules (ERP + eCommerce), User & role management, System settings, integrations, permissions, Financial & audit controls. Usually company owner / CTO.',
            ],
            [
                'name' => 'Admin',
                'slug' => 'admin',
                'description' => 'Full system control. All modules (ERP + eCommerce), User & role management, System settings, integrations, permissions, Financial & audit controls. Usually company owner / CTO.',
            ],
            [
                'name' => 'Operations Manager',
                'slug' => 'operations_manager',
                'description' => 'Day-to-day business operations. Orders (online + POS), Inventory & stock adjustments, Suppliers & purchase orders, Warehouse & fulfillment flow. Keeps the business running.',
            ],
            [
                'name' => 'Sales & Customer Manager',
                'slug' => 'sales_manager',
                'description' => 'Revenue & customer handling. Online orders & POS sales, Customer profiles, Refunds, returns, discounts, Promotions & coupons. Handles customers and sales growth.',
            ],
            [
                'name' => 'Finance & Accounts',
                'slug' => 'finance_manager',
                'description' => 'Money control & compliance. Invoices & payments, Expenses & payouts, Profit & loss reports, Tax/VAT reports. Critical for ERP accuracy.',
            ],
            [
                'name' => 'Warehouse Staff',
                'slug' => 'warehouse_staff',
                'description' => 'Physical stock management. Stock in/out, Product availability, Barcode scanning, Low-stock alerts. Limited, task-focused role.',
            ],
            [
                'name' => 'Marketing Manager',
                'slug' => 'marketing_manager',
                'description' => 'Marketing campaigns, ads, SEO, promotions, and customer acquisition strategies.',
            ],
            [
                'name' => 'Support Agent',
                'slug' => 'support_agent',
                'description' => 'Customer support, ticket management, live chat, and customer issue resolution.',
            ],
            [
                'name' => 'Supplier',
                'slug' => 'supplier',
                'description' => 'Marketplace model supplier with access to own products and orders.',
            ],
            [
                'name' => 'Retail Customer',
                'slug' => 'retail_customer',
                'description' => 'Regular retail customers purchasing at standard prices.',
            ],
            [
                'name' => 'Wholesale Customer',
                'slug' => 'wholesale_customer',
                'description' => 'Wholesale/B2B customers purchasing at bulk/discounted prices.',
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['slug' => $role['slug']],
                [
                    'name' => $role['name'],
                    'slug' => $role['slug'],
                    'description' => $role['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('✅ Roles seeded successfully!');
        $this->command->info('   - Super Admin');
        $this->command->info('   - Operations Manager');
        $this->command->info('   - Sales & Customer Manager');
        $this->command->info('   - Finance & Accounts');
        $this->command->info('   - Warehouse / Inventory Staff');
        $this->command->info('   - Marketing Manager');
        $this->command->info('   - Support Agent');
        $this->command->info('   - Vendor / Seller');
        $this->command->info('   - Retail Customer');
        $this->command->info('   - Wholesale Customer');
    }
}
