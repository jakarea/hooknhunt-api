<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryAdjustmentItem extends Model
{
    protected $guarded = ['id'];

    // Relation with Variant (For Product Name, SKU)
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id'); // Ensure correct FK
    }

    // Relation with Header
    public function adjustment()
    {
        return $this->belongsTo(InventoryAdjustment::class, 'inventory_adjustment_id');
    }
}