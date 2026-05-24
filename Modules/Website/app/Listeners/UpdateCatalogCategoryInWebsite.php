<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\CategoryUpdated;
use App\Modules\Website\Models\WebsiteCategory;
use Illuminate\Support\Facades\Log;

/**
 * UpdateCatalogCategoryInWebsite Listener
 *
 * Listens for CategoryUpdated events from Catalog module
 * and updates corresponding WebsiteCategory records.
 */
class UpdateCatalogCategoryInWebsite
{
    /**
     * Handle the CategoryUpdated event.
     */
    public function handle(CategoryUpdated $event): void
    {
        try {
            $categoryData = $event->getCategoryData();

            // Find existing WebsiteCategory
            $websiteCategory = WebsiteCategory::where('catalog_category_id', $categoryData['id'])
                ->first();

            if ($websiteCategory) {
                // Update existing WebsiteCategory
                $websiteCategory->syncFromCatalog($categoryData);

                Log::info('Website: Updated category from Catalog', [
                    'catalog_category_id' => $categoryData['id'],
                    'website_category_id' => $websiteCategory->id,
                ]);

            } else {
                // WebsiteCategory doesn't exist, create it
                $newWebsiteCategory = WebsiteCategory::createFromCatalog($categoryData);

                Log::info('Website: Created missing category from Catalog update', [
                    'catalog_category_id' => $categoryData['id'],
                    'website_category_id' => $newWebsiteCategory->id,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Website: Failed to update category from Catalog', [
                'catalog_category_id' => $event->category->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
