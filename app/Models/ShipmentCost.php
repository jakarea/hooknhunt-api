<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentCost extends Model
{
    protected $guarded = ['id'];
    
    // Relation back to Shipment
    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}