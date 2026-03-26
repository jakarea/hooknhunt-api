<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankTransaction extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'bank_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_number',
        'description',
        'transaction_date',
        'transactionable_type',
        'transactionable_id',
        'journal_entry_id',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'date:Y-m-d', // Fixed timezone offset
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the bank account for this transaction.
     */
    public function bank(): BelongsTo
    {
        return $this->belongsTo(Bank::class);
    }

    /**
     * Get the user who created this transaction.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the journal entry for this transaction.
     */
    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /**
     * Get the related transactionable model (payment, expense, etc.).
     */
    public function transactionable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to filter by transaction type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    /**
     * Get formatted amount.
     */
    public function getFormattedAmountAttribute(): string
    {
        return number_format($this->amount, 2);
    }

    /**
     * Get transaction type label.
     */
    public function getTypeLabelAttribute(): string
    {
        $type = $this->type ?? 'unknown';
        return match($type) {
            'deposit' => 'Deposit',
            'withdrawal' => 'Withdrawal',
            'transfer_in' => 'Transfer In',
            'transfer_out' => 'Transfer Out',
            default => 'Unknown',
        };
    }

    /**
     * Get amount with sign (positive for deposits, negative for withdrawals).
     */
    public function getSignedAmountAttribute(): float
    {
        $type = $this->type ?? 'unknown';
        return match($type) {
            'deposit', 'transfer_in' => $this->amount,
            'withdrawal', 'transfer_out' => -$this->amount,
            default => 0,
        };
    }
}
