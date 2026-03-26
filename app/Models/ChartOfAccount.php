<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChartOfAccount extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'code',
        'type',
        'is_active',
        'description',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'balance',
        'debit_total',
        'credit_total',
        'type_label',
    ];

    /**
     * Relationship: One Account has many Journal Entries (Ledger Lines)
     */
    public function journalItems()
    {
        return $this->hasMany(JournalItem::class, 'account_id');
    }

    /**
     * Relationship: One Account (Expense Type) can have many Expense Requests
     */
    public function expenses()
    {
        return $this->hasMany(Expense::class, 'account_id');
    }

    /**
     * Scope: Only active accounts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Filter by account type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        $type = $this->type ?? 'unknown';
        return match($type) {
            'asset' => 'Asset',
            'liability' => 'Liability',
            'equity' => 'Equity',
            'income' => 'Revenue',
            'expense' => 'Expense',
            default => 'Unknown',
        };
    }

    /**
     * Get total debit amount for this account
     */
    public function getDebitTotalAttribute(): float
    {
        return (float) $this->journalItems()->sum('debit');
    }

    /**
     * Get total credit amount for this account
     */
    public function getCreditTotalAttribute(): float
    {
        return (float) $this->journalItems()->sum('credit');
    }

    /**
     * Get calculated balance for this account
     * Assets and Expenses: Debit - Credit
     * Liabilities, Equity, and Income: Credit - Debit
     */
    public function getBalanceAttribute(): float
    {
        $debitTotal = $this->debit_total;
        $creditTotal = $this->credit_total;

        // Calculate balance based on account type
        if (in_array($this->type, ['asset', 'expense'])) {
            return $debitTotal - $creditTotal;
        }

        return $creditTotal - $debitTotal;
    }
}
