<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\StaffProfile;
use App\Models\Role;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\Hash; // ⚠️ DISABLED FOR DEVELOPMENT

/**
 * Admin Seeder - Creates Super Admin User
 *
 * SECURITY NOTE: Password hashing disabled for development
 * To re-enable hashing, change line 57 to:
 * 'password' => Hash::make('Arif@1658'),
 */
class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Disable foreign key checks temporarily
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        try {
            // Find or create Super Admin role
            $superAdminRole = Role::withSuperAdmin()->where('slug', 'super_admin')->first();

            if (!$superAdminRole) {
                $this->command->warn('Super Admin role not found. Please run RoleSeeder first.');
                return;
            }

            // Check if super admin already exists
            $existingAdmin = User::withSuperAdmin()->where('role_id', $superAdminRole->id)->first();

            if ($existingAdmin) {
                $this->command->info('Super Admin user already exists:');
                $this->command->line("  Name: {$existingAdmin->name}");
                $this->command->line("  Email: {$existingAdmin->email}");
                $this->command->line("  Phone: {$existingAdmin->phone}");
                return;
            }

            // Ensure Administration department exists
            $department = Department::firstOrCreate(
                ['name' => 'Administration'],
                [
                    'description' => 'Administration Department',
                    'is_active' => true,
                ]
            );

            // Create Super Admin User
            $admin = User::create([
                'name' => 'Md Ariful Islam',
                'email' => 'bp9716190715@gmail.com',
                'phone' => '01721100616',
                'password' => 'Arif@1658', // ⚠️ PLAIN TEXT - CHANGE TO: Hash::make('Arif@1658')
                'role_id' => $superAdminRole->id,
                'is_active' => true,
                'phone_verified_at' => now(),
            ]);

            // Create Staff Profile for Super Admin
            StaffProfile::create([
                'user_id' => $admin->id,
                'department_id' => $department->id,
                'designation' => 'Super Administrator',
                'base_salary' => 20000,
                'house_rent' => 16000,
                'medical_allowance' => 4000,
                'conveyance_allowance' => 4000,
                'overtime_hourly_rate' => 1000,
                'joining_date' => now(),
                'gender' => 'male',
            ]);

            $this->command->info('✅ Super Admin user created successfully!');
            $this->command->line('====================================');
            $this->command->line('Login Credentials:');
            $this->command->line('  Name: Md Ariful Islam');
            $this->command->line('  Email: bp9716190715@gmail.com');
            $this->command->line('  Phone: 01721100616');
            $this->command->line('  Password: Arif@1658');
            $this->command->line('====================================');
            $this->command->warn('⚠️  Please change the password after first login!');
            $this->command->newLine();

        } catch (\Exception $e) {
            $this->command->error('Failed to create Super Admin: ' . $e->getMessage());
        } finally {
            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }
}
