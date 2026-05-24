<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    protected $guarded = ['id'];

    /**
     * FIFO Scope: Get oldest available batches first
     */
    public function scopeAvailable($query)
    {
        return $query->where('remaining_qty', '>', 0)
                     ->orderBy('created_at', 'asc');
    }

    // ProductVariant relationship removed (Catalog module dependency breaks independence)
    // Use product_variant_id directly or API calls to Catalog module
    // public function variant()
    // {
    //     return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    // }

    /**
     * Relationship: Batch belongs to a warehouse (internal to Inventory module)
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    // Product relationship removed (Catalog module dependency breaks independence)
    // Use product_id directly or API calls to Catalog module
    // public function product()
    // {
    //     return $this->belongsTo(Product::class);
    // }
}