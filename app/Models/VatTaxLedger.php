<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class VatTaxLedger extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d', // Fixed timezone offset
        'base_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'challan_date' => 'date:Y-m-d', // Fixed timezone offset
        'is_paid' => 'boolean',
        'payment_date' => 'date:Y-m-d', // Fixed timezone offset
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Linked chart of account
     */
    public function chartAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_account_id');
    }

    /**
     * Relationship: User who created this entry
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this entry
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Only VAT entries
     */
    public function scopeVat($query)
    {
        return $query->where('tax_type', 'vat');
    }

    /**
     * Scope: Only Tax entries
     */
    public function scopeTax($query)
    {
        return $query->where('tax_type', 'tax');
    }

    /**
     * Scope: Only AIT entries
     */
    public function scopeAit($query)
    {
        return $query->where('tax_type', 'ait');
    }

    /**
     * Scope: Input tax (paid on purchases)
     */
    public function scopeInput($query)
    {
        return $query->where('direction', 'input');
    }

    /**
     * Scope: Output tax (collected on sales)
     */
    public function scopeOutput($query)
    {
        return $query->where('direction', 'output');
    }

    /**
     * Scope: Filter by fiscal year
     */
    public function scopeFiscalYear($query, $year)
    {
        return $query->where('fiscal_year', $year);
    }

    /**
     * Scope: Filter by tax period
     */
    public function scopeTaxPeriod($query, $period)
    {
        return $query->where('tax_period', $period);
    }

    /**
     * Scope: Only unpaid
     */
    public function scopeUnpaid($query)
    {
        return $query->where('is_paid', false);
    }

    /**
     * Scope: Only paid
     */
    public function scopePaid($query)
    {
        return $query->where('is_paid', true);
    }

    /**
     * Scope: Filter by transaction type
     */
    public function scopeTransactionType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Get tax type label
     */
    public function getTaxTypeLabelAttribute(): string
    {
        return match ($this->tax_type) {
            'vat' => 'VAT',
            'tax' => 'Tax',
            'ait' => 'AIT',
            default => 'Unknown',
        };
    }

    /**
     * Get direction label
     */
    public function getDirectionLabelAttribute(): string
    {
        return match ($this->direction) {
            'input' => 'Input (Paid)',
            'output' => 'Output (Collected)',
            default => 'Unknown',
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'filed' => 'Filed',
            'paid' => 'Paid',
            default => 'Unknown',
        };
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'yellow',
            'filed' => 'blue',
            'paid' => 'green',
            default => 'gray',
        };
    }

    /**
     * Mark as paid
     */
    public function markAsPaid(string $paymentReference, ?string $paymentDate = null): void
    {
        $this->is_paid = true;
        $this->payment_date = $paymentDate ?? now()->toDateString();
        $this->payment_reference = $paymentReference;
        $this->status = 'paid';
        $this->save();
    }

    /**
     * Mark as filed
     */
    public function markAsFiled(): void
    {
        $this->status = 'filed';
        $this->save();
    }

    /**
     * Calculate net VAT payable/receivable
     * Output VAT - Input VAT
     */
    public static function calculateNetVat(?string $fiscalYear = null): array
    {
        $query = self::vat();

        if ($fiscalYear) {
            $query->fiscalYear($fiscalYear);
        }

        $outputVat = (clone $query)->output()->sum('tax_amount');
        $inputVat = (clone $query)->input()->sum('tax_amount');
        $netVat = $outputVat - $inputVat;

        return [
            'output_vat' => (float) $outputVat,
            'input_vat' => (float) $inputVat,
            'net_vat' => (float) $netVat,
            'is_payable' => $netVat > 0,
            'is_refundable' => $netVat < 0,
        ];
    }

    /**
     * Calculate net Tax/AIT payable/receivable
     */
    public static function calculateNetTax(?string $fiscalYear = null): array
    {
        $query = self::tax()->ait();

        if ($fiscalYear) {
            $query->fiscalYear($fiscalYear);
        }

        $outputTax = (clone $query)->output()->sum('tax_amount');
        $inputTax = (clone $query)->input()->sum('tax_amount');
        $netTax = $outputTax - $inputTax;

        return [
            'output_tax' => (float) $outputTax,
            'input_tax' => (float) $inputTax,
            'net_tax' => (float) $netTax,
            'is_payable' => $netTax > 0,
            'is_refundable' => $netTax < 0,
        ];
    }
}
