<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\ProductDeleted;
use App\Modules\Website\Models\WebsiteProduct;
use Illuminate\Support\Facades\Log;

/**
 * DeleteCatalogProductFromWebsite Listener
 *
 * Listens for ProductDeleted events from Catalog module
 * and removes corresponding WebsiteProduct records.
 */
class DeleteCatalogProductFromWebsite
{
    /**
     * Handle the ProductDeleted event.
     */
    public function handle(ProductDeleted $event): void
    {
        try {
            // Find and delete WebsiteProduct
            $websiteProduct = WebsiteProduct::where('catalog_product_id', $event->productId)
                ->first();

            if ($websiteProduct) {
                $websiteProduct->delete();

                Log::info('Website: Deleted product from Catalog', [
                    'catalog_product_id' => $event->productId,
                    'website_product_id' => $websiteProduct->id,
                    'product_slug' => $event->productSlug,
                ]);
            } else {
                Log::info('Website: Product not found for deletion (already removed)', [
                    'catalog_product_id' => $event->productId,
                    'product_slug' => $event->productSlug,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Website: Failed to delete product from Catalog', [
                'catalog_product_id' => $event->productId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
