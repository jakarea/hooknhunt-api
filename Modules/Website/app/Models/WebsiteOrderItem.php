<?php

namespace App\Modules\Website\Models;

// ProductVariant relationship removed (Catalog module dependency)
// Use product_name, product_sku columns directly
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteOrderItem extends Model
{
    protected $table = 'sales_order_items';

    protected $guarded = ['id'];

    protected $fillable = [
        'sales_order_id',
        'product_variant_id',
        'quantity',
        'unit_price',
        'original_price',
        'total_price',
        'total_cost',
        'weight',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(WebsiteOrder::class, 'sales_order_id');
    }

    // ProductVariant relationship REMOVED (Catalog module dependency breaks independence)
    // Use product_name, product_sku columns directly (already migrated from Catalog module)
    // Keep product_variant_id as reference only, access data through denormalized columns

    public function getProfitAttribute(): float
    {
        return (float) $this->total_price - (float) $this->total_cost;
    }

    public function getTotalWeightAttribute(): float
    {
        return (float) $this->weight * (int) $this->quantity;
    }
}
