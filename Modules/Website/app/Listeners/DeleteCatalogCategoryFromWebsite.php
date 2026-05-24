<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\CategoryDeleted;
use App\Modules\Website\Models\WebsiteCategory;
use Illuminate\Support\Facades\Log;

/**
 * DeleteCatalogCategoryFromWebsite Listener
 *
 * Listens for CategoryDeleted events from Catalog module
 * and removes corresponding WebsiteCategory records.
 */
class DeleteCatalogCategoryFromWebsite
{
    /**
     * Handle the CategoryDeleted event.
     */
    public function handle(CategoryDeleted $event): void
    {
        try {
            // Find and delete WebsiteCategory
            $websiteCategory = WebsiteCategory::where('catalog_category_id', $event->categoryId)
                ->first();

            if ($websiteCategory) {
                $websiteCategory->delete();

                Log::info('Website: Deleted category from Catalog', [
                    'catalog_category_id' => $event->categoryId,
                    'website_category_id' => $websiteCategory->id,
                    'category_slug' => $event->categorySlug,
                ]);
            } else {
                Log::info('Website: Category not found for deletion (already removed)', [
                    'catalog_category_id' => $event->categoryId,
                    'category_slug' => $event->categorySlug,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Website: Failed to delete category from Catalog', [
                'catalog_category_id' => $event->categoryId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
