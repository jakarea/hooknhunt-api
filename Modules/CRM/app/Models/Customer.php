<?php

namespace App\Modules\CRM\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $guarded = ['id'];

    // Currency relationship removed (Finance module dependency breaks independence)
    // Use currency_id directly or API calls to Finance module
    // public function currency(): BelongsTo
    // {
    //     return $this->belongsTo(Currency::class);
    // }

    // SalesOrders relationship removed (Website module dependency breaks independence)
    // Use customer_id directly or API calls to Website module
    // public function salesOrders(): HasMany
    // {
    //     return $this->hasMany(\App\Models\SalesOrder::class);
    // }

    // PaymentTransactions relationship removed (Finance module dependency breaks independence)
    // Use customer_id directly or API calls to Finance module
    // public function paymentTransactions(): HasMany
    // {
    //     return $this->hasMany(PaymentTransaction::class);
    // }
}