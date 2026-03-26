<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VendorPayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'payment_number',
        'supplier_id',
        'chart_account_id',
        'payment_date',
        'amount',
        'payment_method',
        'reference_number',
        'notes',
        'status',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date:Y-m-d', // Fixed timezone offset
        'amount' => 'decimal:2',
    ];

    // Relationships
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function chartAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bills(): BelongsToMany
    {
        return $this->belongsToMany(VendorBill::class, 'vendor_payment_bills')
            ->using(VendorPaymentBill::class)
            ->withPivot('amount_applied')
            ->withTimestamps();
    }

    public function paymentBills(): HasMany
    {
        return $this->hasMany(VendorPaymentBill::class);
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeBySupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('payment_date', [$startDate, $endDate]);
    }

    // Computed Attributes
    public function getStatusLabelAttribute(): string
    {
        return [
            'draft' => 'Draft',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ][$this->status] ?? $this->status;
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return [
            'cash' => 'Cash',
            'bank_transfer' => 'Bank Transfer',
            'cheque' => 'Cheque',
            'card' => 'Card',
        ][$this->payment_method] ?? $this->payment_method;
    }

    // Methods
    public static function generatePaymentNumber(): string
    {
        $prefix = 'VP-';
        $latest = self::withTrashed()->orderBy('id', 'desc')->first();
        $number = $latest ? $latest->id + 1 : 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }

    public function getAppliedAmount(): float
    {
        return $this->paymentBills()->sum('amount_applied');
    }

    public function getRemainingAmount(): float
    {
        return $this->amount - $this->getAppliedAmount();
    }
}
