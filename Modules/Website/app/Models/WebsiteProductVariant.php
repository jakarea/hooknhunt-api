<?php

namespace App\Modules\Website\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WebsiteProductVariant - Denormalized product variant data for Website module independence
 *
 * This model stores variant data from Catalog module, allowing Website to function
 * independently without direct Catalog dependencies.
 *
 * Synchronized via Catalog events:
 * - Catalog\ProductVariantCreated → WebsiteProductVariant created
 * - Catalog\ProductVariantUpdated → WebsiteProductVariant updated
 * - Catalog\ProductVariantDeleted → WebsiteProductVariant soft-deleted
 */
class WebsiteProductVariant extends Model
{
    use HasFactory;

    protected $table = 'website_product_variants';

    protected $guarded = ['id'];

    /**
     * Casts for automatic type conversion
     */
    protected $casts = [
        'price' => 'decimal:2',
        'offer_price' => 'decimal:2',
        'purchase_cost' => 'decimal:2',
        'stock' => 'integer',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
        'allow_preorder' => 'boolean',
        'moq' => 'integer',
        'synced_at' => 'datetime',
    ];

    /**
     * Appends for frontend compatibility
     */
    protected $appends = ['thumbnail_url', 'in_stock', 'retail_price', 'wholesale_price'];

    /**
     * Relationship with website product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(WebsiteProduct::class, 'product_id');
    }

    /**
     * Scope to get only active variants
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get thumbnail URL attribute
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path;
    }

    /**
     * Check if variant is in stock
     */
    public function getInStockAttribute(): bool
    {
        return $this->stock > 0;
    }

    /**
     * Get retail price (alias for price)
     */
    public function getRetailPriceAttribute(): float
    {
        return (float) $this->price;
    }

    /**
     * Get wholesale price (with fallback logic)
     */
    public function getWholesalePriceAttribute(): float
    {
        if ($this->offer_price && $this->offer_price > 0) {
            return (float) $this->offer_price;
        }
        return (float) $this->price * 0.85; // 85% fallback
    }

    /**
     * Sync variant data from Catalog module
     */
    public function syncFromCatalog(array $catalogVariantData): self
    {
        return $this->update([
            'catalog_variant_id' => $catalogVariantData['id'],
            'product_id' => $catalogVariantData['product_id'] ?? null,
            'variant_name' => $catalogVariantData['variant_name'] ?? null,
            'variant_slug' => $catalogVariantData['variant_slug'] ?? null,
            'sku' => $catalogVariantData['sku'] ?? null,
            'custom_sku' => $catalogVariantData['custom_sku'] ?? null,
            'price' => $catalogVariantData['price'] ?? null,
            'offer_price' => $catalogVariantData['offer_price'] ?? null,
            'purchase_cost' => $catalogVariantData['purchase_cost'] ?? null,
            'stock' => $catalogVariantData['stock'] ?? 0,
            'weight' => $catalogVariantData['weight'] ?? null,
            'thumbnail_path' => $catalogVariantData['thumbnail_path'] ?? null,
            'is_active' => $catalogVariantData['is_active'] ?? true,
            'allow_preorder' => $catalogVariantData['allow_preorder'] ?? false,
            'expected_delivery' => $catalogVariantData['expected_delivery'] ?? null,
            'moq' => $catalogVariantData['moq'] ?? null,
            'channel' => $catalogVariantData['channel'] ?? 'retail',
            'synced_at' => now(),
        ]);
    }

    /**
     * Create WebsiteProductVariant from Catalog variant data
     */
    public static function createFromCatalog(array $catalogVariantData): self
    {
        return self::create([
            'catalog_variant_id' => $catalogVariantData['id'],
            'product_id' => $catalogVariantData['product_id'] ?? null,
            'variant_name' => $catalogVariantData['variant_name'] ?? null,
            'variant_slug' => $catalogVariantData['variant_slug'] ?? null,
            'sku' => $catalogVariantData['sku'] ?? null,
            'custom_sku' => $catalogVariantData['custom_sku'] ?? null,
            'price' => $catalogVariantData['price'] ?? null,
            'offer_price' => $catalogVariantData['offer_price'] ?? null,
            'purchase_cost' => $catalogVariantData['purchase_cost'] ?? null,
            'stock' => $catalogVariantData['stock'] ?? 0,
            'weight' => $catalogVariantData['weight'] ?? null,
            'thumbnail_path' => $catalogVariantData['thumbnail_path'] ?? null,
            'is_active' => $catalogVariantData['is_active'] ?? true,
            'allow_preorder' => $catalogVariantData['allow_preorder'] ?? false,
            'expected_delivery' => $catalogVariantData['expected_delivery'] ?? null,
            'moq' => $catalogVariantData['moq'] ?? null,
            'channel' => $catalogVariantData['channel'] ?? 'retail',
            'synced_at' => now(),
        ]);
    }
}
