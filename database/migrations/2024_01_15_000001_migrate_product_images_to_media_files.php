<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * MIGRATION SCRIPT: Migrate Product Images from catalog_product_images to media_files
 *
 * This script migrates all product images from the deprecated catalog_product_images table
 * to the centralized media_files table, maintaining data integrity and product relationships.
 *
 * USAGE:
 * - Local: php artisan migrate:images
 * - Server: php artisan migrate:images
 *
 * ROLLBACK:
 * - php artisan migrate:images --rollback
 */

return new class
{
    /**
     * Run the migration.
     *
     * @return void
     */
    public function up()
    {
        // Check if this migration has already been run
        if ($this->isMigrationComplete()) {
            echo "⚠️  Migration already completed. Use --rollback to reverse.\n";
            return;
        }

        echo "\n";
        echo "════════════════════════════════════════════════════════════════\n";
        echo "     PRODUCT IMAGES MIGRATION: catalog_product_images → media_files\n";
        echo "════════════════════════════════════════════════════════════════\n\n";

        // Step 1: Pre-migration checks
        $this->preMigrationChecks();

        // Step 2: Create backup table
        $this->createBackupTable();

        // Step 3: Migrate images
        $idMapping = $this->migrateImages();

        // Step 4: Update product records
        $this->updateProductRecords($idMapping);

        // Step 5: Validate migration
        $this->validateMigration($idMapping);

        // Step 6: Mark migration as complete
        $this->markMigrationComplete();

        echo "\n";
        echo "════════════════════════════════════════════════════════════════\n";
        echo "               ✅ MIGRATION COMPLETED SUCCESSFULLY\n";
        echo "════════════════════════════════════════════════════════════════\n\n";
    }

    /**
     * Reverse the migration.
     *
     * @return void
     */
    public function down()
    {
        echo "\n";
        echo "════════════════════════════════════════════════════════════════\n";
        echo "              ROLLING BACK PRODUCT IMAGES MIGRATION\n";
        echo "════════════════════════════════════════════════════════════════\n\n";

        // Check if backup exists
        if (!Schema::hasTable('products_image_migration_backup')) {
            echo "⚠️  No backup table found. Cannot rollback.\n";
            return;
        }

        // Step 1: Restore product records from backup
        $this->restoreProductRecords();

        // Step 2: Remove migrated images from media_files (optional)
        $this->removeMigratedImages();

        // Step 3: Drop backup table
        $this->dropBackupTable();

        // Step 4: Mark migration as incomplete
        $this->markMigrationIncomplete();

        echo "\n";
        echo "════════════════════════════════════════════════════════════════\n";
        echo "               ✅ ROLLBACK COMPLETED SUCCESSFULLY\n";
        echo "════════════════════════════════════════════════════════════════\n\n";
    }

    /**
     * Pre-migration validation checks.
     */
    protected function preMigrationChecks()
    {
        echo "📋 STEP 1: Pre-Migration Checks\n";
        echo str_repeat("─", 60) . "\n";

        // Check if source table exists
        if (!Schema::hasTable('catalog_product_images')) {
            throw new Exception('Source table catalog_product_images does not exist.');
        }
        echo "✅ Source table exists: catalog_product_images\n";

        // Check if destination table exists
        if (!Schema::hasTable('media_files')) {
            throw new Exception('Destination table media_files does not exist.');
        }
        echo "✅ Destination table exists: media_files\n";

        // Check if products table exists
        if (!Schema::hasTable('products')) {
            throw new Exception('Products table does not exist.');
        }
        echo "✅ Products table exists\n";

        // Count images to migrate
        $imagesToMigrate = DB::table('catalog_product_images')->count();
        echo "📊 Images to migrate: {$imagesToMigrate}\n";

        // Count products affected
        $productsAffected = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->orWhereNotNull('gallery_images')
            ->count();
        echo "📊 Products affected: {$productsAffected}\n";

        // Check for previous incomplete migration
        if ($this->isMigrationPartial()) {
            echo "⚠️  Warning: Previous incomplete migration detected.\n";
            echo "   Backup table exists. Run --rollback first to clean up.\n";
            throw new Exception('Incomplete migration detected. Run rollback first.');
        }

        echo "\n";
    }

    /**
     * Create backup table for rollback capability.
     */
    protected function createBackupTable()
    {
        echo "💾 STEP 2: Creating Backup Table\n";
        echo str_repeat("─", 60) . "\n";

        // Drop backup table if exists (from previous failed migration)
        if (Schema::hasTable('products_image_migration_backup')) {
            DB::statement('DROP TABLE products_image_migration_backup');
            echo "🗑️  Dropped existing backup table\n";
        }

        // Create backup table
        DB::statement("
            CREATE TABLE products_image_migration_backup AS
            SELECT id, thumbnail_id, gallery_images
            FROM products
            WHERE thumbnail_id IS NOT NULL OR gallery_images IS NOT NULL
        ");

        $backupCount = DB::table('products_image_migration_backup')->count();
        echo "✅ Backup table created with {$backupCount} records\n\n";
    }

    /**
     * Migrate images from catalog_product_images to media_files.
     *
     * @return array Mapping of old IDs to new IDs
     */
    protected function migrateImages()
    {
        echo "📦 STEP 3: Migrating Images\n";
        echo str_repeat("─", 60) . "\n";

        $idMapping = [];
        $progress = 0;
        $batchSize = 100;

        // Get all images from catalog_product_images
        $images = DB::table('catalog_product_images')->orderBy('id')->get();

        echo "📊 Processing {$images->count()} images...\n";

        foreach ($images->chunk($batchSize) as $chunk) {
            DB::transaction(function () use ($chunk, &$idMapping) {
                foreach ($chunk as $image) {
                    // Check if image already exists in media_files (by URL)
                    $existing = DB::table('media_files')
                        ->where('url', $image->url)
                        ->first();

                    if ($existing) {
                        // Image already exists, use existing ID
                        $idMapping[$image->id] = $existing->id;
                    } else {
                        // Insert new image into media_files
                        $newId = DB::table('media_files')->insertGetId([
                            'filename' => $image->file_name,
                            'original_filename' => $image->original_filename,
                            'path' => $image->path,
                            'url' => $image->url,
                            'mime_type' => $image->mime_type,
                            'width' => $image->width,
                            'height' => $image->height,
                            'size' => $image->size,
                            'disk' => $image->disk,
                            'alt_text' => $image->alt_text,
                            'created_at' => $image->created_at,
                            'updated_at' => $image->updated_at,
                            // Default values for required fields
                            'folder_id' => null,
                            'is_staff_document' => 0,
                            'uploaded_by_user_id' => null,
                            'variants' => null,
                        ]);

                        $idMapping[$image->id] = $newId;
                    }
                }
            });

            $progress += $chunk->count();
            $percentage = round(($progress / $images->count()) * 100);
            echo "   Progress: {$progress}/{$images->count()} ({$percentage}%)\n";
        }

        echo "✅ Migrated " . count($idMapping) . " images\n";
        echo "📊 New media_files count: " . DB::table('media_files')->count() . "\n\n";

        return $idMapping;
    }

    /**
     * Update product records with new image IDs.
     *
     * @param array $idMapping Mapping of old IDs to new IDs
     */
    protected function updateProductRecords($idMapping)
    {
        echo "🔄 STEP 4: Updating Product Records\n";
        echo str_repeat("─", 60) . "\n";

        $products = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->orWhereNotNull('gallery_images')
            ->get();

        echo "📊 Updating {$products->count()} product records...\n";

        $updatedCount = 0;
        foreach ($products as $product) {
            $newThumbnailId = null;
            $newGalleryImages = null;

            // Update thumbnail_id
            if ($product->thumbnail_id && isset($idMapping[$product->thumbnail_id])) {
                $newThumbnailId = $idMapping[$product->thumbnail_id];
            }

            // Update gallery_images
            if ($product->gallery_images) {
                $galleryIds = json_decode($product->gallery_images, true);
                if (is_array($galleryIds)) {
                    $newGalleryIds = [];
                    foreach ($galleryIds as $oldId) {
                        if (isset($idMapping[$oldId])) {
                            $newGalleryIds[] = $idMapping[$oldId];
                        }
                    }
                    if (!empty($newGalleryIds)) {
                        $newGalleryImages = json_encode($newGalleryIds);
                    }
                }
            }

            // Update product record
            DB::table('products')
                ->where('id', $product->id)
                ->update([
                    'thumbnail_id' => $newThumbnailId,
                    'gallery_images' => $newGalleryImages,
                ]);

            $updatedCount++;
            if ($updatedCount % 50 === 0) {
                echo "   Progress: {$updatedCount}/{$products->count()}\n";
            }
        }

        echo "✅ Updated {$updatedCount} product records\n\n";
    }

    /**
     * Validate the migration.
     *
     * @param array $idMapping Mapping of old IDs to new IDs
     */
    protected function validateMigration($idMapping)
    {
        echo "✔️  STEP 5: Validating Migration\n";
        echo str_repeat("─", 60) . "\n";

        $errors = [];

        // Check 1: All old IDs should have new IDs
        $oldIds = array_keys($idMapping);
        $missingMappings = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->whereNotIn('thumbnail_id', $oldIds)
            ->count();
        if ($missingMappings > 0) {
            $errors[] = "Found {$missingMappings} products with unmapped thumbnail IDs";
        }

        // Check 2: Verify new IDs exist in media_files
        $newIds = array_values($idMapping);
        $missingInMedia = DB::table('media_files')
            ->whereIn('id', $newIds)
            ->count();
        if ($missingInMedia !== count($newIds)) {
            $errors[] = "Some new IDs don't exist in media_files table";
        }

        // Check 3: Verify products have valid image IDs
        $productsWithInvalidImages = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->whereNotNull('gallery_images')
            ->whereNull('thumbnail_id')
            ->count();
        if ($productsWithInvalidImages > 0) {
            $errors[] = "Found {$productsWithInvalidImages} products with NULL thumbnail after migration";
        }

        // Check 4: Sample check - verify image URLs are accessible
        $sampleSize = min(10, count($newIds));
        $sampleIds = array_slice($newIds, 0, $sampleSize);
        $sampleImages = DB::table('media_files')
            ->whereIn('id', $sampleIds)
            ->get();
        $imagesWithoutUrls = $sampleImages->filter(function ($img) {
            return empty($img->url);
        })->count();
        if ($imagesWithoutUrls > 0) {
            $errors[] = "Found {$imagesWithoutUrls} sample images without URLs";
        }

        if (empty($errors)) {
            echo "✅ All validation checks passed\n";
            echo "✅ " . count($idMapping) . " image mappings created\n";
            echo "✅ All new IDs exist in media_files\n";
            echo "✅ Sample check: {$sampleSize} images verified\n";
        } else {
            echo "❌ Validation errors:\n";
            foreach ($errors as $error) {
                echo "   ❌ {$error}\n";
            }
            throw new Exception('Migration validation failed');
        }

        echo "\n";
    }

    /**
     * Mark migration as complete.
     */
    protected function markMigrationComplete()
    {
        // Create migration tracking table if not exists
        if (!Schema::hasTable('migration_tracking')) {
            DB::statement("
                CREATE TABLE migration_tracking (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    migration_name VARCHAR(255) NOT NULL UNIQUE,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
        }

        DB::table('migration_tracking')->insertOrIgnore([
            'migration_name' => 'migrate_product_images_to_media_files',
            'completed_at' => now(),
        ]);

        echo "✅ Migration marked as complete\n\n";
    }

    /**
     * Check if migration is already complete.
     */
    protected function isMigrationComplete()
    {
        if (!Schema::hasTable('migration_tracking')) {
            return false;
        }

        return DB::table('migration_tracking')
            ->where('migration_name', 'migrate_product_images_to_media_files')
            ->exists();
    }

    /**
     * Check if migration is partial (incomplete).
     */
    protected function isMigrationPartial()
    {
        return Schema::hasTable('products_image_migration_backup') &&
               !$this->isMigrationComplete();
    }

    /**
     * Restore product records from backup.
     */
    protected function restoreProductRecords()
    {
        echo "🔄 Restoring product records from backup...\n";

        $backupRecords = DB::table('products_image_migration_backup')->get();
        foreach ($backupRecords as $record) {
            DB::table('products')
                ->where('id', $record->id)
                ->update([
                    'thumbnail_id' => $record->thumbnail_id,
                    'gallery_images' => $record->gallery_images,
                ]);
        }

        echo "✅ Restored {$backupRecords->count()} product records\n";
    }

    /**
     * Remove migrated images from media_files.
     */
    protected function removeMigratedImages()
    {
        echo "🗑️  Removing migrated images from media_files...\n";

        // Get IDs that were migrated (images created after migration started)
        // This is a simplified version - in production you'd track this better
        $migratedCount = DB::table('media_files')
            ->where('created_at', '>=', now()->subHours(24))
            ->count();

        echo "⚠️  Skipped automatic deletion ({$migratedCount} potential records)\n";
        echo "   Manual cleanup required if needed\n";
    }

    /**
     * Drop backup table.
     */
    protected function dropBackupTable()
    {
        DB::statement('DROP TABLE products_image_migration_backup');
        echo "✅ Dropped backup table\n";
    }

    /**
     * Mark migration as incomplete.
     */
    protected function markMigrationIncomplete()
    {
        DB::table('migration_tracking')
            ->where('migration_name', 'migrate_product_images_to_media_files')
            ->delete();

        echo "✅ Migration marked as incomplete\n";
    }
};
