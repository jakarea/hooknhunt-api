<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\MediaFolder;

class StaffDocumentsFolderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if folder already exists
        $existingFolder = MediaFolder::where('slug', 'staff-documents')->first();

        if (!$existingFolder) {
            // Create "Staff Documents" folder with restricted access
            // Only super_admin can view and edit this folder
            MediaFolder::create([
                'name' => 'Staff Documents',
                'slug' => 'staff-documents',
                'description' => 'Staff profile photos, national IDs, and resumes. Only administrators can access this folder.',
                'parent_id' => null,
                'sort_order' => 999,
                'is_public' => false,
                'allowed_roles' => ['super_admin'],
                'view_roles' => ['super_admin'],
                'edit_roles' => ['super_admin'],
            ]);

            $this->command->info('Staff Documents folder created successfully.');
        } else {
            $this->command->info('Staff Documents folder already exists.');
        }
    }
}
