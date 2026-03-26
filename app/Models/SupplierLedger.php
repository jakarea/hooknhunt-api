<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'type',           // 'refund', 'payment', 'purchase', 'adjustment'
        'amount',         // RMB Amount
        'balance',        // Running Balance
        'transaction_id', // Unique ID
        'reason'
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}