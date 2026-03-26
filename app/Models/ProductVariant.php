<?php

namespace App\Models;

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
        'purchase_cost' => 'decimal:2',
        'price' => 'decimal:2',
        'offer_price' => 'decimal:2',
        'is_active' => 'boolean',
        'allow_preorder' => 'boolean',
        'moq' => 'integer',
        'stock_alert_level' => 'integer',
        'unit_value' => 'decimal:2',
    ];

    protected $appends = ['current_stock', 'full_name'];

    // --- Relationships ---

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function batches()
    {
        return $this->hasMany(InventoryBatch::class, 'product_variant_id');
    }

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