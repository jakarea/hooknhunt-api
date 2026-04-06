<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class InventoryPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Inventory module permissions based on WarehouseController,
     * InventoryController, InventorySortingController, and AdjustmentController.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Inventory',
                'modules' => [
                    [
                        'name' => 'Warehouses',
                        'permissions' => [
                            ['label' => 'View Warehouses', 'key' => 'inventory_warehouses_view', 'slug' => 'inventory.warehouses.index'],
                            ['label' => 'Create Warehouse', 'key' => 'inventory_warehouses_create', 'slug' => 'inventory.warehouses.create'],
                            ['label' => 'Edit Warehouse', 'key' => 'inventory_warehouses_edit', 'slug' => 'inventory.warehouses.edit'],
                            ['label' => 'Delete Warehouse', 'key' => 'inventory_warehouses_delete', 'slug' => 'inventory.warehouses.delete'],
                        ],
                    ],
                    [
                        'name' => 'Current Stock',
                        'permissions' => [
                            ['label' => 'View Current Stock', 'key' => 'inventory_stock_view', 'slug' => 'inventory.stock.index'],
                            ['label' => 'View Low Stock Report', 'key' => 'inventory_stock_low_stock', 'slug' => 'inventory.stock.low-stock'],
                            ['label' => 'View Stock Ledger', 'key' => 'inventory_stock_ledger', 'slug' => 'inventory.stock.ledger'],
                        ],
                    ],
                    [
                        'name' => 'Sorting',
                        'permissions' => [
                            ['label' => 'View Unsorted Batches', 'key' => 'inventory_sorting_view', 'slug' => 'inventory.sorting.index'],
                            ['label' => 'Sort Stock', 'key' => 'inventory_sorting_sort', 'slug' => 'inventory.sorting.sort'],
                        ],
                    ],
                    [
                        'name' => 'Adjustments',
                        'permissions' => [
                            ['label' => 'View Adjustments', 'key' => 'inventory_adjustments_view', 'slug' => 'inventory.adjustments.index'],
                            ['label' => 'Create Adjustment', 'key' => 'inventory_adjustments_create', 'slug' => 'inventory.adjustments.create'],
                            ['label' => 'Edit Adjustment', 'key' => 'inventory_adjustments_edit', 'slug' => 'inventory.adjustments.edit'],
                            ['label' => 'Delete Adjustment', 'key' => 'inventory_adjustments_delete', 'slug' => 'inventory.adjustments.delete'],
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

        $this->command->info("Seeded {$count} Inventory permissions.");
    }
}
