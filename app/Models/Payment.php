<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $guarded = ['id'];

    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'order_id');
    }
}