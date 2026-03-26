<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $table = 'purchase_orders';

    protected $fillable = [
        'po_number',
        'supplier_id',
        'exchange_rate',
        'order_date',
        'expected_date',
        'total_amount',
        'courier_name',
        'tracking_number',
        'lot_number',
        'shipping_method',
        'shipping_cost',
        'total_shipping_cost',
        'total_weight',
        'extra_cost_global',
        'bd_courier_tracking',
        'status',
        'created_by',
        'refund_amount',
        'credit_note_number',
        'refund_auto_credited',
        'refunded_at',
        'receiving_notes',
        // Payment fields
        'payment_account_id',
        'payment_amount',
        'supplier_credit_used',
        'bank_payment_amount',
        'journal_entry_id',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_shipping_cost' => 'decimal:2',
        'total_weight' => 'decimal:2',
        'extra_cost_global' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'refund_auto_credited' => 'boolean',
        'order_date' => 'date:Y-m-d',
        // Payment casts
        'payment_amount' => 'decimal:2',
        'supplier_credit_used' => 'decimal:2',
        'bank_payment_amount' => 'decimal:2',
        'expected_date' => 'date:Y-m-d',
        'refunded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'po_number', 'po_number');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statusHistory()
    {
        return $this->hasMany(PurchaseOrderStatusHistory::class, 'purchase_order_id')->orderBy('created_at', 'desc');
    }

    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(Bank::class, 'payment_account_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    // Computed properties
    public function getTotalQuantityAttribute(): int
    {
        return $this->items->sum('quantity');
    }

    public function getTotalLostQuantityAttribute(): int
    {
        return $this->items->sum('received_quantity');
    }

    public function getEffectiveQuantityAttribute(): int
    {
        return $this->total_quantity - $this->total_received_quantity;
    }

    public function getTotalChinaCostAttribute(): float
    {
        return $this->items->sum(function ($item) {
            return $item->china_price * $item->quantity;
        });
    }

    public function getTotalChinaCostBdtAttribute(): float
    {
        return $this->total_china_cost * ($this->exchange_rate ?? 0);
    }

    public function getTotalLostValueAttribute(): float
    {
        return $this->items->sum(function ($item) {
            return ($item->received_quantity * $item->china_price * ($this->exchange_rate ?? 0)) +
                   ($item->received_quantity * $item->shipping_cost) +
                   ($item->received_quantity * $item->lost_item_price);
        });
    }

    public function getTotalLandedCostBdtAttribute(): float
    {
        return $this->total_china_cost_bdt +
               $this->total_shipping_cost +
               ($this->extra_cost_global ?? 0) -
               $this->total_lost_value;
    }

    public function getAverageLandedCostPerUnitAttribute(): float
    {
        return $this->effective_quantity > 0
            ? $this->total_landed_cost_bdt / $this->effective_quantity
            : 0;
    }

    // Helper methods for status workflow
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isPaymentConfirmed(): bool
    {
        return $this->status === 'payment_confirmed';
    }

    public function isSupplierDispatched(): bool
    {
        return $this->status === 'supplier_dispatched';
    }

    public function isWarehouseReceived(): bool
    {
        return $this->status === 'warehouse_received';
    }

    public function isShippedBd(): bool
    {
        return $this->status === 'shipped_bd';
    }

    public function isArrivedBd(): bool
    {
        return $this->status === 'arrived_bd';
    }

    public function isInTransitBogura(): bool
    {
        return $this->status === 'in_transit_bogura';
    }

    public function isReceivedHub(): bool
    {
        return $this->status === 'received_hub';
    }

    public function isPartiallyCompleted(): bool
    {
        return $this->status === 'partially_completed';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isLost(): bool
    {
        return $this->status === 'lost';
    }

    // Status flow validation
    public function canTransitionTo(string $newStatus): bool
    {
        $currentStatus = $this->status;

        $allowedTransitions = [
            'draft' => ['payment_confirmed', 'lost'],
            'payment_confirmed' => ['supplier_dispatched', 'lost'],
            'supplier_dispatched' => ['warehouse_received', 'lost'],
            'warehouse_received' => ['shipped_bd', 'lost'],
            'shipped_bd' => ['arrived_bd', 'lost'],
            'arrived_bd' => ['in_transit_bogura', 'lost'],
            'in_transit_bogura' => ['received_hub', 'partially_completed', 'lost'],
            'received_hub' => ['completed', 'lost'],
            'partially_completed' => ['completed'], // Can be marked complete if items found later
            'completed' => [], // Final status
            'lost' => [], // Final status
        ];

        return in_array($newStatus, $allowedTransitions[$currentStatus] ?? []);
    }

    // Generate order number
    // Format: PO-{Year}{Month}-{ID} (e.g., PO-202511-15)
    public function generateOrderNumber(): string
    {
        $yearMonth = now()->format('Ym');
        return "PO-{$yearMonth}-{$this->id}";
    }

    /**
     * Calculate total lost percentage across all items
     */
    public function getTotalLostPercentageAttribute(): float
    {
        $totalOrdered = $this->items->sum('quantity');
        $totalReceived = $this->items->sum('received_quantity');

        if ($totalOrdered === 0) {
            return 0;
        }

        return (($totalOrdered - $totalReceived) / $totalOrdered) * 100;
    }

    /**
     * Check if refund should be auto-credited (lost ≤ 10%)
     */
    public function shouldAutoCreditRefund(): bool
    {
        return $this->total_lost_percentage <= 10;
    }

    /**
     * Calculate refund amount based on lost items
     */
    public function calculateRefundAmount(): float
    {
        $refundAmount = 0;

        foreach ($this->items as $item) {
            $lostQty = $item->quantity - ($item->received_quantity ?? 0);
            if ($lostQty > 0) {
                // Refund = lost_qty × china_price × exchange_rate
                $refundAmount += $lostQty * $item->china_price * $this->exchange_rate;
            }
        }

        return $refundAmount;
    }

    /**
     * Generate credit note number
     */
    public function generateCreditNoteNumber(): string
    {
        return "CN-{$this->po_number}-" . now()->format('Ymd');
    }
}
