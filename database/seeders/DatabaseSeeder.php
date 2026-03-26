<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Core seeders - Run in order
        $this->call([
            RoleSeeder::class,           // 1. Roles must be seeded first
            AdminSeeder::class,          // 2. Create Super Admin user (depends on roles)
            UserSeeder::class,           // 3. Other Users (depends on roles)
            // Add more seeders here as needed
            PermissionSeeder::class,   // 4. Permissions (depends on roles)
            HRMPermissionSeeder::class,  // 5. HRM Permissions
            CRMPermissionSeeder::class, // 6. CRM Permissions
            FinancePermissionSeeder::class, // 7. Finance Permissions
            // ... other seeders
        ]);
    }
}
