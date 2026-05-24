<?php

namespace App\Modules\Website\Listeners;

use App\Modules\Catalog\Events\ProductUpdated;
use App\Modules\Website\Models\WebsiteProduct;
use App\Modules\Website\Models\WebsiteProductVariant;
use Illuminate\Support\Facades\Log;

/**
 * UpdateCatalogProductInWebsite Listener
 *
 * Listens for ProductUpdated events from Catalog module
 * and updates corresponding WebsiteProduct records.
 */
class UpdateCatalogProductInWebsite
{
    /**
     * Handle the ProductUpdated event.
     */
    public function handle(ProductUpdated $event): void
    {
        try {
            $productData = $event->getProductData();

            // Find existing WebsiteProduct
            $websiteProduct = WebsiteProduct::where('catalog_product_id', $productData['id'])
                ->first();

            if ($websiteProduct) {
                // Update existing WebsiteProduct
                $websiteProduct->syncFromCatalog($productData);

                // Update or create variants
                if (!empty($productData['variants']) && is_array($productData['variants'])) {
                    foreach ($productData['variants'] as $variantData) {
                        $websiteVariant = WebsiteProductVariant::where('catalog_variant_id', $variantData['id'])
                            ->first();

                        if ($websiteVariant) {
                            $websiteVariant->syncFromCatalog($variantData);
                        } else {
                            WebsiteProductVariant::createFromCatalog($variantData);
                        }
                    }
                }

                Log::info('Website: Updated product from Catalog', [
                    'catalog_product_id' => $productData['id'],
                    'website_product_id' => $websiteProduct->id,
                    'variants_synced' => count($productData['variants'] ?? []),
                ]);

            } else {
                // WebsiteProduct doesn't exist, create it
                $newWebsiteProduct = WebsiteProduct::createFromCatalog($productData);

                // Sync variants if present
                if (!empty($productData['variants']) && is_array($productData['variants'])) {
                    foreach ($productData['variants'] as $variantData) {
                        WebsiteProductVariant::createFromCatalog($variantData);
                    }
                }

                Log::info('Website: Created missing product from Catalog update', [
                    'catalog_product_id' => $productData['id'],
                    'website_product_id' => $newWebsiteProduct->id,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Website: Failed to update product from Catalog', [
                'catalog_product_id' => $event->product->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
