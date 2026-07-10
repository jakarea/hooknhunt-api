<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $fillable = [
        'product_id',
        'channel',
        'variant_slug',
        'variant_name',
        'thumbnail_id',
        'sku',
        'custom_sku',
        'size',
        'color',
        'material',
        'weight',
        'pattern',
        'unit_id',
        'unit_value',
        'purchase_cost',
        'price',
        'offer_price',
        'offer_starts',
        'offer_ends',
        'stock_alert_level',
        'allow_preorder',
        'expected_delivery',
        'moq',
        'stock',
        'is_active',
    ];
    protected $casts = [
        'stock' => 'integer',
        'weight' => 'decimal:2',
        'purchase_cost' => 'integer',
        'price' => 'integer',
        'offer_price' => 'integer',
        'is_active' => 'boolean',
        'allow_preorder' => 'boolean',
        'moq' => 'integer',
        'stock_alert_level' => 'integer',
        'unit_value' => 'decimal:2',
    ];

    // NOTE: Removed automatic appends to prevent memory exhaustion
    // The 'full_name' accessor creates circular references during serialization
    // The 'current_stock' accessor is redundant (stock is already a column)
    // Use $variant->append('full_name') explicitly when needed in controller
    // protected $appends = ['current_stock', 'full_name'];

    // Auto-append thumbnailUrl and camelCase fields for frontend compatibility
    // These are simple column name conversions that don't cause N+1 queries
    protected $appends = ['thumbnailUrl', 'variantName', 'offerPrice', 'purchaseCost', 'isActive', 'allowPreorder', 'customSku', 'variantSlug', 'currentStock'];

    // --- Relationships ---

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function thumbnailMedia()
    {
        return $this->belongsTo(MediaFile::class, 'thumbnail_id');
    }

    // Unit relationship removed (Inventory module dependency - breaks independence)
    // Use unit_id directly or API calls to Inventory module
    // public function unit()
    // {
    //     return $this->belongsTo(Unit::class);
    // }

    // Inventory batches removed (Inventory module dependency - breaks independence)
    // Use product_variant_id directly or API calls to Inventory module
    // public function batches()
    // {
    //     return $this->hasMany(InventoryBatch::class, 'product_variant_id');
    // }

    public function channelSettings()
    {
        return $this->hasMany(ProductChannelSetting::class, 'product_variant_id'); 
    }

    // --- Accessors ---

    public function getCurrentStockAttribute()
    {
        // Use the stock column directly
        return (int) $this->attributes['stock'] ?? 0;
    }

    public function getFullNameAttribute()
    {
        $productName = $this->relationLoaded('product') ? $this->product->name : 'Unknown Product';
        return $productName . ' - ' . ($this->variant_name ?? $this->sku);
    }

    /**
     * Get thumbnail URL from thumbnail_id (media_files)
     * Returns placeholder if no variant thumbnail is set
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        // If variant has thumbnail_id, get media file URL
        if (!empty($this->attributes['thumbnail_id'])) {
            return url('/media/' . $this->attributes['thumbnail_id']);
        }

        // Return placeholder if no variant thumbnail is set
        return null;
    }

    // --- CamelCase Accessors for Frontend Compatibility ---
    // Convert snake_case database columns to camelCase for API responses

    /**
     * Get variant name (camelCase version of variant_name)
     */
    public function getVariantNameAttribute(): ?string
    {
        return $this->attributes['variant_name'] ?? null;
    }

    /**
     * Get offer price (camelCase version of offer_price)
     */
    public function getOfferPriceAttribute()
    {
        return $this->attributes['offer_price'] ?? null;
    }

    /**
     * Get purchase cost (camelCase version of purchase_cost)
     */
    public function getPurchaseCostAttribute()
    {
        return $this->attributes['purchase_cost'] ?? null;
    }

    /**
     * Get is active (camelCase version of is_active)
     */
    public function getIsActiveAttribute(): bool
    {
        return (bool) ($this->attributes['is_active'] ?? false);
    }

    /**
     * Get allow preorder (camelCase version of allow_preorder)
     */
    public function getAllowPreorderAttribute(): bool
    {
        return (bool) ($this->attributes['allow_preorder'] ?? false);
    }

    /**
     * Get custom SKU (camelCase version of custom_sku)
     */
    public function getCustomSkuAttribute(): ?string
    {
        return $this->attributes['custom_sku'] ?? null;
    }

    /**
     * Get variant slug (camelCase version of variant_slug)
     */
    public function getVariantSlugAttribute(): ?string
    {
        return $this->attributes['variant_slug'] ?? null;
    }

    // --- Channel-Specific Pricing Accessors ---

    /**
     * Get retail price (uses base price as default retail price)
     */
    public function getRetailPriceAttribute()
    {
        return $this->price;
    }

    /**
     * Get retail offer price
     */
    public function getRetailOfferPriceAttribute()
    {
        return $this->offer_price;
    }

    /**
     * Get wholesale price (uses getPriceForChannel method with fallback)
     * Falls back to 85% of retail price if no channel-specific price is set
     */
    public function getWholesalePriceAttribute()
    {
        $price = $this->getPriceForChannel('wholesale_web');
        if ($price !== null) {
            return $price;
        }
        // Fallback: 85% of retail price (common wholesale margin)
        return $this->price * 0.85;
    }

    /**
     * Get wholesale offer price
     */
    public function getWholesaleOfferPriceAttribute()
    {
        return $this->offer_price;
    }

    // --- Helper: Get Selling Price ---
    
    public function getPriceForChannel($channel)
    {
        // রিলেশন লোড না থাকলে লোড করে নিব (Performance Optimization)
        if (!$this->relationLoaded('channelSettings')) {
            $this->load('channelSettings');
        }

        // 1. Check specific channel price
        // Fix: 'channel_slug' -> 'channel' (Database ENUM match)
        $setting = $this->channelSettings->where('channel', $channel)->first();

        if ($setting) {
            return $setting->price;
        }

        // 2. Fallback Logic (যদি স্পেসিফিক দাম না থাকে)
        if ($channel === 'wholesale_web') {
            return $this->default_wholesale_price;
        }

        // বাকি সবার জন্য ডিফল্ট রিটেইল প্রাইস
        return $this->default_retail_price;
    }
}