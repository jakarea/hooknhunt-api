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

    /**
     * Calculate and record commission for an order.
     * Called when an order is placed/confirmed.
     *
     * @param \App\Modules\Website\Models\SalesOrder $order
     * @param string|null $referralCode The referral code used (optional, will be read from order if not provided)
     * @return bool Success status
     */
    public function calculateOrderCommission($order, ?string $referralCode = null): bool
    {
        try {
            // Get referral code from order if not provided
            if ($referralCode === null) {
                $referralCode = $order->affiliate_referral_code ?? null;
            }

            // Get referral ID from order if not provided
            $referralId = $order->affiliate_referral_id ?? null;

            // Validate that this referral belongs to this affiliate
            if ($referralId !== null) {
                $referral = AffiliateReferral::where('id', $referralId)
                    ->where('affiliate_id', $this->id)
                    ->first();

                if (!$referral) {
                    \Log::warning('Referral does not belong to this affiliate', [
                        'affiliate_id' => $this->id,
                        'referral_id' => $referralId,
                        'order_id' => $order->id,
                    ]);
                    return false;
                }

                // Check if referral was already converted
                if ($referral->status === 'converted') {
                    \Log::info('Referral already converted, skipping', [
                        'referral_id' => $referralId,
                        'order_id' => $order->id,
                    ]);
                    return false;
                }
            }

            // Calculate commission amount
            $totalAmount = (float) ($order->total_amount ?? $order->paid_amount ?? 0);
            $commissionRate = $this->commission_rate; // Use affiliate's default rate

            // You could implement product/category specific rates here
            // For now, using the affiliate's default rate

            $commissionAmount = ($totalAmount * $commissionRate) / 100;

            if ($commissionAmount <= 0) {
                \Log::info('Commission amount is zero, skipping', [
                    'order_id' => $order->id,
                    'total_amount' => $totalAmount,
                    'commission_rate' => $commissionRate,
                ]);
                return false;
            }

            // Update order with affiliate information
            $order->update([
                'affiliate_id' => $this->id,
                'affiliate_referral_code' => $referralCode,
                'affiliate_referral_id' => $referralId,
                'affiliate_commission_amount' => $commissionAmount,
                'affiliate_commission_rate' => $commissionRate,
                'affiliate_commission_calculated_at' => now(),
            ]);

            // Convert referral to converted
            if ($referralId !== null) {
                $referral->update([
                    'converted_at' => now(),
                    'sales_order_id' => $order->id,
                    'order_amount' => $totalAmount,
                    'commission_amount' => $commissionAmount,
                    'status' => 'converted',
                ]);
            }

            // Create affiliate earning record
            AffiliateEarning::create([
                'affiliate_id' => $this->id,
                'sales_order_id' => $order->id,
                'order_invoice' => $order->order_number ?? $order->id,
                'order_amount' => $totalAmount,
                'commission_amount' => $commissionAmount,
                'commission_rate' => $commissionRate,
                'customer_id' => $order->customer_id,
                'customer_name' => $order->customer_name ?? 'Guest',
                'customer_email' => $order->customer_email ?? null,
                'status' => 'pending', // Pending until order is completed/paid
            ]);

            // Update affiliate stats
            $this->increment('total_earned', $commissionAmount);
            $this->update(['last_conversion_at' => now()]);

            \Log::info('Affiliate commission calculated and recorded', [
                'affiliate_id' => $this->id,
                'order_id' => $order->id,
                'commission_amount' => $commissionAmount,
                'commission_rate' => $commissionRate,
            ]);

            return true;

        } catch (\Exception $e) {
            \Log::error('Failed to calculate affiliate commission', [
                'affiliate_id' => $this->id,
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Scope for approved affiliates.
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope for pending affiliates.
     */
    public function scopePending($query)
    {
        return $query->where('is_approved', false);
    }
}