<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class SalesPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Sales module permissions based on CustomerController,
     * PosController, OrderController, SalesOrderController, and ReturnController.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Sales',
                'modules' => [
                    [
                        'name' => 'Customers',
                        'permissions' => [
                            ['label' => 'View Customers', 'key' => 'sales_customers_view', 'slug' => 'sales.customers.index'],
                            ['label' => 'Create Customer', 'key' => 'sales_customers_create', 'slug' => 'sales.customers.create'],
                            ['label' => 'Edit Customer', 'key' => 'sales_customers_edit', 'slug' => 'sales.customers.edit'],
                            ['label' => 'Delete Customer', 'key' => 'sales_customers_delete', 'slug' => 'sales.customers.delete'],
                            ['label' => 'View Customer Orders', 'key' => 'sales_customers_order_history', 'slug' => 'sales.customers.order-history'],
                        ],
                    ],
                    [
                        'name' => 'POS',
                        'permissions' => [
                            ['label' => 'View POS Products', 'key' => 'sales_pos_view', 'slug' => 'sales.pos.view'],
                            ['label' => 'Scan Barcode', 'key' => 'sales_pos_scan', 'slug' => 'sales.pos.scan'],
                            ['label' => 'POS Checkout', 'key' => 'sales_pos_checkout', 'slug' => 'sales.pos.checkout'],
                        ],
                    ],
                    [
                        'name' => 'Orders',
                        'permissions' => [
                            ['label' => 'View Orders', 'key' => 'sales_orders_view', 'slug' => 'sales.orders.index'],
                            ['label' => 'Create Order', 'key' => 'sales_orders_create', 'slug' => 'sales.orders.create'],
                            ['label' => 'Edit Order', 'key' => 'sales_orders_edit', 'slug' => 'sales.orders.edit'],
                            ['label' => 'Delete Order', 'key' => 'sales_orders_delete', 'slug' => 'sales.orders.delete'],
                            ['label' => 'Update Order Status', 'key' => 'sales_orders_status', 'slug' => 'sales.orders.status'],
                            ['label' => 'Send to Courier', 'key' => 'sales_orders_courier_push', 'slug' => 'sales.orders.courier-push'],
                        ],
                    ],
                    [
                        'name' => 'Returns',
                        'permissions' => [
                            ['label' => 'View Returns', 'key' => 'sales_returns_view', 'slug' => 'sales.returns.index'],
                            ['label' => 'Create Return', 'key' => 'sales_returns_create', 'slug' => 'sales.returns.create'],
                        ],
                    ],
                ],
            ],
        ];

        $count = 0;
        foreach ($permissions as $groupData) {
            $groupName = $groupData['group'];

            foreach ($groupData['modules'] as $moduleData) {
                $moduleName = $moduleData['name'];

                foreach ($moduleData['permissions'] as $permData) {
                    Permission::updateOrCreate(
                        ['slug' => $permData['slug']],
                        [
                            'name' => $permData['label'],
                            'key' => $permData['key'] ?? null,
                            'slug' => $permData['slug'] ?? null,
                            'group_name' => $groupName,
                            'module_name' => $moduleName,
                        ]
                    );
                    $count++;
                }
            }
        }

        $this->command->info("Seeded {$count} Sales permissions.");
    }
}
