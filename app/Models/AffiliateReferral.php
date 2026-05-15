<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateReferral extends Model
{
    protected $fillable = [
        'affiliate_id',
        'referral_code',
        'ip_address',
        'user_agent',
        'landing_page',
        'clicked_at',
        'converted_at',
        'sales_order_id',
        'order_amount',
        'commission_amount',
        'status',
    ];

    protected $casts = [
        'clicked_at' => 'datetime',
        'converted_at' => 'datetime',
        'order_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
    ];

    /**
     * Get the affiliate that made this referral.
     */
    public function affiliate()
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Get the order from this referral (if converted).
     */
    public function order()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    /**
     * Scope for clicked referrals (visitors).
     */
    public function scopeClicked($query)
    {
        return $query->where('status', 'clicked');
    }

    /**
     * Scope for converted referrals (purchases).
     */
    public function scopeConverted($query)
    {
        return $query->where('status', 'converted');
    }

    /**
     * Scope for a specific affiliate.
     */
    public function scopeForAffiliate($query, $affiliateId)
    {
        return $query->where('affiliate_id', $affiliateId);
    }

    /**
     * Scope for a specific referral code.
     */
    public function scopeForCode($query, $code)
    {
        return $query->where('referral_code', $code);
    }

    /**
     * Mark referral as converted.
     */
    public function markAsConverted($orderId, $orderAmount, $commissionAmount): bool
    {
        $this->update([
            'converted_at' => now(),
            'sales_order_id' => $orderId,
            'order_amount' => $orderAmount,
            'commission_amount' => $commissionAmount,
            'status' => 'converted',
        ]);

        // Update affiliate stats
        $this->affiliate->increment('total_conversions');
        $this->affiliate->update(['last_conversion_at' => now()]);

        return true;
    }
}
