<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quotation extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'quotation_number',
        'opportunity_id',
        'customer_id',
        'subtotal',
        'discount_type',
        'discount_amount',
        'tax_amount',
        'total',
        'valid_until',
        'converted_to_order_at',
        'status',
        'customer_notes',
        'terms_conditions',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'valid_until' => 'date:Y-m-d', // Fixed timezone offset
        'converted_to_order_at' => 'datetime',
    ];

    /**
     * Get the opportunity associated with the quotation.
     */
    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * Get the customer associated with the quotation.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /**
     * Get the creator of the quotation.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all items for the quotation.
     */
    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    /**
     * Check if quotation is expired
     */
    public function isExpired(): bool
    {
        return $this->valid_until->isPast() && $this->status === 'sent';
    }

    /**
     * Check if quotation can be converted to order
     */
    public function canBeConverted(): bool
    {
        return in_array($this->status, ['sent', 'accepted']) && !$this->isExpired();
    }

    /**
     * Mark as accepted
     */
    public function markAsAccepted(): void
    {
        $this->update(['status' => 'accepted']);
    }

    /**
     * Mark as rejected
     */
    public function markAsRejected(): void
    {
        $this->update(['status' => 'rejected']);
    }

    /**
     * Mark as converted to order
     */
    public function markAsConverted(): void
    {
        $this->update([
            'status' => 'converted',
            'converted_to_order_at' => now(),
        ]);
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get expired quotations
     */
    public function scopeExpired($query)
    {
        return $query->where('valid_until', '<', now())
            ->whereIn('status', ['sent', 'draft']);
    }

    /**
     * Scope to get valid quotations
     */
    public function scopeValid($query)
    {
        return $query->where('valid_until', '>=', now());
    }
}
