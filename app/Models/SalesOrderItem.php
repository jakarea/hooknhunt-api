<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesOrderItem extends Model
{
    protected $guarded = ['id'];

    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    // Relation: Which batches fulfilled this item?
    public function allocations()
    {
        return $this->hasMany(SalesItemAllocation::class);
    }

    // Calculate Profit for this line item
    public function getProfitAttribute()
    {
        return $this->total_price - $this->total_cost;
    }
}