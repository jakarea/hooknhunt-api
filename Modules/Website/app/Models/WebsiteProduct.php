<?php

namespace App\Modules\Website\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * WebsiteProduct - Denormalized product data for Website module independence
 *
 * This model stores a copy of essential product data from the Catalog module,
 * allowing the Website module to function independently without direct Catalog dependencies.
 *
 * Data synchronization happens via event listeners:
 * - Catalog\ProductCreated → WebsiteProduct created
 * - Catalog\ProductUpdated → WebsiteProduct updated
 * - Catalog\ProductDeleted → WebsiteProduct soft-deleted
 */
class WebsiteProduct extends Model
{
    use HasFactory;

    protected $table = 'website_products';

    protected $guarded = ['id'];

    /**
     * Casts for automatic type conversion
     */
    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'stock' => 'integer',
        'is_active' => 'boolean',
        'is_published' => 'boolean',
        'has_variants' => 'boolean',
        'gallery_images' => 'array',
        'highlights' => 'array',
        'attributes' => 'array',
        'seo_enabled' => 'boolean',
        'synced_at' => 'datetime',
    ];

    /**
     * Appends for frontend compatibility
     */
    protected $appends = ['thumbnail_url', 'in_stock', 'stock_status'];

    /**
     * Relationship with website product variants
     */
    public function variants(): HasMany
    {
        return $this->hasMany(WebsiteProductVariant::class, 'product_id');
    }

    /**
     * Scope to get only published products
     */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    /**
     * Scope to get only active products
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to search products
     */
    public function scopeSearch($query, $term)
    {
        if ($term) {
            return $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('slug', 'like', "%{$term}%")
                  ->orWhere('sku', 'like', "%{$term}%")
                  ->orWhere('description', 'like', "%{$term}%");
            });
        }
        return $query;
    }

    /**
     * Get thumbnail URL attribute
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path;
    }

    /**
     * Check if product is in stock
     */
    public function getInStockAttribute(): bool
    {
        return $this->stock > 0;
    }

    /**
     * Get stock status
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock === 0) {
            return 'out_of_stock';
        } elseif ($this->stock <= 10) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    /**
     * Sync product data from Catalog module
     * This is called by event listeners when Catalog products change
     */
    public function syncFromCatalog(array $catalogProductData): self
    {
        $this->update([
            'catalog_product_id' => $catalogProductData['id'],
            'name' => $catalogProductData['name'] ?? null,
            'slug' => $catalogProductData['slug'] ?? null,
            'sku' => $catalogProductData['sku'] ?? null,
            'description' => $catalogProductData['description'] ?? null,
            'price' => $catalogProductData['price'] ?? null,
            'compare_at_price' => $catalogProductData['compare_at_price'] ?? null,
            'cost_price' => $catalogProductData['cost_price'] ?? null,
            'weight' => $catalogProductData['weight'] ?? null,
            'stock' => $catalogProductData['stock'] ?? 0,
            'thumbnail_path' => $catalogProductData['thumbnail_path'] ?? null,
            'category_id' => $catalogProductData['category_id'] ?? null,
            'category_name' => $catalogProductData['category_name'] ?? null,
            'category_slug' => $catalogProductData['category_slug'] ?? null,
            'brand_id' => $catalogProductData['brand_id'] ?? null,
            'brand_name' => $catalogProductData['brand_name'] ?? null,
            'brand_slug' => $catalogProductData['brand_slug'] ?? null,
            'gallery_images' => $catalogProductData['gallery_images'] ?? [],
            'highlights' => $catalogProductData['highlights'] ?? [],
            'attributes' => $catalogProductData['attributes'] ?? [],
            'seo_title' => $catalogProductData['seo_title'] ?? null,
            'seo_description' => $catalogProductData['seo_description'] ?? null,
            'seo_enabled' => !empty($catalogProductData['seo_title']),
            'is_published' => ($catalogProductData['status'] ?? 'draft') === 'published',
            'has_variants' => $catalogProductData['has_variants'] ?? false,
            'variant_count' => $catalogProductData['variant_count'] ?? 0,
            'synced_at' => now(),
        ]);
        return $this->fresh();
    }

    /**
     * Create WebsiteProduct from Catalog product data
     */
    public static function createFromCatalog(array $catalogProductData): self
    {
        return self::create([
            'catalog_product_id' => $catalogProductData['id'],
            'name' => $catalogProductData['name'] ?? null,
            'slug' => $catalogProductData['slug'] ?? null,
            'sku' => $catalogProductData['sku'] ?? null,
            'description' => $catalogProductData['description'] ?? null,
            'price' => $catalogProductData['price'] ?? null,
            'compare_at_price' => $catalogProductData['compare_at_price'] ?? null,
            'cost_price' => $catalogProductData['cost_price'] ?? null,
            'weight' => $catalogProductData['weight'] ?? null,
            'stock' => $catalogProductData['stock'] ?? 0,
            'thumbnail_path' => $catalogProductData['thumbnail_path'] ?? null,
            'category_id' => $catalogProductData['category_id'] ?? null,
            'category_name' => $catalogProductData['category_name'] ?? null,
            'category_slug' => $catalogProductData['category_slug'] ?? null,
            'brand_id' => $catalogProductData['brand_id'] ?? null,
            'brand_name' => $catalogProductData['brand_name'] ?? null,
            'brand_slug' => $catalogProductData['brand_slug'] ?? null,
            'gallery_images' => $catalogProductData['gallery_images'] ?? [],
            'highlights' => $catalogProductData['highlights'] ?? [],
            'attributes' => $catalogProductData['attributes'] ?? [],
            'seo_title' => $catalogProductData['seo_title'] ?? null,
            'seo_description' => $catalogProductData['seo_description'] ?? null,
            'seo_enabled' => !empty($catalogProductData['seo_title']),
            'is_published' => ($catalogProductData['status'] ?? 'draft') === 'published',
            'is_active' => true,
            'has_variants' => $catalogProductData['has_variants'] ?? false,
            'variant_count' => $catalogProductData['variant_count'] ?? 0,
            'synced_at' => now(),
        ]);
    }
}
