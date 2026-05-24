<?php

namespace App\Modules\Affiliate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Affiliate extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'total_earned' => 'decimal:2',
        'withdrawn_amount' => 'decimal:2',
        'is_approved' => 'boolean',
    ];

    /**
     * Generate a unique referral code.
     * Format: 2 letters (A-Z) + 4 digits (0-9)
     * Example: AB1234
     *
     * @return string Unique referral code
     */
    public static function generateUniqueReferralCode(): string
    {
        $maxAttempts = 100;
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            // Generate: 2 random letters (A-Z) + 4 random digits (0-9)
            $letters = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 2));
            $digits = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $code = $letters . $digits;

            // Check if code is unique
            $exists = self::where('referral_code', $code)->exists();

            if (!$exists) {
                return $code;
            }

            $attempt++;
        }

        // Fallback: append timestamp if we can't generate unique code
        return strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 2)) . substr(time(), -4);
    }

    /**
     * Get the user that owns this affiliate account (Core module dependency - acceptable)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class);
    }

    /**
     * Get all earnings for this affiliate.
     */
    public function earnings(): HasMany
    {
        return $this->hasMany(AffiliateEarning::class);
    }

    /**
     * Get all product-specific commissions for this affiliate.
     */
    public function productCommissions()
    {
        return $this->hasMany(ProductAffiliateCommission::class);
    }

    /**
     * Get all category-specific commissions for this affiliate.
     */
    public function categoryCommissions()
    {
        return $this->hasMany(CategoryAffiliateCommission::class);
    }

    /**
     * Get all referrals (clicks) for this affiliate.
     */
    public function referrals()
    {
        return $this->hasMany(AffiliateReferral::class);
    }

    /**
     * Get all payouts for this affiliate.
     */
    public function payouts()
    {
        return $this->hasMany(AffiliatePayout::class);
    }

    /**
     * Get the effective commission rate for a specific product.
     * Priority: Product-specific > Category-specific > Affiliate Default > Global Default
     *
     * Note: Product relationship removed (Catalog module dependency breaks independence)
     * This method now requires category_id to be passed or fetched via API call
     *
     * @param int $productId
     * @param int|null $categoryId Optional category ID to avoid Catalog module dependency
     * @return float Commission rate (e.g., 5.00 for 5%)
     */
    public function getCommissionRateForProduct(int $productId, ?int $categoryId = null): float
    {
        try {
            // 1. Check product-specific commission for this affiliate
            $productRate = ProductAffiliateCommission::active()
                ->where('product_id', $productId)
                ->where(function ($query) {
                    $query->where('affiliate_id', $this->id)
                          ->orWhereNull('affiliate_id');
                })
                ->orderByDesc('affiliate_id') // Prefer specific over global
                ->value('commission_rate');

            if ($productRate !== null) {
                return (float) $productRate;
            }

            // 2. Check category-specific commission for this affiliate
            // If category_id is provided, use it; otherwise skip category check
            if ($categoryId !== null) {
                $categoryRate = CategoryAffiliateCommission::active()
                    ->where('category_id', $categoryId)
                    ->where(function ($query) {
                        $query->where('affiliate_id', $this->id)
                              ->orWhereNull('affiliate_id');
                    })
                    ->orderByDesc('affiliate_id') // Prefer specific over global
                    ->value('commission_rate');

                if ($categoryRate !== null) {
                    return (float) $categoryRate;
                }
            }

            // 3. Use affiliate's default rate
            return (float) $this->commission_rate;

        } catch (\Exception $e) {
            \Log::error('Error getting commission rate for product', [
                'affiliate_id' => $this->id,
                'product_id' => $productId,
                'error' => $e->getMessage(),
            ]);

            // Return default rate on error
            return 5.00;
        }
    }

    /**
     * Get the current available balance (earned - withdrawn - pending_payouts).
     */
    public function getAvailableBalanceAttribute(): float
    {
        $earned = $this->total_earned ?? 0;
        $withdrawn = $this->withdrawn_amount ?? 0;
        $pendingPayouts = $this->payouts()->pending()->sum('amount') ?? 0;

        return max(0, $earned - $withdrawn - $pendingPayouts);
    }

    /**
     * Get total clicks count.
     */
    public function getTotalClicksAttribute(): int
    {
        return $this->referrals()->count();
    }

    /**
     * Get total conversions count.
     */
    public function getTotalConversionsAttribute(): int
    {
        return $this->referrals()->converted()->count();
    }

    /**
     * Calculate conversion rate.
     */
    public function getConversionRateAttribute(): float
    {
        $clicks = $this->getTotalClicksAttribute();

        if ($clicks === 0) {
            return 0.0;
        }

        return round(($this->getTotalConversionsAttribute() / $clicks) * 100, 2);
    }
}