<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Relationship: A warehouse has many inventory batches
     */
    public function inventoryBatches()
    {
        return $this->hasMany(InventoryBatch::class);
    }

    /**
     * Relationship: A warehouse has many stock ledger entries
     */
    public function stockLedgers()
    {
        return $this->hasMany(StockLedger::class);
    }
}