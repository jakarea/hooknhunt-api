<?php

namespace App\Modules\Shipping\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentHistory extends Model
{
    protected $guarded = ['id'];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class);
    }
}