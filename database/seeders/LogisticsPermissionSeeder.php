<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class LogisticsPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Logistics module permissions based on ShipmentController,
     * ShipmentWorkflowController, and CourierController.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Logistics',
                'modules' => [
                    [
                        'name' => 'Shipments',
                        'permissions' => [
                            ['label' => 'View Shipments', 'key' => 'logistics_shipments_view', 'slug' => 'logistics.shipments.index'],
                            ['label' => 'Create Shipment', 'key' => 'logistics_shipments_create', 'slug' => 'logistics.shipments.create'],
                            ['label' => 'Edit Shipment', 'key' => 'logistics_shipments_edit', 'slug' => 'logistics.shipments.edit'],
                            ['label' => 'Delete Shipment', 'key' => 'logistics_shipments_delete', 'slug' => 'logistics.shipments.delete'],
                            ['label' => 'Create Shipment Draft', 'key' => 'logistics_shipments_draft', 'slug' => 'logistics.shipments.draft'],
                            ['label' => 'Update Shipment Step', 'key' => 'logistics_shipments_update_step', 'slug' => 'logistics.shipments.update-step'],
                            ['label' => 'Receive Shipment', 'key' => 'logistics_shipments_receive', 'slug' => 'logistics.shipments.receive'],
                        ],
                    ],
                    [
                        'name' => 'Couriers',
                        'permissions' => [
                            ['label' => 'View Couriers', 'key' => 'logistics_couriers_view', 'slug' => 'logistics.couriers.index'],
                            ['label' => 'Create Courier', 'key' => 'logistics_couriers_create', 'slug' => 'logistics.couriers.create'],
                            ['label' => 'Edit Courier', 'key' => 'logistics_couriers_edit', 'slug' => 'logistics.couriers.edit'],
                            ['label' => 'Delete Courier', 'key' => 'logistics_couriers_delete', 'slug' => 'logistics.couriers.delete'],
                            ['label' => 'Book Courier Order', 'key' => 'logistics_couriers_book', 'slug' => 'logistics.couriers.book'],
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

        $this->command->info("Seeded {$count} Logistics permissions.");
    }
}
