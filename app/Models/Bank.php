<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bank extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'account_number',
        'account_name',
        'type',
        'branch',
        'current_balance',
        'phone',
        'status',
        'notes',
        'currency_id',
        'chart_of_account_id',
        'created_by',
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'current_balance' => 'decimal:2',
        'status' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user who created the bank account.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated the bank account.
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the currency for this bank account.
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get the chart of account for this bank.
     */
    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    /**
     * Get all transactions for this bank account.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(BankTransaction::class)->orderBy('transaction_date', 'desc');
    }

    /**
     * Get only deposit transactions.
     */
    public function deposits(): HasMany
    {
        return $this->hasMany(BankTransaction::class)->where('type', 'deposit');
    }

    /**
     * Get only withdrawal transactions.
     */
    public function withdrawals(): HasMany
    {
        return $this->hasMany(BankTransaction::class)->where('type', 'withdrawal');
    }

    /**
     * Get all transactions including related models (payroll, expenses, etc.)
     */
    public function allTransactions(): HasMany
    {
        return $this->transactions()->with(['transactionable', 'journalEntry']);
    }

    /**
     * Scope to filter by active status.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to filter by type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get formatted balance.
     */
    public function getFormattedBalanceAttribute(): string
    {
        return number_format($this->current_balance, 2);
    }

    /**
     * Get type label.
     */
    public function getTypeLabelAttribute(): string
    {
        $type = $this->type ?? 'unknown';
        return match($type) {
            'cash' => 'Cash',
            'bank' => 'Bank Account',
            'bkash' => 'bKash',
            'nagad' => 'Nagad',
            'rocket' => 'Rocket',
            'other' => 'Other',
            default => 'Unknown',
        };
    }
}
