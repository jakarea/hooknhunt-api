<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to migrate MediaFile data to ProductImage.
     * This breaks the CMS dependency from Catalog module.
     */
    public function up(): void
    {
        // Check if MediaFile table exists and has data
        if (!Schema::hasTable('cms_media_files')) {
            return; // Skip migration if CMS module is not installed
        }

        // Migrate thumbnails first
        $this->migrateThumbnails();

        // Migrate gallery images
        $this->migrateGalleryImages();

        // Update products table to use new structure
        $this->updateProductsTable();
    }

    /**
     * Migrate thumbnail images from MediaFile to ProductImage
     */
    private function migrateThumbnails(): void
    {
        $products = DB::table('products')
            ->whereNotNull('thumbnail_id')
            ->where('thumbnail_id', '>', 0)
            ->get();

        foreach ($products as $product) {
            $mediaFile = DB::table('cms_media_files')->where('id', $product->thumbnail_id)->first();

            if ($mediaFile) {
                DB::table('catalog_product_images')->insert([
                    'product_id' => $product->id,
                    'url' => $mediaFile->url,
                    'file_name' => $mediaFile->filename ?? null,
                    'original_filename' => $mediaFile->original_filename ?? null,
                    'mime_type' => $mediaFile->mime_type ?? null,
                    'size' => $mediaFile->size ?? null,
                    'width' => $mediaFile->width ?? null,
                    'height' => $mediaFile->height ?? null,
                    'disk' => $mediaFile->disk ?? 'local',
                    'path' => $mediaFile->path ?? null,
                    'is_thumbnail' => true,
                    'sort_order' => 0,
                    'alt_text' => $mediaFile->alt_text ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Migrate gallery images from MediaFile to ProductImage
     */
    private function migrateGalleryImages(): void
    {
        $products = DB::table('products')
            ->whereNotNull('gallery_images')
            ->where('gallery_images', '<>', '')
            ->get();

        foreach ($products as $product) {
            $galleryIds = json_decode($product->gallery_images, true);

            if (!is_array($galleryIds) || empty($galleryIds)) {
                continue;
            }

            $sortOrder = 1; // Start sort order after thumbnail

            foreach ($galleryIds as $mediaId) {
                $mediaFile = DB::table('cms_media_files')->where('id', $mediaId)->first();

                if ($mediaFile) {
                    // Check if this image was already migrated as thumbnail
                    $exists = DB::table('catalog_product_images')
                        ->where('product_id', $product->id)
                        ->where('url', $mediaFile->url)
                        ->exists();

                    if (!$exists) {
                        DB::table('catalog_product_images')->insert([
                            'product_id' => $product->id,
                            'url' => $mediaFile->url,
                            'file_name' => $mediaFile->filename ?? null,
                            'original_filename' => $mediaFile->original_filename ?? null,
                            'mime_type' => $mediaFile->mime_type ?? null,
                            'size' => $mediaFile->size ?? null,
                            'width' => $mediaFile->width ?? null,
                            'height' => $mediaFile->height ?? null,
                            'disk' => $mediaFile->disk ?? 'local',
                            'path' => $mediaFile->path ?? null,
                            'is_thumbnail' => false,
                            'sort_order' => $sortOrder++,
                            'alt_text' => $mediaFile->alt_text ?? null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Update products table to use new ProductImage IDs
     */
    private function updateProductsTable(): void
    {
        // Update thumbnail_id to point to catalog_product_images instead of cms_media_files
        DB::statement('
            UPDATE products p
            SET p.thumbnail_id = (
                SELECT id FROM catalog_product_images
                WHERE product_id = p.id AND is_thumbnail = 1
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1 FROM catalog_product_images
                WHERE product_id = p.id AND is_thumbnail = 1
            )
        ');

        // Update gallery_images to contain catalog_product_images IDs instead of cms_media_files IDs
        $products = DB::table('products')
            ->whereNotNull('gallery_images')
            ->where('gallery_images', '<>', '')
            ->get();

        foreach ($products as $product) {
            $oldGalleryIds = json_decode($product->gallery_images, true);

            if (!is_array($oldGalleryIds) || empty($oldGalleryIds)) {
                continue;
            }

            // Get new ProductImage IDs that correspond to the old MediaFile IDs
            $newGalleryIds = DB::table('catalog_product_images as pi')
                ->join('cms_media_files as mf', function($join) {
                    $join->on('pi.url', '=', 'mf.url');
                })
                ->where('pi.product_id', $product->id)
                ->whereIn('mf.id', $oldGalleryIds)
                ->where('pi.is_thumbnail', false)
                ->orderBy('pi.sort_order')
                ->pluck('pi.id')
                ->toArray();

            if (!empty($newGalleryIds)) {
                DB::table('products')
                    ->where('id', $product->id)
                    ->update([
                        'gallery_images' => json_encode($newGalleryIds),
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert products table
        $this->revertProductsTable();

        // Delete all migrated ProductImage records
        DB::table('catalog_product_images')->truncate();
    }

    /**
     * Revert products table to use MediaFile IDs
     */
    private function revertProductsTable(): void
    {
        if (!Schema::hasTable('cms_media_files')) {
            return;
        }

        // Revert thumbnail_id to point to cms_media_files
        DB::statement('
            UPDATE products p
            SET p.thumbnail_id = (
                SELECT mf.id FROM cms_media_files mf
                INNER JOIN catalog_product_images pi ON mf.url = pi.url
                WHERE pi.product_id = p.id AND pi.is_thumbnail = 1
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1 FROM catalog_product_images pi
                INNER JOIN cms_media_files mf ON pi.url = mf.url
                WHERE pi.product_id = p.id AND pi.is_thumbnail = 1
            )
        ');

        // Revert gallery_images to contain cms_media_files IDs
        $products = DB::table('products')
            ->whereNotNull('gallery_images')
            ->where('gallery_images', '<>', '')
            ->get();

        foreach ($products as $product) {
            $newGalleryIds = json_decode($product->gallery_images, true);

            if (!is_array($newGalleryIds) || empty($newGalleryIds)) {
                continue;
            }

            // Get old MediaFile IDs that correspond to the new ProductImage IDs
            $oldGalleryIds = DB::table('cms_media_files as mf')
                ->join('catalog_product_images as pi', function($join) {
                    $join->on('mf.url', '=', 'pi.url');
                })
                ->where('pi.product_id', $product->id)
                ->whereIn('pi.id', $newGalleryIds)
                ->where('pi.is_thumbnail', false)
                ->orderBy('pi.sort_order')
                ->pluck('mf.id')
                ->toArray();

            if (!empty($oldGalleryIds)) {
                DB::table('products')
                    ->where('id', $product->id)
                    ->update([
                        'gallery_images' => json_encode($oldGalleryIds),
                        'updated_at' => now(),
                    ]);
            }
        }
    }
};
