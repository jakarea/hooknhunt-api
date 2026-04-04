<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Discount extends Model
{
    protected $fillable = [
        'code',
        'description',
        'type',
        'amount',
        'max_discount_amount',
        'min_order_amount',
        'starts_at',
        'expires_at',
        'max_uses',
        'usage_limit_per_customer',
        'used_count',
        'is_active',
        'is_auto_apply',
        'first_purchase_only',
        'product_ids',
        'category_ids',
        'customer_ids',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
        'is_auto_apply' => 'boolean',
        'first_purchase_only' => 'boolean',
        'product_ids' => 'array',
        'category_ids' => 'array',
        'customer_ids' => 'array',
    ];

    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    /**
     * Check remaining global uses. Null = unlimited.
     */
    public function getRemainingUsesAttribute(): ?int
    {
        if ($this->max_uses === null) return null;
        return max(0, $this->max_uses - $this->used_count);
    }

    /**
     * Full coupon validation against a cart context.
     * Returns ['valid' => bool, 'error' => string|null, 'discount_amount' => float]
     */
    public function validateForOrder(float $cartTotal, ?int $userId = null, array $cartProductIds = [], array $cartCategoryIds = []): array
    {
        // 1. Active check
        if (!$this->is_active) {
            return ['valid' => false, 'error' => 'This coupon is inactive.', 'discount_amount' => 0];
        }

        // 2. Start date
        if ($this->starts_at && now()->lt($this->starts_at)) {
            return ['valid' => false, 'error' => 'This coupon is not yet active.', 'discount_amount' => 0];
        }

        // 3. Expiry
        if ($this->expires_at && now()->gt($this->expires_at)) {
            return ['valid' => false, 'error' => 'This coupon has expired.', 'discount_amount' => 0];
        }

        // 4. Global usage limit
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return ['valid' => false, 'error' => 'Coupon usage limit reached.', 'discount_amount' => 0];
        }

        // 5. Min order amount
        if ($this->min_order_amount && $cartTotal < $this->min_order_amount) {
            return ['valid' => false, 'error' => "Minimum order amount of ৳{$this->min_order_amount} required.", 'discount_amount' => 0];
        }

        // 6. Per-customer usage limit
        if ($userId && $this->usage_limit_per_customer) {
            $customerUses = $this->usages()->where('user_id', $userId)->count();
            if ($customerUses >= $this->usage_limit_per_customer) {
                return ['valid' => false, 'error' => 'You have already used this coupon.', 'discount_amount' => 0];
            }
        }

        // 7. Customer restriction
        if ($userId && $this->customer_ids && count($this->customer_ids) > 0) {
            if (!in_array($userId, $this->customer_ids)) {
                return ['valid' => false, 'error' => 'This coupon is not available for your account.', 'discount_amount' => 0];
            }
        }

        // 8. First purchase only
        if ($userId && $this->first_purchase_only) {
            $hasOrders = SalesOrder::where('user_id', $userId)->exists();
            if ($hasOrders) {
                return ['valid' => false, 'error' => 'This coupon is for first-time purchases only.', 'discount_amount' => 0];
            }
        }

        // 9. Product restriction
        if ($this->product_ids && count($this->product_ids) > 0 && count($cartProductIds) > 0) {
            $applicableProducts = array_intersect($cartProductIds, $this->product_ids);
            if (count($applicableProducts) === 0) {
                return ['valid' => false, 'error' => 'This coupon is not applicable to any product in your cart.', 'discount_amount' => 0];
            }
        }

        // 10. Category restriction
        if ($this->category_ids && count($this->category_ids) > 0 && count($cartCategoryIds) > 0) {
            $applicableCategories = array_intersect($cartCategoryIds, $this->category_ids);
            if (count($applicableCategories) === 0) {
                return ['valid' => false, 'error' => 'This coupon is not applicable to any category in your cart.', 'discount_amount' => 0];
            }
        }

        // 11. Calculate discount
        $discountAmount = 0;
        if ($this->type === 'percentage') {
            $discountAmount = ($cartTotal * (float) $this->amount) / 100;
            // Apply max discount cap
            if ($this->max_discount_amount && $discountAmount > (float) $this->max_discount_amount) {
                $discountAmount = (float) $this->max_discount_amount;
            }
        } else {
            $discountAmount = (float) $this->amount;
        }

        // Discount can't exceed cart total
        $discountAmount = min($discountAmount, $cartTotal);

        return [
            'valid' => true,
            'error' => null,
            'discount_amount' => round($discountAmount, 2),
            'final_total' => round(max(0, $cartTotal - $discountAmount), 2),
        ];
    }
}
