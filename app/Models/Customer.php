<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model {
    protected $guarded = ['id'];

    /**
     * Get the customer's preferred currency.
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get all sales orders for this customer.
     */
    public function salesOrders(): HasMany
    {
        return $this->hasMany(\App\Models\SalesOrder::class);
    }

    /**
     * Get all payment transactions for this customer.
     */
    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }
}