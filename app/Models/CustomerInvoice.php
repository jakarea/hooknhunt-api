<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'invoice_number',
        'customer_id',
        'chart_account_id',
        'invoice_date',
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
        'invoice_date' => 'date:Y-m-d', // Fixed timezone offset
        'due_date' => 'date:Y-m-d', // Fixed timezone offset
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
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
        return $this->hasMany(CustomerInvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CustomerPaymentInvoice::class, 'customer_invoice_id');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
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

    public function scopeByCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('invoice_date', [$startDate, $endDate]);
    }

    public function getStatusLabelAttribute(): string
    {
        return [
            'draft' => 'Draft',
            'sent' => 'Sent',
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

    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV-';
        $latest = self::withTrashed()->orderBy('id', 'desc')->first();
        $number = $latest ? $latest->id + 1 : 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}
