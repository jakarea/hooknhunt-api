<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Truncates permissions table and re-seeds from all module seeders.
     */
    public function run(): void
    {
        // Fresh start - delete all permissions
        Permission::query()->delete();
        $this->command->info('Cleared all existing permissions.');

        // Seed all permission modules
        $this->call([
            CatalogPermissionSeeder::class,
            CRMPermissionSeeder::class,
            FinancePermissionSeeder::class,
            HRMPermissionSeeder::class,
            InventoryPermissionSeeder::class,
            LogisticsPermissionSeeder::class,
            SalesPermissionSeeder::class,
            CMSPermissionSeeder::class,
            MediaPermissionSeeder::class,
            ProcurementPermissionSeeder::class,
            WebsitePermissionSeeder::class,
        ]);

        $total = Permission::count();
        $this->command->info("Permission seeding complete. Total permissions: {$total}");
    }
}
