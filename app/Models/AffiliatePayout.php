<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliatePayout extends Model
{
    protected $fillable = [
        'affiliate_id',
        'amount',
        'payment_method',
        'payment_details',
        'status',
        'admin_notes',
        'rejection_reason',
        'approved_at',
        'completed_at',
        'approved_by',
        'rejected_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
        'status' => 'string',
        'payment_method' => 'string',
    ];

    /**
     * Get the affiliate for this payout.
     */
    public function affiliate()
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Get the admin who approved this payout.
     */
    public function approvedByAdmin()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the admin who rejected this payout.
     */
    public function rejectedByAdmin()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Scope for pending payouts.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for approved payouts.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope for completed payouts.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for a specific affiliate.
     */
    public function scopeForAffiliate($query, $affiliateId)
    {
        return $query->where('affiliate_id', $affiliateId);
    }

    /**
     * Mark payout as approved.
     */
    public function markAsApproved($adminId): bool
    {
        return $this->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $adminId,
        ]);
    }

    /**
     * Mark payout as completed.
     */
    public function markAsCompleted(): bool
    {
        return $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark payout as rejected.
     */
    public function markAsRejected($adminId, $reason): bool
    {
        return $this->update([
            'status' => 'rejected',
            'rejected_by' => $adminId,
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Mark payout as processing.
     */
    public function markAsProcessing(): bool
    {
        return $this->update(['status' => 'processing']);
    }
}
