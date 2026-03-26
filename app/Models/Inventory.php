<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $table = 'inventory';

    protected $fillable = [
        'product_variant_id',
        'quantity',
        'reserved_quantity',
        'min_stock_level',
        'max_stock_level',
        'reorder_point',
        'average_unit_cost',
        'last_unit_cost',
        'total_value',
        'location',
        'last_stocked_at',
        'last_sold_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'reserved_quantity' => 'integer',
        'min_stock_level' => 'integer',
        'max_stock_level' => 'integer',
        'reorder_point' => 'integer',
        'average_unit_cost' => 'decimal:2',
        'last_unit_cost' => 'decimal:2',
        'total_value' => 'decimal:2',
        'last_stocked_at' => 'datetime',
        'last_sold_at' => 'datetime',
    ];

    // Relationships
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    // Computed properties
    public function getAvailableQuantityAttribute(): int
    {
        return $this->quantity - $this->reserved_quantity;
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->getAvailableQuantityAttribute() <= $this->min_stock_level;
    }

    public function getStockStatusAttribute(): string
    {
        $availableQty = $this->getAvailableQuantityAttribute();
        if ($availableQty <= 0) {
            return 'out_of_stock';
        } elseif ($this->is_low_stock) {
            return 'low_stock';
        } else {
            return 'in_stock';
        }
    }

    // Helper methods
    public function reserveStock(int $quantity): bool
    {
        if ($this->getAvailableQuantityAttribute() < $quantity) {
            return false;
        }

        $this->reserved_quantity += $quantity;
        $this->last_updated_at = now();
        $this->save();

        return true;
    }

    public function releaseReservation(int $quantity): void
    {
        $this->reserved_quantity = max(0, $this->reserved_quantity - $quantity);
        $this->last_updated_at = now();
        $this->save();
    }

    public function fulfillReservation(int $quantity): bool
    {
        if ($this->reserved_quantity < $quantity) {
            return false;
        }

        $this->quantity -= $quantity;
        $this->reserved_quantity -= $quantity;
        $this->last_updated_at = now();
        $this->save();

        return true;
    }

    public function addStock(int $quantity): void
    {
        $this->quantity += $quantity;
        $this->last_updated_at = now();
        $this->save();
    }
}
