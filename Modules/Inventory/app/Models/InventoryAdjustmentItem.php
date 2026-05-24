<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAdjustmentItem extends Model
{
    protected $guarded = ['id'];

    // ProductVariant relationship removed (Catalog module dependency breaks independence)
    // Use product_variant_id directly or API calls to Catalog module
    // public function variant()
    // {
    //     return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    // }

    /**
     * Relationship: Item belongs to an adjustment (internal to Inventory module)
     */
    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(InventoryAdjustment::class, 'inventory_adjustment_id');
    }
}