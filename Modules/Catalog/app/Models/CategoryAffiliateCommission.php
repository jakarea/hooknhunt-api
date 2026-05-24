<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Model;

class CategoryAffiliateCommission extends Model
{
    protected $fillable = [
        'category_id',
        'affiliate_id',
        'commission_rate',
        'is_active',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the category for this commission.
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the affiliate for this commission (if specific).
     * REMOVED: Affiliate relationship breaks module independence
     * Use affiliate_id directly or API calls to Affiliate module
     */
    // public function affiliate()
    // {
    //     return $this->belongsTo(Affiliate::class);
    // }

    /**
     * Scope for active commissions only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for global commissions (apply to all affiliates).
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('affiliate_id');
    }

    /**
     * Scope for specific affiliate commissions.
     */
    public function scopeForAffiliate($query, $affiliateId)
    {
        return $query->where('affiliate_id', $affiliateId);
    }
}
