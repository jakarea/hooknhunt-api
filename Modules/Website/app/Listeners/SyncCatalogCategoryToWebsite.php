<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\CategoryCreated;
use App\Modules\Website\Models\WebsiteCategory;
use Illuminate\Support\Facades\Log;

/**
 * SyncCatalogCategoryToWebsite Listener
 *
 * Listens for CategoryCreated events from Catalog module
 * and creates corresponding WebsiteCategory records.
 */
class SyncCatalogCategoryToWebsite
{
    /**
     * Handle the CategoryCreated event.
     */
    public function handle(CategoryCreated $event): void
    {
        try {
            $categoryData = $event->getCategoryData();

            // Create WebsiteCategory from Catalog category
            $websiteCategory = WebsiteCategory::createFromCatalog($categoryData);

            Log::info('Website: Synced category from Catalog', [
                'catalog_category_id' => $categoryData['id'],
                'website_category_id' => $websiteCategory->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Website: Failed to sync category from Catalog', [
                'catalog_category_id' => $event->category->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
