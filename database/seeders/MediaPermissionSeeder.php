<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class MediaPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder matches the structure from frontend/src/config/fr_permissions.ts
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'CMS',
                'modules' => [
                    [
                        'name' => 'Media Library',
                        'permissions' => [
                            ['label' => 'View Media Library', 'key' => 'cms_media_view', 'slug' => 'cms.media.view'],
                            ['label' => 'Create Folders', 'key' => 'cms_media_folders_create', 'slug' => 'cms.media.folders.create'],
                            ['label' => 'Edit Folders', 'key' => 'cms_media_folders_edit', 'slug' => 'cms.media.folders.edit'],
                            ['label' => 'Delete Folders', 'key' => 'cms_media_folders_delete', 'slug' => 'cms.media.folders.delete'],
                            ['label' => 'Upload Files', 'key' => 'cms_media_files_upload', 'slug' => 'cms.media.files.upload'],
                            ['label' => 'Delete Files', 'key' => 'cms_media_files_delete', 'slug' => 'cms.media.files.delete'],
                            ['label' => 'Move Files', 'key' => 'cms_media_files_move', 'slug' => 'cms.media.files.move'],
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

        $this->command->info("Seeded {$count} CMS Media permissions matching frontend config.");
    }
}
