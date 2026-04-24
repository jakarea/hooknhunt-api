<?php

namespace App\Models\Website;

use App\Models\ProductVariant;
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

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function getProfitAttribute(): float
    {
        return (float) $this->total_price - (float) $this->total_cost;
    }

    public function getTotalWeightAttribute(): float
    {
        return (float) $this->weight * (int) $this->quantity;
    }
}
