<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'exchange_rate' => 'decimal:6',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'decimal_places' => 'integer',
    ];

    /**
     * Relationship: User who created this currency
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this currency
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Currency has many bank accounts
     */
    public function banks(): HasMany
    {
        return $this->hasMany(Bank::class);
    }

    /**
     * Relationship: Currency has many expenses
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Scope: Only active currencies
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Get default currency
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Format amount with currency symbol
     */
    public function formatAmount(float $amount): string
    {
        $formatted = number_format($amount, $this->decimal_places);

        if ($this->symbol_position === 'left') {
            return $this->symbol . $formatted;
        }

        return $formatted . $this->symbol;
    }

    /**
     * Convert amount from this currency to default currency (BDT)
     */
    public function convertToDefault(float $amount): float
    {
        if (!$this->exchange_rate) {
            return $amount;
        }

        return $amount * $this->exchange_rate;
    }

    /**
     * Convert amount from default currency (BDT) to this currency
     */
    public function convertFromDefault(float $amount): float
    {
        if (!$this->exchange_rate || $this->exchange_rate == 0) {
            return $amount;
        }

        return $amount / $this->exchange_rate;
    }

    /**
     * Get default currency (BDT)
     */
    public static function getDefault()
    {
        return static::where('is_default', true)->first();
    }

    /**
     * Get default currency code (BDT)
     */
    public static function getDefaultCode(): string
    {
        $default = static::getDefault();
        return $default ? $default->code : 'BDT';
    }
}
