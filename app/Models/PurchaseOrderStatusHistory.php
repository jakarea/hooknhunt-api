<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderStatusHistory extends Model
{
    protected $table = 'purchase_order_status_history';

    protected $fillable = [
        'purchase_order_id',
        'old_status',
        'new_status',
        'comments',
        'changed_by',
        'timeline_data',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'timeline_data' => 'array',
    ];

    // Relationships
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    // Scope to get history for a specific PO
    public function scopeForPurchaseOrder($query, $poId)
    {
        return $query->where('purchase_order_id', $poId)->orderBy('created_at', 'desc');
    }
}
