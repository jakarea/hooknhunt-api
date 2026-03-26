<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockLedger extends Model
{
    protected $guarded = ['id'];

    // Polymorphic relation to find the source (Shipment/Order)
    public function reference()
    {
        return $this->morphTo();
    }
}