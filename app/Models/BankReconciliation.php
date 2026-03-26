<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankReconciliation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'statement_date' => 'date:Y-m-d', // Fixed timezone offset
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'book_balance' => 'decimal:2',
        'deposits_in_transit' => 'decimal:2',
        'outstanding_checks' => 'decimal:2',
        'bank_charges' => 'decimal:2',
        'interest_earned' => 'decimal:2',
        'other_adjustments' => 'decimal:2',
        'adjusted_balance' => 'decimal:2',
        'difference' => 'decimal:2',
        'is_reconciled' => 'boolean',
        'reconciled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: Reconciliation belongs to a Bank
     */
    public function bank(): BelongsTo
    {
        return $this->belongsTo(Bank::class);
    }

    /**
     * Relationship: User who created this reconciliation
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this reconciliation
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: User who reconciled this statement
     */
    public function reconciler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    /**
     * Scope: Only reconciled statements
     */
    public function scopeReconciled($query)
    {
        return $query->where('is_reconciled', true);
    }

    /**
     * Scope: Only pending reconciliations
     */
    public function scopePending($query)
    {
        return $query->where('is_reconciled', false);
    }

    /**
     * Scope: Filter by bank
     */
    public function scopeForBank($query, $bankId)
    {
        return $query->where('bank_id', $bankId);
    }

    /**
     * Calculate adjusted balance automatically
     * Formula: Book Balance + Deposits in Transit - Outstanding Checks - Bank Charges + Interest + Other
     */
    public function calculateAdjustedBalance(): float
    {
        $adjustedBalance = $this->book_balance
            + $this->deposits_in_transit
            - $this->outstanding_checks
            - $this->bank_charges
            + $this->interest_earned
            + $this->other_adjustments;

        return $adjustedBalance;
    }

    /**
     * Calculate difference between adjusted and closing balance
     */
    public function calculateDifference(): float
    {
        $adjustedBalance = $this->calculateAdjustedBalance();
        $difference = $adjustedBalance - $this->closing_balance;

        return $difference;
    }

    /**
     * Check if reconciliation balances (difference = 0)
     */
    public function isBalanced(): bool
    {
        $difference = $this->calculateDifference();
        return abs($difference) < 0.01; // Allow for rounding differences less than 1 paisa
    }

    /**
     * Mark reconciliation as complete
     */
    public function markAsReconciled($userId = null): void
    {
        $this->is_reconciled = true;
        $this->reconciled_at = now();
        $this->reconciled_by = $userId ?? auth()->id();
        $this->adjusted_balance = $this->calculateAdjustedBalance();
        $this->difference = $this->calculateDifference();
        $this->save();
    }

    /**
     * Reset reconciliation status
     */
    public function resetReconciliation(): void
    {
        $this->is_reconciled = false;
        $this->reconciled_at = null;
        $this->reconciled_by = null;
        $this->adjusted_balance = 0;
        $this->difference = 0;
        $this->save();
    }

    /**
     * Get reconciliation summary
     */
    public function getSummaryAttribute(): array
    {
        return [
            'book_balance' => (float) $this->book_balance,
            'deposits_in_transit' => (float) $this->deposits_in_transit,
            'outstanding_checks' => (float) $this->outstanding_checks,
            'bank_charges' => (float) $this->bank_charges,
            'interest_earned' => (float) $this->interest_earned,
            'other_adjustments' => (float) $this->other_adjustments,
            'adjusted_balance' => (float) $this->calculateAdjustedBalance(),
            'closing_balance' => (float) $this->closing_balance,
            'difference' => (float) $this->calculateDifference(),
            'is_balanced' => $this->isBalanced(),
        ];
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        if ($this->is_reconciled) {
            return 'green';
        }

        $difference = abs($this->calculateDifference());
        if ($difference < 100) {
            return 'yellow'; // Small difference
        } elseif ($difference < 1000) {
            return 'orange'; // Medium difference
        } else {
            return 'red'; // Large difference
        }
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        if ($this->is_reconciled) {
            return 'Reconciled';
        }

        $difference = abs($this->calculateDifference());
        if ($difference < 0.01) {
            return 'Balanced';
        } elseif ($difference < 100) {
            return 'Minor Difference';
        } elseif ($difference < 1000) {
            return 'Significant Difference';
        } else {
            return 'Major Difference';
        }
    }
}
