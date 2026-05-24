<?php

namespace App\Modules\Website\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Website\Models\CouponUsage;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CouponController extends Controller
{
    use ApiResponse;

    /**
     * Validate a coupon code.
     */
    public function checkCoupon(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'code' => 'required|string|exists:discounts,code',
                'subtotal' => 'required|numeric|min:0',
                'user_id' => 'nullable|integer|exists:users,id',
            ]);

            // Get the coupon/discount
            $coupon = DB::table('discounts')
                ->where('code', $validated['code'])
                ->where('is_active', true)
                ->first();

            if (!$coupon) {
                return $this->sendError('Invalid or expired coupon code.', null, 404);
            }

            // Check if coupon is valid
            $now = now();
            if ($coupon->start_date && $now->lt($coupon->start_date)) {
                return $this->sendError('Coupon is not yet active.', null, 400);
            }

            if ($coupon->end_date && $now->gt($coupon->end_date)) {
                return $this->sendError('Coupon has expired.', null, 400);
            }

            // Check minimum purchase requirement
            if ($coupon->minimum_order_amount && $validated['subtotal'] < $coupon->minimum_order_amount) {
                return $this->sendError("Minimum order amount ৳{$coupon->minimum_order_amount} required.", null, 400);
            }

            // Check usage limit
            if ($coupon->usage_limit && $coupon->used_count >= $coupon->usage_limit) {
                return $this->sendError('Coupon usage limit has been reached.', null, 400);
            }

            // Check per-user usage limit
            if (isset($validated['user_id']) && $coupon->per_user_limit) {
                $userUsageCount = CouponUsage::where('coupon_id', $coupon->id)
                    ->where('user_id', $validated['user_id'])
                    ->count();

                if ($userUsageCount >= $coupon->per_user_limit) {
                    return $this->sendError("You've reached the maximum usage limit for this coupon.", null, 400);
                }
            }

            // Calculate discount
            $discountAmount = 0;
            if ($coupon->discount_type === 'percentage') {
                $discountAmount = ($validated['subtotal'] * $coupon->discount_value) / 100;
            } elseif ($coupon->discount_type === 'fixed') {
                $discountAmount = $coupon->discount_value;
            }

            // Apply maximum discount limit if set
            if ($coupon->max_discount_amount && $discountAmount > $coupon->max_discount_amount) {
                $discountAmount = $coupon->max_discount_amount;
            }

            return $this->sendSuccess([
                'code' => $coupon->code,
                'discount_type' => $coupon->discount_type,
                'discount_value' => $coupon->discount_value,
                'discount_amount' => round($discountAmount, 2),
                'is_free_shipping' => (bool) $coupon->is_free_shipping,
            ], 'Coupon validated successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error validating coupon', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to validate coupon.', null, 500);
        }
    }

    /**
     * Auto-apply the best available coupon.
     */
    public function autoApply(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'subtotal' => 'required|numeric|min:0',
                'user_id' => 'nullable|integer|exists:users,id',
                'product_ids' => 'nullable|array',
                'product_ids.*' => 'integer',
            ]);

            // Get applicable coupons
            $query = DB::table('discounts')
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('start_date')->orWhere('start_date', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', now());
                })
                ->where(function ($q) use ($validated) {
                    $q->whereNull('minimum_order_amount')
                      ->orWhere('minimum_order_amount', '<=', $validated['subtotal']);
                })
                ->where(function ($q) {
                    $q->whereNull('usage_limit')
                      ->orWhereColumn('used_count', '<', 'usage_limit');
                });

            $coupons = $query->get();

            $bestCoupon = null;
            $maxDiscount = 0;

            foreach ($coupons as $coupon) {
                // Skip if user has reached per-user limit
                if (isset($validated['user_id']) && $coupon->per_user_limit) {
                    $userUsageCount = CouponUsage::where('coupon_id', $coupon->id)
                        ->where('user_id', $validated['user_id'])
                        ->count();

                    if ($userUsageCount >= $coupon->per_user_limit) {
                        continue;
                    }
                }

                // Calculate discount
                $discountAmount = 0;
                if ($coupon->discount_type === 'percentage') {
                    $discountAmount = ($validated['subtotal'] * $coupon->discount_value) / 100;
                } elseif ($coupon->discount_type === 'fixed') {
                    $discountAmount = $coupon->discount_value;
                }

                // Apply maximum discount limit if set
                if ($coupon->max_discount_amount && $discountAmount > $coupon->max_discount_amount) {
                    $discountAmount = $coupon->max_discount_amount;
                }

                if ($discountAmount > $maxDiscount) {
                    $maxDiscount = $discountAmount;
                    $bestCoupon = $coupon;
                }
            }

            if ($bestCoupon) {
                return $this->sendSuccess([
                    'code' => $bestCoupon->code,
                    'discount_type' => $bestCoupon->discount_type,
                    'discount_value' => $bestCoupon->discount_value,
                    'discount_amount' => round($maxDiscount, 2),
                    'is_free_shipping' => (bool) $bestCoupon->is_free_shipping,
                ], 'Best coupon applied successfully.');
            }

            return $this->sendSuccess(null, 'No applicable coupons found.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error auto-applying coupon', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to auto-apply coupon.', null, 500);
        }
    }
}
