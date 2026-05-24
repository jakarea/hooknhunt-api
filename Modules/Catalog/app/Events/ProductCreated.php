<?php

namespace App\Modules\Catalog\Events;

use App\Modules\Catalog\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * ProductCreated Event
 *
 * Fired when a new product is created in the Catalog module.
 * Other modules can listen to this event to sync product data.
 *
 * Example usage in Website module:
 * Event::listen(ProductCreated::class, SyncCatalogProductToWebsite::class);
 */
class ProductCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var Product The product that was created
     */
    public Product $product;

    /**
     * Create a new event instance.
     */
    public function __construct(Product $product)
    {
        $this->product = $product;
    }

    /**
     * Get the product data as array (for easy consumption by listeners)
     */
    public function getProductData(): array
    {
        return [
            'id' => $this->product->id,
            'name' => $this->product->name,
            'slug' => $this->product->slug,
            'sku' => $this->product->sku ?? null,
            'description' => $this->product->description ?? null,
            'price' => $this->product->price ?? null,
            'compare_at_price' => $this->product->compare_at_price ?? null,
            'cost_price' => $this->product->cost_price ?? null,
            'weight' => $this->product->weight ?? null,
            'stock' => $this->getProductStock(),
            'thumbnail_path' => $this->product->thumbnailUrl ?? null,
            'category_id' => $this->product->category_id,
            'category_name' => $this->product->category?->name ?? null,
            'category_slug' => $this->product->category?->slug ?? null,
            'brand_id' => $this->product->brand_id,
            'brand_name' => $this->product->brand?->name ?? null,
            'brand_slug' => $this->product->brand?->slug ?? null,
            'gallery_images' => $this->product->gallery_images_urls ?? [],
            'highlights' => $this->product->highlights ?? [],
            'attributes' => $this->product->attributes ?? [],
            'seo_title' => $this->product->seo_title ?? null,
            'seo_description' => $this->product->seo_description ?? null,
            'status' => $this->product->status,
            'has_variants' => $this->product->variants?->isNotEmpty() ?? false,
            'variant_count' => $this->product->variants?->count() ?? 0,
            'variants' => $this->getVariantsData(),
        ];
    }

    /**
     * Get product stock (aggregated from variants if present)
     */
    protected function getProductStock(): int
    {
        if ($this->product->variants && $this->product->variants->isNotEmpty()) {
            return (int) $this->product->variants->sum('stock');
        }
        return 0;
    }

    /**
     * Get variants data for sync
     */
    protected function getVariantsData(): array
    {
        if (!$this->product->variants || $this->product->variants->isEmpty()) {
            return [];
        }

        return $this->product->variants->map(function ($variant) {
            return [
                'id' => $variant->id,
                'product_id' => $variant->product_id,
                'variant_name' => $variant->variant_name,
                'variant_slug' => $variant->variant_slug,
                'sku' => $variant->sku,
                'custom_sku' => $variant->custom_sku,
                'price' => $variant->price,
                'offer_price' => $variant->offer_price,
                'purchase_cost' => $variant->purchase_cost ?? null,
                'stock' => $variant->stock,
                'weight' => $variant->weight,
                'thumbnail_path' => $variant->thumbnail ?? null,
                'is_active' => $variant->is_active,
                'allow_preorder' => $variant->allow_preorder ?? false,
                'expected_delivery' => $variant->expected_delivery,
                'moq' => $variant->moq,
                'channel' => $variant->channel ?? 'retail',
            ];
        })->toArray();
    }
}
