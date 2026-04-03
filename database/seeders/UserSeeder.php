<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = DB::table('roles')->pluck('id', 'slug');

        // 1 user per role (super_admin is handled by AdminSeeder)
        $testUsers = [
            [
                'role' => 'admin',
                'name' => 'Admin User',
                'phone' => '01710000001',
                'email' => 'admin@hooknhunt.com',
            ],
            [
                'role' => 'operations_manager',
                'name' => 'Operations Manager',
                'phone' => '01710000002',
                'email' => 'ops@hooknhunt.com',
            ],
            [
                'role' => 'sales_manager',
                'name' => 'Sales Manager',
                'phone' => '01710000003',
                'email' => 'sales@hooknhunt.com',
            ],
            [
                'role' => 'finance_manager',
                'name' => 'Finance Manager',
                'phone' => '01710000004',
                'email' => 'finance@hooknhunt.com',
            ],
            [
                'role' => 'marketing_manager',
                'name' => 'Marketing Manager',
                'phone' => '01710000005',
                'email' => 'marketing@hooknhunt.com',
            ],
            [
                'role' => 'support_agent',
                'name' => 'Support Agent',
                'phone' => '01710000006',
                'email' => 'support@hooknhunt.com',
            ],
            [
                'role' => 'supplier',
                'name' => 'Supplier User',
                'phone' => '01710000007',
                'email' => 'supplier@hooknhunt.com',
            ],
            [
                'role' => 'retail_customer',
                'name' => 'Retail Customer',
                'phone' => '01710000008',
                'email' => 'retail@hooknhunt.com',
            ],
            [
                'role' => 'wholesale_customer',
                'name' => 'Wholesale Customer',
                'phone' => '01710000009',
                'email' => 'wholesale@hooknhunt.com',
            ],
        ];

        $staffRoles = ['admin', 'operations_manager', 'sales_manager', 'finance_manager', 'marketing_manager', 'support_agent'];
        $customerRoles = ['retail_customer', 'wholesale_customer'];

        $users = [];
        $userProfiles = [];
        $staffProfiles = [];
        $customerProfiles = [];
        $addresses = [];
        $wallets = [];

        foreach ($testUsers as $index => $testUser) {
            $roleId = $roles[$testUser['role']] ?? null;

            if (!$roleId) {
                $this->command->warn("Role '{$testUser['role']}' not found, skipping user.");
                continue;
            }

            $userId = $index + 2; // ID 2-10 (ID 1 is Super Admin from AdminSeeder)

            $users[] = [
                'id' => $userId,
                'role_id' => $roleId,
                'name' => $testUser['name'],
                'phone' => $testUser['phone'],
                'email' => $testUser['email'],
                'password' => Hash::make('1234567890'),
                'is_active' => true,
                'phone_verified_at' => Carbon::now(),
                'last_login_at' => null,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ];

            // user_profiles
            $userProfiles[] = [
                'user_id' => $userId,
                'address' => null,
                'division' => 'Dhaka',
                'district' => null,
                'thana' => null,
                'dob' => null,
                'gender' => null,
                'profile_photo_id' => null,
            ];

            // staff_profiles for staff roles
            if (in_array($testUser['role'], $staffRoles)) {
                $staffProfiles[] = [
                    'user_id' => $userId,
                    'dob' => null,
                    'gender' => null,
                    'profile_photo_id' => null,
                    'address' => null,
                    'division' => 'Dhaka',
                    'district' => null,
                    'thana' => null,
                    'department_id' => null,
                    'designation' => $testUser['name'],
                    'joining_date' => Carbon::now(),
                    'office_email' => $testUser['email'],
                    'office_email_password' => null,
                    'whatsapp_number' => null,
                    'base_salary' => 0,
                    'house_rent' => 0,
                    'medical_allowance' => 0,
                    'conveyance_allowance' => 0,
                    'overtime_hourly_rate' => 0,
                ];
            }

            // customer_profiles for customer roles
            if (in_array($testUser['role'], $customerRoles)) {
                $customerProfiles[] = [
                    'user_id' => $userId,
                    'dob' => null,
                    'gender' => null,
                    'source' => 'website',
                    'medium' => null,
                    'referral_code' => null,
                    'preferred_language' => 'bn',
                    'preferred_currency' => 'BDT',
                    'marketing_consent' => false,
                    'do_not_contact' => false,
                    'type' => $testUser['role'] === 'wholesale_customer' ? 'wholesale' : 'retail',
                    'trade_license_no' => null,
                    'tax_id' => null,
                    'loyalty_tier' => 'bronze',
                    'loyalty_points' => 0,
                    'lifetime_value' => 0,
                    'total_orders' => 0,
                    'total_spent' => 0,
                    'avg_order_value' => 0,
                    'last_order_date' => null,
                    'notes' => null,
                    'tags' => null,
                ];

                // addresses for customers
                $addresses[] = [
                    'user_id' => $userId,
                    'label' => 'Home',
                    'full_name' => $testUser['name'],
                    'phone' => $testUser['phone'],
                    'address_line1' => 'Dhaka, Bangladesh',
                    'address_line2' => null,
                    'area' => 'Dhaka',
                    'city' => 'Dhaka',
                    'district' => null,
                    'thana' => null,
                    'postal_code' => '1200',
                    'division' => 'Dhaka',
                    'country' => 'Bangladesh',
                    'latitude' => null,
                    'longitude' => null,
                    'is_default' => true,
                    'is_billing_address' => true,
                    'is_shipping_address' => true,
                ];

                // wallets for customers
                $wallets[] = [
                    'user_id' => $userId,
                    'balance' => 0,
                    'total_credited' => 0,
                    'total_debited' => 0,
                    'is_active' => true,
                    'is_frozen' => false,
                ];
            }
        }

        DB::table('users')->insert($users);
        $this->command->info('✅ Created ' . count($users) . ' users');

        DB::table('user_profiles')->insert($userProfiles);
        $this->command->info('✅ Created ' . count($userProfiles) . ' user profiles');

        if (!empty($staffProfiles)) {
            DB::table('staff_profiles')->insert($staffProfiles);
            $this->command->info('✅ Created ' . count($staffProfiles) . ' staff profiles');
        }

        if (!empty($customerProfiles)) {
            DB::table('customer_profiles')->insert($customerProfiles);
            $this->command->info('✅ Created ' . count($customerProfiles) . ' customer profiles');
        }

        if (!empty($addresses)) {
            DB::table('addresses')->insert($addresses);
            $this->command->info('✅ Created ' . count($addresses) . ' addresses');
        }

        if (!empty($wallets)) {
            DB::table('wallets')->insert($wallets);
            $this->command->info('✅ Created ' . count($wallets) . ' wallets');
        }

        $this->command->newLine();
        $this->command->info('📊 User Summary:');
        foreach ($testUsers as $u) {
            $this->command->info("   {$u['name']} ({$u['role']}) — {$u['phone']}");
        }
        $this->command->info('   ━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('   ✅ Total: ' . count($users) . ' users (password: 1234567890)');
    }
}
