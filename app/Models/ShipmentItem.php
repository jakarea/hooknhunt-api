<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentItem extends Model
{
    protected $fillable = [
        'shipment_id',
        'product_variant_id',
        'product_id',
        'ordered_qty',
        'received_qty',            // New
        'lost_qty',
        'is_sorted',
        'is_lost',
        'unit_price_rmb',
        'unit_weight',             // New
        'shipping_cost_actual',
        'extra_weight_charge',
        'calculated_landed_cost'   // New
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    
    
}