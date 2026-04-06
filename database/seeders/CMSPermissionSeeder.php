<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class CMSPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * CMS module permissions based on TicketController,
     * LandingPageController, MenuController, and PaymentController.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'CMS',
                'modules' => [
                    [
                        'name' => 'Support Tickets',
                        'permissions' => [
                            ['label' => 'View Support Tickets', 'key' => 'cms_tickets_view', 'slug' => 'cms.tickets.index'],
                            ['label' => 'Create Support Ticket', 'key' => 'cms_tickets_create', 'slug' => 'cms.tickets.create'],
                            ['label' => 'Edit Support Ticket', 'key' => 'cms_tickets_edit', 'slug' => 'cms.tickets.edit'],
                            ['label' => 'Delete Support Ticket', 'key' => 'cms_tickets_delete', 'slug' => 'cms.tickets.delete'],
                        ],
                    ],
                    [
                        'name' => 'Landing Pages',
                        'permissions' => [
                            ['label' => 'View Landing Pages', 'key' => 'cms_landing_pages_view', 'slug' => 'cms.landing-pages.index'],
                            ['label' => 'Create Landing Page', 'key' => 'cms_landing_pages_create', 'slug' => 'cms.landing-pages.create'],
                            ['label' => 'Edit Landing Page', 'key' => 'cms_landing_pages_edit', 'slug' => 'cms.landing-pages.edit'],
                            ['label' => 'Delete Landing Page', 'key' => 'cms_landing_pages_delete', 'slug' => 'cms.landing-pages.delete'],
                        ],
                    ],
                    [
                        'name' => 'Menus',
                        'permissions' => [
                            ['label' => 'View Menus', 'key' => 'cms_menus_view', 'slug' => 'cms.menus.index'],
                            ['label' => 'Create Menu', 'key' => 'cms_menus_create', 'slug' => 'cms.menus.create'],
                            ['label' => 'Edit Menu', 'key' => 'cms_menus_edit', 'slug' => 'cms.menus.edit'],
                            ['label' => 'Delete Menu', 'key' => 'cms_menus_delete', 'slug' => 'cms.menus.delete'],
                        ],
                    ],
                    [
                        'name' => 'Payments',
                        'permissions' => [
                            ['label' => 'Initiate bKash Payment', 'key' => 'cms_payments_bkash_init', 'slug' => 'cms.payments.bkash.init'],
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

        $this->command->info("Seeded {$count} CMS permissions.");
    }
}
