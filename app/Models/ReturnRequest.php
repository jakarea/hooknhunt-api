<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'images' => 'array',
        'is_approved' => 'boolean'
    ];

    public function items()
    {
        return $this->hasMany(ReturnRequestItem::class);
    }

    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}