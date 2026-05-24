<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $guarded = ['id'];

    // SalesOrder relationship removed (Website module dependency breaks independence)
    // Use order_id directly or API calls to Website module
    // public function order()
    // {
    //     return $this->belongsTo(SalesOrder::class, 'order_id');
    // }
}