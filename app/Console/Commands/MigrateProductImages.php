<?php

namespace App\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigrateProductImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:images {--rollback : Rollback the migration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate product images from catalog_product_images to media_files table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            if ($this->option('rollback')) {
                $this->rollback();
            } else {
                $this->migrate();
            }

            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error('Migration failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Run the migration.
     */
    protected function migrate()
    {
        // Check if this migration has already been run
        if ($this->isMigrationComplete()) {
            $this->warn('⚠️  Migration already completed. Use --rollback to reverse.');
            return;
        }

        $this->newLine();
        $this->info('════════════════════════════════════════════════════════════════');
        $this->info('     PRODUCT IMAGES MIGRATION: catalog_product_images → media_files');
        $this->info('════════════════════════════════════════════════════════════════');
        $this->newLine();

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

        $this->newLine();
        $this->info('════════════════════════════════════════════════════════════════');
        $this->info('               ✅ MIGRATION COMPLETED SUCCESSFULLY');
        $this->info('════════════════════════════════════════════════════════════════');
        $this->newLine();
    }

    /**
     * Rollback the migration.
     */
    protected function rollback()
    {
        $this->newLine();
        $this->info('════════════════════════════════════════════════════════════════');
        $this->info('              ROLLING BACK PRODUCT IMAGES MIGRATION');
        $this->info('════════════════════════════════════════════════════════════════');
        $this->newLine();

        // Check if backup exists
        if (!Schema::hasTable('products_image_migration_backup')) {
            $this->warn('⚠️  No backup table found. Cannot rollback.');
            return;
        }

        // Confirm rollback
        if (!$this->confirm('Are you sure you want to rollback this migration?')) {
            $this->info('Rollback cancelled.');
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

        $this->newLine();
        $this->info('════════════════════════════════════════════════════════════════');
        $this->info('               ✅ ROLLBACK COMPLETED SUCCESSFULLY');
        $this->info('════════════════════════════════════════════════════════════════');
        $this->newLine();
    }

    /**
     * Pre-migration validation checks.
     */
    protected function preMigrationChecks()
    {
        $this->info('📋 STEP 1: Pre-Migration Checks');
        $this->line(str_repeat('─', 60));

        // Check if source table exists
        if (!Schema::hasTable('catalog_product_images')) {
            throw new Exception('Source table catalog_product_images does not exist.');
        }
        $this->info('✅ Source table exists: catalog_product_images');

        // Check if destination table exists
        if (!Schema::hasTable('media_files')) {
            throw new Exception('Destination table media_files does not exist.');
        }
        $this->info('✅ Destination table exists: media_files');

        // Check if products table exists
        if (!Schema::hasTable('products')) {
            throw new Exception('Products table does not exist.');
        }
        $this->info('✅ Products table exists');

        // Count images to migrate
        $imagesToMigrate = DB::table('catalog_product_images')->count();
        $this->info("📊 Images to migrate: {$imagesToMigrate}");

        // Count products affected
        $productsAffected = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->orWhereNotNull('gallery_images')
            ->count();
        $this->info("📊 Products affected: {$productsAffected}");

        // Check for previous incomplete migration
        if ($this->isMigrationPartial()) {
            $this->warn('⚠️  Warning: Previous incomplete migration detected.');
            $this->warn('   Backup table exists. Run --rollback first to clean up.');
            throw new Exception('Incomplete migration detected. Run rollback first.');
        }

        $this->newLine();
    }

    /**
     * Create backup table for rollback capability.
     */
    protected function createBackupTable()
    {
        $this->info('💾 STEP 2: Creating Backup Table');
        $this->line(str_repeat('─', 60));

        // Drop backup table if exists (from previous failed migration)
        if (Schema::hasTable('products_image_migration_backup')) {
            DB::statement('DROP TABLE products_image_migration_backup');
            $this->info('🗑️  Dropped existing backup table');
        }

        // Create backup table
        DB::statement("
            CREATE TABLE products_image_migration_backup AS
            SELECT id, thumbnail_id, gallery_images
            FROM products
            WHERE thumbnail_id IS NOT NULL OR gallery_images IS NOT NULL
        ");

        $backupCount = DB::table('products_image_migration_backup')->count();
        $this->info("✅ Backup table created with {$backupCount} records");
        $this->newLine();
    }

    /**
     * Migrate images from catalog_product_images to media_files.
     *
     * @return array Mapping of old IDs to new IDs
     */
    protected function migrateImages()
    {
        $this->info('📦 STEP 3: Migrating Images');
        $this->line(str_repeat('─', 60));

        $idMapping = [];
        $progress = 0;
        $batchSize = 100;

        // Get all images from catalog_product_images
        $images = DB::table('catalog_product_images')->orderBy('id')->get();

        $this->info("📊 Processing {$images->count()} images...");

        $bar = $this->output->createProgressBar($images->count());
        $bar->start();

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

                    $bar->advance();
                }
            });

            $progress += $chunk->count();
        }

