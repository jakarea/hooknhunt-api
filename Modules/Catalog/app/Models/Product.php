<?php

namespace App\Modules\Catalog\Models;

use App\Modules\Catalog\Events\ProductCreated;
use App\Modules\Catalog\Events\ProductDeleted;
use App\Modules\Catalog\Events\ProductUpdated;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $fillable = [
        'name',
        'retail_name',
        'wholesale_name',
        'retail_name_bn',
        'wholesale_name_bn',
        'slug',
        'category_id',
        'brand_id',
        'thumbnail_id',
        'gallery_images',
        'cross_sale',
        'up_sale',
        'description',
        'description_bn',
        'product_code',
        'video_url',
        'seo_title',
        'seo_description',
        'seo_tags',
        'status',
        'warranty_enabled',
        'warranty_details',
        'highlights',
        'highlights_bn',
        'attributes',
        'attributes_bn',
        'includes_in_box',
        'includes_in_box_bn',
        'thank_you',
        'hide_from_website',
        'sort_order',
    ];

    protected $casts = [
        'gallery_images' => 'array',
        'seo_tags' => 'array',
        'highlights' => 'array',
        'highlights_bn' => 'array',
        'attributes' => 'array',
        'attributes_bn' => 'array',
        'includes_in_box' => 'array',
        'includes_in_box_bn' => 'array',
        'warranty_enabled' => 'boolean',
        'thank_you' => 'boolean',
        'hide_from_website' => 'boolean',
    ];

    // NOTE: Removed automatic appends to prevent memory exhaustion
    // These accessors caused N+1 queries when loading multiple products
    // Use $product->append('gallery_images_urls') when needed for single product
    // protected $appends = ['gallery_images_urls', 'cross_sale_products', 'up_sale_products'];

    // Auto-append stock accessors for frontend compatibility
    protected $appends = ['stock', 'stock_status', 'in_stock', 'stock_level', 'min_price', 'max_price', 'price_range', 'thumbnailUrl', 'galleryImagesUrls', 'attributesBn', 'highlights', 'highlightsBn', 'includesInBox', 'includesInBoxBn'];

    /**
     * Global scope to order products by sort_order by default
     */
    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope('ordered', function ($query) {
            $query->orderBy('sort_order')->orderBy('id');
        });

        // Fire events for inter-module communication
        static::created(function ($product) {
            ProductCreated::dispatch($product);
        });

        static::updated(function ($product) {
            ProductUpdated::dispatch($product);
        });

        static::deleted(function ($product) {
            ProductDeleted::dispatch($product->id, $product->slug);
        });
    }

    // 1. Relation with Category
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // 2. Relation with Brand
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    // 3. Relation with Variants
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    // 3.1. Get active (first) variant for price display
    public function activeVariant()
    {
        return $this->hasOne(ProductVariant::class)->oldestOfMany();
    }

    // 3.2. Thumbnail relationship (Catalog module - self-contained)
    public function thumbnail()
    {
        return $this->belongsTo(ProductImage::class, 'thumbnail_id');
    }

    // 3.3. Gallery images relationship (Catalog module - self-contained)
    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    // Cross-module dependencies removed for independence:
    // - Review relationship (Website module) - removed
    // - MediaFile dependency (CMS/Core module) - REMOVED ✅
    // - Supplier relationship (Procurement module) - removed
    // Use direct data access or API calls for cross-module data

    // 7. Accessor for Cross Sale Products
    // Parses comma-separated IDs and returns lightweight product data
    public function getCrossSaleProductsAttribute()
    {
        if (empty($this->cross_sale)) return [];

        $ids = array_map('intval', explode(',', $this->cross_sale));

        return Product::whereIn('id', $ids)
            ->get()
            ->sortBy(fn($p) => array_search($p->id, $ids))
            ->values()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'thumbnailUrl' => $p->thumbnailUrl,
            ])
            ->toArray();
    }

    // 8. Accessor for Up Sale Products
    public function getUpSaleProductsAttribute()
    {
        if (empty($this->up_sale)) return [];

        $ids = array_map('intval', explode(',', $this->up_sale));

        return Product::whereIn('id', $ids)
            ->get()
            ->sortBy(fn($p) => array_search($p->id, $ids))
            ->values()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'thumbnailUrl' => $p->thumbnailUrl,
            ])
            ->toArray();
    }

    // 9. Accessors for channel-specific names (no fallback - return null if not set)
    public function getRetailNameAttribute()
    {
        return $this->attributes['retail_name'] ?? null;
    }

    public function getWholesaleNameAttribute()
    {
        return $this->attributes['wholesale_name'] ?? null;
    }

    // 10. Accessors for camelCase compatibility
    // These map camelCase frontend expectations to snake_case database columns
    // Note: We access $this->attributes directly to avoid infinite recursion
    // Laravel's cast system still applies when data is loaded/saved

    public function getSeoTagsAttribute()
    {
        // Access raw attribute directly to avoid infinite recursion
        $value = $this->attributes['seo_tags'] ?? null;

        // If it's already an array (from cast), return it
        if (is_array($value)) {
            return $value;
        }

        // If it's a string (maybe from direct query), try to decode
        if (is_string($value) && !empty($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        // Default to empty array for null, empty string, etc.
        return [];
    }

    public function getSeoTitleAttribute()
    {
        return $this->attributes['seo_title'] ?? null;
    }

    public function getSeoDescriptionAttribute()
    {
        return $this->attributes['seo_description'] ?? null;
    }

    public function getVideoUrlAttribute()
    {
        return $this->attributes['video_url'] ?? null;
    }

    public function getProductCodeAttribute()
    {
        return $this->attributes['product_code'] ?? null;
    }

    public function getWarrantyEnabledAttribute()
    {
        return $this->attributes['warranty_enabled'] ?? null;
    }

    public function getWarrantyDetailsAttribute()
    {
        return $this->attributes['warranty_details'] ?? null;
    }

    // Array-type accessors - always return arrays, never null
    public function getHighlightsAttribute()
    {
        $value = $this->attributes['highlights'] ?? null;
        // Handle JSON string (raw from DB) or already-casted array
        if (is_string($value) && !empty($value)) {
            return json_decode($value, true) ?? [];
        }
        return is_array($value) ? $value : [];
    }

    public function getHighlightsBnAttribute()
    {
        $value = $this->attributes['highlights_bn'] ?? null;
        // Handle JSON string (raw from DB) or already-casted array
        if (is_string($value) && !empty($value)) {
            return json_decode($value, true) ?? [];
        }
        return is_array($value) ? $value : [];
    }

    // NOTE: getAttributesAttribute() removed to avoid conflict with attributes() relationship
    // The database column 'attributes' is handled by Laravel's cast system

    public function getAttributesBnAttribute()
    {
        $value = $this->attributes['attributes_bn'] ?? null;
        // Handle JSON string (raw from DB) or already-casted array
        if (is_string($value) && !empty($value)) {
            return json_decode($value, true) ?? [];
        }
        return is_array($value) ? $value : [];
    }

    public function getIncludesInBoxAttribute()
    {
        $value = $this->attributes['includes_in_box'] ?? null;
        // Handle JSON string (raw from DB) or already-casted array
        if (is_string($value) && !empty($value)) {
            return json_decode($value, true) ?? [];
        }
        return is_array($value) ? $value : [];
    }

    public function getIncludesInBoxBnAttribute()
    {
        $value = $this->attributes['includes_in_box_bn'] ?? null;
        // Handle JSON string (raw from DB) or already-casted array
        if (is_string($value) && !empty($value)) {
            return json_decode($value, true) ?? [];
        }
        return is_array($value) ? $value : [];
    }

    // Supplier relationship removed (Procurement module dependency)
    // Use product_supplier table directly or API calls to Procurement module

    // 6. Relation with Attributes (for additional product properties)
    public function attributes()
    {
        return $this->belongsToMany(Attribute::class, 'attribute_product')
                    ->withPivot('value', 'option_ids')
                    ->withTimestamps();
    }

    // ================================================
    // STOCK ACCESSORS (for frontend compatibility)
    // ================================================

    /**
     * Get total stock from all active variants
     * Returns sum of all variant stock levels
     */
    public function getStockAttribute(): int
    {
        // Use eager-loaded variants if available, otherwise query database
        if ($this->relationLoaded('variants')) {
            return (int) $this->variants->where('is_active', true)->sum('stock');
        }

        return (int) $this->variants()->where('is_active', true)->sum('stock');
    }

    /**
     * Get stock status text based on total stock
     * Returns: 'in_stock', 'low_stock', 'out_of_stock'
     */
    public function getStockStatusAttribute(): string
    {
        $totalStock = $this->stock;

        if ($totalStock === 0) {
            return 'out_of_stock';
        } elseif ($totalStock <= 10) {
            return 'low_stock';
        } else {
            return 'in_stock';
        }
    }

    /**
     * Check if product is in stock
     * Returns true if total stock > 0
     */
    public function getInStockAttribute(): bool
    {
        return $this->stock > 0;
    }

    /**
     * Get stock level text for display
     * Returns human-readable stock status
     */
    public function getStockLevelAttribute(): string
    {
        $totalStock = $this->stock;

        if ($totalStock === 0) {
            return 'Out of Stock';
        } elseif ($totalStock <= 10) {
            return 'Low Stock (' . $totalStock . ' left)';
        } elseif ($totalStock <= 50) {
            return 'In Stock (' . $totalStock . ' available)';
        } else {
            return 'In Stock';
        }
    }

    /**
     * Get minimum price across all active variants
     * Useful for showing price range
     */
    public function getMinPriceAttribute(): float
    {
        // Use eager-loaded variants if available, otherwise query database
        if ($this->relationLoaded('variants')) {
            $minPrice = $this->variants->where('is_active', true)->min('price');
            return (float) ($minPrice ?? 0);
        }

        $minPrice = $this->variants()->where('is_active', true)->min('price');
        return (float) ($minPrice ?? 0);
    }

    /**
     * Get maximum price across all active variants
     * Useful for showing price range
     */
    public function getMaxPriceAttribute(): float
    {
        // Use eager-loaded variants if available, otherwise query database
        if ($this->relationLoaded('variants')) {
            $maxPrice = $this->variants->where('is_active', true)->max('price');
            return (float) ($maxPrice ?? 0);
        }

        $maxPrice = $this->variants()->where('is_active', true)->max('price');
        return (float) ($maxPrice ?? 0);
    }

    /**
     * Get price range as string
     * Returns format like "100-600" or just "100" if single price
     */
    public function getPriceRangeAttribute(): string
    {
        $minPrice = $this->min_price;
        $maxPrice = $this->max_price;

        if ($minPrice === 0 && $maxPrice === 0) {
            return 'Call for Price';
        } elseif ($minPrice === $maxPrice) {
            return (string) $minPrice;
        } else {
            return $minPrice . '-' . $maxPrice;
        }
    }

    /**
     * Get thumbnail URL with fallback to catalog_product_images
     * Returns the URL from the loaded relationship, media_files, or catalog_product_images
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        // If thumbnail relationship is loaded, use it
        if ($this->relationLoaded('thumbnail') && $this->thumbnail) {
            return $this->thumbnail->url ?? null;
        }

        // Otherwise, try media_files table first (post-migration)
        if ($this->thumbnail_id) {
            $image = \DB::table('media_files')
                ->where('id', $this->thumbnail_id)
                ->value('url');

            // If not found in media_files, fallback to catalog_product_images (pre-migration)
            if (!$image) {
                $image = \DB::table('catalog_product_images')
                    ->where('id', $this->thumbnail_id)
                    ->value('url');
            }

            return $image ?: null;
        }

        return null;
    }

    /**
     * Get gallery images URLs with fallback to catalog_product_images
     * Converts gallery_images array of IDs to URLs from media_files or catalog_product_images
     */
    public function getGalleryImagesUrlsAttribute(): array
    {
        if (empty($this->gallery_images) || !is_array($this->gallery_images)) {
            return [];
        }

        // Use catalog_product_images table only (migration complete)
        // gallery_images stores catalog_product_images IDs
        $results = \DB::table('catalog_product_images')
            ->whereIn('id', $this->gallery_images)
            ->select('id', 'url', 'path')
            ->orderBy('id')
            ->get()
            ->keyBy('id');

        $urls = [];
        foreach ($this->gallery_images as $id) {
            if (isset($results[$id])) {
                $file = $results[$id];
                // Use stored URL (probesh.hooknhunt.com) if available, otherwise build from path
                $urls[] = ($file->url && str_starts_with($file->url, 'http'))
                    ? $file->url
                    : url($file->path ?? '');
            }
        }

        return $urls;
    }
}