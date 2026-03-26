<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shipment extends Model
{
    use SoftDeletes;

    // We use guarded ID to allow mass assignment of all other fields 
    // including the new ones (total_extra_cost, total_extra_weight, etc.)
    protected $guarded = ['id'];

    protected $casts = [
        // Monetary / Numeric Precision
        'exchange_rate' => 'decimal:4',
        'total_china_cost_rmb' => 'decimal:2',
        'shipping_cost_intl' => 'decimal:2',
        'shipping_cost_local' => 'decimal:2',
        'misc_cost' => 'decimal:2',
        'total_extra_cost' => 'decimal:2',   // Added in Batch 21
        'total_extra_weight' => 'decimal:3', // Added in Batch 21
        'lost_item_total_value' => 'decimal:2',

        // Dates
        'arrived_bd_at' => 'datetime',
        'arrived_bogura_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // =============================================
    // RELATIONSHIPS
    // =============================================

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(ShipmentItem::class);
    }

    public function timelines()
    {
        return $this->hasMany(ShipmentTimeline::class)->latest('happened_at');
    }

    public function costs()
    {
        return $this->hasMany(ShipmentCost::class);
    }

    /**
     * Audit Trail / Edit History
     * Added for Batch 19 (Tracking manual edits like Exchange Rate change)
     */
    public function histories()
    {
        return $this->hasMany(ShipmentHistory::class)->latest();
    }

    // =============================================
    // ACCESSORS / HELPERS
    // =============================================

    /**
     * Calculate Total Landed Cost (BDT)
     * Includes: Product Cost + Shipping (Intl/Local) + Misc + Bogura Extra Cost
     */
    public function getTotalLandedCostAttribute()
    {
        // 1. Base Product Cost (RMB -> BDT)
        $productCostBDT = $this->total_china_cost_rmb * $this->exchange_rate;

        // 2. Shipping Costs
        $totalShipping = $this->shipping_cost_intl + $this->shipping_cost_local;

        // 3. Other Costs (Misc + Bogura Labor/Packaging)
        $otherCosts = $this->misc_cost + $this->total_extra_cost;
        
        return $productCostBDT + $totalShipping + $otherCosts;
    }
}