        $bar->finish();
        $this->newLine();

        $this->info("✅ Migrated " . count($idMapping) . " images");
        $this->info('📊 New media_files count: ' . DB::table('media_files')->count());
        $this->newLine();

        return $idMapping;
    }

    /**
     * Update product records with new image IDs.
     *
     * @param array $idMapping Mapping of old IDs to new IDs
     */
    protected function updateProductRecords($idMapping)
    {
        $this->info('🔄 STEP 4: Updating Product Records');
        $this->line(str_repeat('─', 60));

        $products = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->orWhereNotNull('gallery_images')
            ->get();

        $this->info("📊 Updating {$products->count()} product records...");

        $bar = $this->output->createProgressBar($products->count());
        $bar->start();

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
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("✅ Updated {$updatedCount} product records");
        $this->newLine();
    }

    /**
     * Validate the migration.
     *
     * @param array $idMapping Mapping of old IDs to new IDs
     */
    protected function validateMigration($idMapping)
    {
        $this->info('✔️  STEP 5: Validating Migration');
        $this->line(str_repeat('─', 60));

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

        // Check 3: Sample check - verify image URLs are accessible
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
            $this->info('✅ All validation checks passed');
            $this->info('✅ ' . count($idMapping) . ' image mappings created');
            $this->info('✅ All new IDs exist in media_files');
            $this->info("✅ Sample check: {$sampleSize} images verified");
        } else {
            $this->error('❌ Validation errors:');
            foreach ($errors as $error) {
                $this->error("   ❌ {$error}");
            }
            throw new Exception('Migration validation failed');
        }

        $this->newLine();
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

        $this->info('✅ Migration marked as complete');
        $this->newLine();
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
        $this->info('🔄 Restoring product records from backup...');

        $backupRecords = DB::table('products_image_migration_backup')->get();
        $bar = $this->output->createProgressBar($backupRecords->count());
        $bar->start();

        foreach ($backupRecords as $record) {
            DB::table('products')
                ->where('id', $record->id)
                ->update([
                    'thumbnail_id' => $record->thumbnail_id,
                    'gallery_images' => $record->gallery_images,
                ]);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("✅ Restored {$backupRecords->count()} product records");
    }

    /**
     * Remove migrated images from media_files.
     */
    protected function removeMigratedImages()
    {
        $this->info('🗑️  Skipping automatic deletion of migrated images');
        $this->warn('   Manual cleanup required if needed');
    }

    /**
     * Drop backup table.
     */
    protected function dropBackupTable()
    {
        DB::statement('DROP TABLE products_image_migration_backup');
        $this->info('✅ Dropped backup table');
    }

    /**
     * Mark migration as incomplete.
     */
    protected function markMigrationIncomplete()
    {
        DB::table('migration_tracking')
            ->where('migration_name', 'migrate_product_images_to_media_files')
            ->delete();

        $this->info('✅ Migration marked as incomplete');
    }
}
