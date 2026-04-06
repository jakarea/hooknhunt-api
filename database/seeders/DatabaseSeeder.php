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
            PermissionTableSeeder::class, // 4. All Permissions (truncates & re-seeds)
        ]);
    }
}
