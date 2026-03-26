<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryBatch extends Model
{
    protected $guarded = ['id'];

    // FIFO Scope: Get oldest available batches first
    public function scopeAvailable($query)
    {
        return $query->where('remaining_qty', '>', 0)
                     ->orderBy('created_at', 'asc');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
    // Relations
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}