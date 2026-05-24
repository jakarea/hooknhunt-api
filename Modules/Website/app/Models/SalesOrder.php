<?php

namespace App\Modules\Website\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrder extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    // 1. Casts for JSON & Data Types
    protected $casts = [
        'external_data' => 'array', // Marketplace (Daraz/Evaly) raw data
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // 2. Relations

    // Customer relationship removed (CRM module dependency breaks independence)
    // Use customer_id directly or API calls to CRM module
    // public function customer()
    // {
    //     return $this->belongsTo(Customer::class);
    // }

    public function items()
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    // PaymentTransaction relationship removed (Finance module dependency breaks independence)
    // Use API calls to Finance module
    // public function paymentTransactions()
    // {
    //     return $this->hasMany(PaymentTransaction::class);
    // }
    
    // 3. Helpers / Accessors
    
    // Check if order is fully paid
    public function getIsPaidAttribute()
    {
        return $this->paid_amount >= $this->total_amount;
    }

    // Check if order is from external source (Marketplace)
    public function getIsExternalAttribute()
    {
        return !is_null($this->external_order_id);
    }
}