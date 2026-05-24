<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAdjustment extends Model
{
    protected $guarded = ['id'];

    // ProductVariant relationship removed (Catalog module dependency breaks independence)
    // Use product_variant_id directly or API calls to Catalog module
    // public function variant()
    // {
    //     return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    // }

    /**
     * Relationship: Adjustment has many items (internal to Inventory module)
     */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentItem::class);
    }

    /**
     * Relationship: Adjustment belongs to a user (Core module dependency - acceptable)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class, 'created_by');
    }
}