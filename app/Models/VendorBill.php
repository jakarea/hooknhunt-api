<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VendorBill extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'bill_number',
        'supplier_id',
        'chart_account_id',
        'bill_date',
        'due_date',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'balance_due',
        'status',
        'payment_status',
        'notes',
        'created_by',
        'paid_at',
    ];

    protected $casts = [
        'bill_date' => 'date:Y-m-d', // Fixed timezone offset
        'due_date' => 'date:Y-m-d', // Fixed timezone offset
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'paid_at' => 'datetime',
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

    public function items(): HasMany
    {
        return $this->hasMany(VendorBillItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(VendorPaymentBill::class, 'vendor_bill_id');
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopePartial($query)
    {
        return $query->where('payment_status', 'partial');
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopeUnpaid($query)
    {
        return $query->where('payment_status', 'unpaid');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->where('due_date', '<', now());
    }

    public function scopeBySupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('bill_date', [$startDate, $endDate]);
    }

    public function scopeDueBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('due_date', [$startDate, $endDate]);
    }

    // Computed Attributes
    public function getStatusLabelAttribute(): string
    {
        return [
            'draft' => 'Draft',
            'open' => 'Open',
            'partial' => 'Partially Paid',
            'paid' => 'Paid',
            'overdue' => 'Overdue',
        ][$this->status] ?? $this->status;
    }

    public function getPaymentStatusLabelAttribute(): string
    {
        return [
            'unpaid' => 'Unpaid',
            'partial' => 'Partially Paid',
            'paid' => 'Paid',
        ][$this->payment_status] ?? $this->payment_status;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date->isPast() && $this->balance_due > 0;
    }

    public function getDaysOverdueAttribute(): int
    {
        if ($this->due_date->isFuture()) {
            return 0;
        }
        return now()->diffInDays($this->due_date);
    }

    // Methods
    public function markAsPaid(): void
    {
        $this->update([
            'payment_status' => 'paid',
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    public function updatePaidAmount(float $amount): void
    {
        $this->paid_amount += $amount;
        $this->balance_due = max(0, $this->total_amount - $this->paid_amount);

        if ($this->balance_due <= 0) {
            $this->payment_status = 'paid';
            $this->status = 'paid';
            $this->paid_at = now();
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'partial';
            $this->status = 'partial';
        }

        $this->save();
    }

    public static function generateBillNumber(): string
    {
        $prefix = 'VB-';
        $latest = self::withTrashed()->orderBy('id', 'desc')->first();
        $number = $latest ? $latest->id + 1 : 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}
