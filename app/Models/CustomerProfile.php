<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerProfile extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        // Personal Information
        'dob',
        'gender',
        'whatsapp_number',
        // Marketing Info
        'source',
        'medium',
        'referral_code',
        // Preferences
        'preferred_language',
        'preferred_currency',
        'marketing_consent',
        'do_not_contact',
        // Customer Type
        'type',
        'trade_license_no',
        'tax_id',
        // Loyalty Tier
        'loyalty_tier',
        'loyalty_points',
        'lifetime_value',
        // Stats
        'total_orders',
        'total_spent',
        'avg_order_value',
        'last_order_date',
        // Metadata
        'notes',
        'tags',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'marketing_consent' => 'boolean',
        'do_not_contact' => 'boolean',
        'loyalty_points' => 'integer',
        'lifetime_value' => 'decimal:2',
        'total_orders' => 'integer',
        'total_spent' => 'decimal:2',
        'avg_order_value' => 'decimal:2',
        'last_order_date' => 'datetime',
        'tags' => 'array',
    ];

    /**
     * Get the user that owns the customer profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the addresses for the customer profile.
     */
    public function addresses()
    {
        return $this->hasManyThrough(Address::class, User::class);
    }

    /**
     * Check if customer is VIP (Gold or Platinum tier)
     */
    public function isVip(): bool
    {
        return in_array($this->loyalty_tier, ['gold', 'platinum']);
    }

    /**
     * Add loyalty points
     */
    public function addLoyaltyPoints(int $points): void
    {
        $this->increment('loyalty_points', $points);
        $this->updateTier();
    }

    /**
     * Deduct loyalty points
     */
    public function deductLoyaltyPoints(int $points): void
    {
        $this->decrement('loyalty_points', $points);
        $this->updateTier();
    }

    /**
     * Update loyalty tier based on points
     */
    protected function updateTier(): void
    {
        $points = $this->loyalty_points;

        $this->update([
            'loyalty_tier' => match (true) {
                $points >= 10000 => 'platinum',
                $points >= 5000 => 'gold',
                $points >= 2000 => 'silver',
                default => 'bronze',
            }
        ]);
    }

    /**
     * Scope to filter by customer type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by loyalty tier
     */
    public function scopeOfTier($query, string $tier)
    {
        return $query->where('loyalty_tier', $tier);
    }

    /**
     * Scope to get VIP customers
     */
    public function scopeVip($query)
    {
        return $query->whereIn('loyalty_tier', ['gold', 'platinum']);
    }
}
