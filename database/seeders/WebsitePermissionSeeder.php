<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class WebsitePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Website/Storefront admin permissions based on WebsiteAdmin controllers.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Website',
                'modules' => [
                    [
                        'name' => 'Storefront Orders',
                        'permissions' => [
                            ['label' => 'View Storefront Orders', 'key' => 'website_orders_view', 'slug' => 'website.orders.index'],
                            ['label' => 'Edit Storefront Order', 'key' => 'website_orders_edit', 'slug' => 'website.orders.edit'],
                            ['label' => 'Update Order Status', 'key' => 'website_orders_status', 'slug' => 'website.orders.status'],
                            ['label' => 'Update Order Payment', 'key' => 'website_orders_payment', 'slug' => 'website.orders.payment'],
                            ['label' => 'Add Order Item', 'key' => 'website_orders_item_add', 'slug' => 'website.orders.items.add'],
                            ['label' => 'Edit Order Item', 'key' => 'website_orders_item_edit', 'slug' => 'website.orders.items.edit'],
                            ['label' => 'Remove Order Item', 'key' => 'website_orders_item_remove', 'slug' => 'website.orders.items.remove'],
                            ['label' => 'Send to Courier', 'key' => 'website_orders_courier_send', 'slug' => 'website.orders.courier.send'],
                            ['label' => 'Sync Courier Status', 'key' => 'website_orders_courier_sync', 'slug' => 'website.orders.courier.sync'],
                            ['label' => 'View Order Statistics', 'key' => 'website_orders_statistics', 'slug' => 'website.orders.statistics'],
                            ['label' => 'View Status History', 'key' => 'website_orders_status_history', 'slug' => 'website.orders.status-history'],
                            ['label' => 'View Activity Log', 'key' => 'website_orders_activity_log', 'slug' => 'website.orders.activity-log'],
                            ['label' => 'Calculate Delivery Charge', 'key' => 'website_orders_delivery_calculate', 'slug' => 'website.orders.delivery.calculate'],
                            ['label' => 'Send Order SMS', 'key' => 'website_orders_sms', 'slug' => 'website.orders.sms'],
                            ['label' => 'Search Products', 'key' => 'website_orders_product_search', 'slug' => 'website.orders.products.search'],
                        ],
                    ],
                    [
                        'name' => 'Sliders',
                        'permissions' => [
                            ['label' => 'View Sliders', 'key' => 'website_sliders_view', 'slug' => 'website.sliders.index'],
                            ['label' => 'Create Slider', 'key' => 'website_sliders_create', 'slug' => 'website.sliders.create'],
                            ['label' => 'Edit Slider', 'key' => 'website_sliders_edit', 'slug' => 'website.sliders.edit'],
                            ['label' => 'Delete Slider', 'key' => 'website_sliders_delete', 'slug' => 'website.sliders.delete'],
                            ['label' => 'Reorder Sliders', 'key' => 'website_sliders_reorder', 'slug' => 'website.sliders.reorder'],
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

        $this->command->info("Seeded {$count} Website permissions.");
    }
}
