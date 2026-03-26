<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class ProcurementPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Procurement module permissions
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Operations',
                'modules' => [
                    [
                        'name' => 'Procurement Products',
                        'permissions' => [
                            ['label' => 'View Procurement Products', 'key' => 'procurement_products_view', 'slug' => 'procurement.products.index'],
                            ['label' => 'Create Procurement Product', 'key' => 'procurement_products_create', 'slug' => 'procurement.products.create'],
                            ['label' => 'Edit Procurement Product', 'key' => 'procurement_products_edit', 'slug' => 'procurement.products.edit'],
                            ['label' => 'Delete Procurement Product', 'key' => 'procurement_products_delete', 'slug' => 'procurement.products.delete'],
                            ['label' => 'Update Procurement Product Status', 'key' => 'procurement_products_status', 'slug' => 'procurement.products.status'],
                        ],
                    ],
                    [
                        'name' => 'Suppliers',
                        'permissions' => [
                            ['label' => 'View Suppliers', 'key' => 'procurement_suppliers_view', 'slug' => 'procurement.suppliers.index'],
                            ['label' => 'Create Supplier', 'key' => 'procurement_suppliers_create', 'slug' => 'procurement.suppliers.create'],
                            ['label' => 'Edit Supplier', 'key' => 'procurement_suppliers_edit', 'slug' => 'procurement.suppliers.edit'],
                            ['label' => 'Delete Supplier', 'key' => 'procurement_suppliers_delete', 'slug' => 'procurement.suppliers.delete'],
                        ],
                    ],
                    [
                        'name' => 'Purchase Orders',
                        'permissions' => [
                            ['label' => 'View Purchase Orders', 'key' => 'procurement_orders_view', 'slug' => 'procurement.orders.index'],
                            ['label' => 'Create Purchase Order', 'key' => 'procurement_orders_create', 'slug' => 'procurement.orders.create'],
                            ['label' => 'Edit Purchase Order', 'key' => 'procurement_orders_edit', 'slug' => 'procurement.orders.edit'],
                            ['label' => 'Delete Purchase Order', 'key' => 'procurement_orders_delete', 'slug' => 'procurement.orders.delete'],
                            ['label' => 'Approve Purchase Order', 'key' => 'procurement_orders_approve', 'slug' => 'procurement.orders.approve'],
                        ],
                    ],
                    [
                        'name' => 'Purchase Returns',
                        'permissions' => [
                            ['label' => 'View Purchase Returns', 'key' => 'procurement_returns_view', 'slug' => 'procurement.returns.index'],
                            ['label' => 'Create Purchase Return', 'key' => 'procurement_returns_create', 'slug' => 'procurement.returns.create'],
                            ['label' => 'Edit Purchase Return', 'key' => 'procurement_returns_edit', 'slug' => 'procurement.returns.edit'],
                            ['label' => 'Delete Purchase Return', 'key' => 'procurement_returns_delete', 'slug' => 'procurement.returns.delete'],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($permissions as $group) {
            foreach ($group['modules'] as $module) {
                foreach ($module['permissions'] as $perm) {
                    Permission::firstOrCreate(
                        ['slug' => $perm['slug']],
                        [
                            'key' => $perm['key'],
                            'group_name' => $group['group'],
                            'module_name' => $module['name'],
                            'name' => $perm['label'],
                        ]
                    );
                }
            }
        }

        $this->command->info('Procurement permissions seeded successfully.');
    }
}
