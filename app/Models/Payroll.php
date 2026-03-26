<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Payroll extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'house_rent' => 'decimal:2',
        'medical_allowance' => 'decimal:2',
        'conveyance_allowance' => 'decimal:2',
        'overtime_hourly_rate' => 'decimal:2',
        'total_overtime_hours' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'bonus' => 'decimal:2',
        'deductions' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'payment_date' => 'date:Y-m-d', // Fixed timezone offset
    ];

    // Append calculated gross salary to JSON
    protected $appends = ['gross_salary'];

    /**
     * Calculate gross salary (sum of all salary components before overtime)
     */
    public function getGrossSalaryAttribute(): float
    {
        return (float) $this->basic_salary
            + (float) $this->house_rent
            + (float) $this->medical_allowance
            + (float) $this->conveyance_allowance;
    }

    /**
     * Calculate total salary including overtime
     */
    public function getTotalSalaryAttribute(): float
    {
        return $this->gross_salary + (float) $this->overtime_amount;
    }

    /**
     * Relationship: Payroll belongs to a user (employee)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship: Get all bank transactions for this payroll
     */
    public function bankTransactions(): MorphMany
    {
        return $this->morphMany(BankTransaction::class, 'transactionable');
    }

    /**
     * Relationship: Get journal entry for this payroll
     */
    public function journalEntries(): MorphMany
    {
        return $this->morphMany(JournalEntry::class, 'reference');
    }
}
