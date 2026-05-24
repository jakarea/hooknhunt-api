<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\ProductCreated;
use App\Modules\Website\Models\WebsiteProduct;
use App\Modules\Website\Models\WebsiteProductVariant;
use Illuminate\Support\Facades\Log;

/**
 * SyncCatalogProductToWebsite Listener
 *
 * Listens for ProductCreated events from Catalog module
 * and creates corresponding WebsiteProduct records.
 */
class SyncCatalogProductToWebsite
{
    /**
     * Handle the ProductCreated event.
     */
    public function handle(ProductCreated $event): void
    {
        try {
            $productData = $event->getProductData();

            // Create WebsiteProduct from Catalog product
            $websiteProduct = WebsiteProduct::createFromCatalog($productData);

            // Sync variants if present
            if (!empty($productData['variants']) && is_array($productData['variants'])) {
                foreach ($productData['variants'] as $variantData) {
                    WebsiteProductVariant::createFromCatalog($variantData);
                }
            }

            Log::info('Website: Synced product from Catalog', [
                'catalog_product_id' => $productData['id'],
                'website_product_id' => $websiteProduct->id,
                'variants_synced' => count($productData['variants'] ?? []),
            ]);

        } catch (\Exception $e) {
            Log::error('Website: Failed to sync product from Catalog', [
                'catalog_product_id' => $event->product->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
