<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class CRMPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder matches the structure from frontend/src/config/fr_permissions.ts
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'CRM',
                'modules' => [
                    [
                        'name' => 'Leads',
                        'permissions' => [
                            ['label' => 'View Leads', 'key' => 'crm_lead_view', 'slug' => 'crm.leads.index'],
                            ['label' => 'Create Lead', 'key' => 'crm_lead_create', 'slug' => 'crm.leads.create'],
                            ['label' => 'Edit Lead', 'key' => 'crm_lead_edit', 'slug' => 'crm.leads.edit'],
                            ['label' => 'Delete Lead', 'key' => 'crm_lead_delete', 'slug' => 'crm.leads.delete'],
                            ['label' => 'Convert Lead', 'key' => 'crm_lead_convert', 'slug' => 'crm.leads.convert'],
                        ],
                    ],
                    [
                        'name' => 'Activities',
                        'permissions' => [
                            ['label' => 'View Activities', 'key' => 'crm_activity_view', 'slug' => 'crm.activities.index'],
                            ['label' => 'Create Activity', 'key' => 'crm_activity_create', 'slug' => 'crm.activities.create'],
                            ['label' => 'Edit Activity', 'key' => 'crm_activity_edit', 'slug' => 'crm.activities.edit'],
                            ['label' => 'Delete Activity', 'key' => 'crm_activity_delete', 'slug' => 'crm.activities.delete'],
                            ['label' => 'Complete Activity', 'key' => 'crm_activity_complete', 'slug' => 'crm.activities.complete'],
                        ],
                    ],
                    [
                        'name' => 'Segments',
                        'permissions' => [
                            ['label' => 'View Segments', 'key' => 'crm_segment_view', 'slug' => 'crm.segments.index'],
                            ['label' => 'Create Segment', 'key' => 'crm_segment_create', 'slug' => 'crm.segments.create'],
                            ['label' => 'Edit Segment', 'key' => 'crm_segment_edit', 'slug' => 'crm.segments.edit'],
                            ['label' => 'Delete Segment', 'key' => 'crm_segment_delete', 'slug' => 'crm.segments.delete'],
                        ],
                    ],
                    [
                        'name' => 'Campaigns',
                        'permissions' => [
                            ['label' => 'View Campaigns', 'key' => 'crm_campaign_view', 'slug' => 'crm.campaigns.index'],
                            ['label' => 'Create Campaign', 'key' => 'crm_campaign_create', 'slug' => 'crm.campaigns.create'],
                            ['label' => 'Edit Campaign', 'key' => 'crm_campaign_edit', 'slug' => 'crm.campaigns.edit'],
                            ['label' => 'Delete Campaign', 'key' => 'crm_campaign_delete', 'slug' => 'crm.campaigns.delete'],
                            ['label' => 'Launch Campaign', 'key' => 'crm_campaign_launch', 'slug' => 'crm.campaigns.launch'],
                        ],
                    ],
                    [
                        'name' => 'Customer Profiles',
                        'permissions' => [
                            ['label' => 'View Customer Profiles', 'key' => 'crm_customer_view', 'slug' => 'crm.customers.index'],
                            ['label' => 'Create Customer Profile', 'key' => 'crm_customer_create', 'slug' => 'crm.customers.create'],
                            ['label' => 'Edit Customer Profile', 'key' => 'crm_customer_edit', 'slug' => 'crm.customers.edit'],
                            ['label' => 'Delete Customer Profile', 'key' => 'crm_customer_delete', 'slug' => 'crm.customers.delete'],
                        ],
                    ],
                    [
                        'name' => 'Wallet',
                        'permissions' => [
                            ['label' => 'View Wallet', 'key' => 'crm_wallet_view', 'slug' => 'crm.wallet.index'],
                            ['label' => 'Add Wallet Balance', 'key' => 'crm_wallet_add', 'slug' => 'crm.wallet.add'],
                            ['label' => 'Deduct Wallet Balance', 'key' => 'crm_wallet_deduct', 'slug' => 'crm.wallet.deduct'],
                            ['label' => 'View Wallet Transactions', 'key' => 'crm_wallet_transactions', 'slug' => 'crm.wallet.transactions'],
                        ],
                    ],
                    [
                        'name' => 'Loyalty Program',
                        'permissions' => [
                            ['label' => 'View Loyalty Rules', 'key' => 'crm_loyalty_view', 'slug' => 'crm.loyalty.index'],
                            ['label' => 'Create Loyalty Rule', 'key' => 'crm_loyalty_create', 'slug' => 'crm.loyalty.create'],
                            ['label' => 'Edit Loyalty Rule', 'key' => 'crm_loyalty_edit', 'slug' => 'crm.loyalty.edit'],
                            ['label' => 'Delete Loyalty Rule', 'key' => 'crm_loyalty_delete', 'slug' => 'crm.loyalty.delete'],
                            ['label' => 'Manage Loyalty Points', 'key' => 'crm_loyalty_manage', 'slug' => 'crm.loyalty.manage'],
                        ],
                    ],
                    [
                        'name' => 'Affiliates',
                        'permissions' => [
                            ['label' => 'View Affiliates', 'key' => 'crm_affiliate_view', 'slug' => 'crm.affiliates.index'],
                            ['label' => 'Create Affiliate', 'key' => 'crm_affiliate_create', 'slug' => 'crm.affiliates.create'],
                            ['label' => 'Edit Affiliate', 'key' => 'crm_affiliate_edit', 'slug' => 'crm.affiliates.edit'],
                            ['label' => 'Delete Affiliate', 'key' => 'crm_affiliate_delete', 'slug' => 'crm.affiliates.delete'],
                            ['label' => 'Approve Affiliate', 'key' => 'crm_affiliate_approve', 'slug' => 'crm.affiliates.approve'],
                            ['label' => 'Manage Affiliate Earnings', 'key' => 'crm_affiliate_earnings', 'slug' => 'crm.affiliates.earnings'],
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

        $this->command->info("Seeded {$count} CRM permissions matching frontend config.");
    }
}
