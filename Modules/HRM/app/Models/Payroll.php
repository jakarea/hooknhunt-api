<?php

namespace App\Modules\HRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
     * Relationship: Payroll belongs to a user (employee) - Core module dependency (acceptable)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class);
    }

    // BankTransaction relationship removed (Finance module dependency breaks independence)
    // Use API calls to Finance module or direct payment_id references
    // public function bankTransactions(): MorphMany
    // {
    //     return $this->morphMany(BankTransaction::class, 'transactionable');
    // }

    // JournalEntry relationship removed (Finance module dependency breaks independence)
    // Use API calls to Finance module or direct journal_entry_id references
    // public function journalEntries(): MorphMany
    // {
    //     return $this->morphMany(JournalEntry::class, 'reference');
    // }
}
