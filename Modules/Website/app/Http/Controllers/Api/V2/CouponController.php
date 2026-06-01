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
            // Merge cart_total into subtotal for backward compatibility
            if ($request->has('cart_total') && !$request->has('subtotal')) {
                $request->merge(['subtotal' => $request->input('cart_total')]);
            }

            $validated = $request->validate([
                'code' => 'required|string|exists:discounts,code',
                'subtotal' => 'required|numeric|min:0',
                'user_id' => 'nullable|integer|exists:users,id',
                'product_ids' => 'nullable|array',
                'product_ids.*' => 'integer',
                'category_ids' => 'nullable|array',
                'category_ids.*' => 'integer',
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
            if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
                return $this->sendError('Coupon is not yet active.', null, 400);
            }

            if ($coupon->expires_at && $now->gt($coupon->expires_at)) {
                return $this->sendError('Coupon has expired.', null, 400);
            }

            // Check minimum purchase requirement
            if ($coupon->min_order_amount && $validated['subtotal'] < $coupon->min_order_amount) {
                return $this->sendError("Minimum order amount ৳{$coupon->min_order_amount} required.", null, 400);
            }

            // Check usage limit
            if ($coupon->max_uses && $coupon->used_count >= $coupon->max_uses) {
                return $this->sendError('Coupon usage limit has been reached.', null, 400);
            }

            // Check per-user usage limit
            if (isset($validated['user_id']) && $coupon->usage_limit_per_customer) {
                $userUsageCount = CouponUsage::where('coupon_id', $coupon->id)
                    ->where('user_id', $validated['user_id'])
                    ->count();

                if ($userUsageCount >= $coupon->usage_limit_per_customer) {
                    return $this->sendError("You've reached the maximum usage limit for this coupon.", null, 400);
                }
            }

            // Check product restrictions
            if (!empty($coupon->product_ids) && isset($validated['product_ids'])) {
                $applicableProducts = array_intersect($validated['product_ids'], json_decode($coupon->product_ids, true) ?? []);
                if (count($applicableProducts) === 0) {
                    return $this->sendError('This coupon is not applicable to any product in your cart.', null, 400);
                }
            }

            // Check category restrictions
            if (!empty($coupon->category_ids) && isset($validated['category_ids'])) {
                $applicableCategories = array_intersect($validated['category_ids'], json_decode($coupon->category_ids, true) ?? []);
                if (count($applicableCategories) === 0) {
                    return $this->sendError('This coupon is not applicable to any category in your cart.', null, 400);
                }
            }

            // Check customer restrictions
            if (!empty($coupon->customer_ids) && isset($validated['user_id'])) {
                $allowedCustomers = json_decode($coupon->customer_ids, true) ?? [];
                if (!in_array($validated['user_id'], $allowedCustomers)) {
                    return $this->sendError('This coupon is not available for your account.', null, 400);
                }
            }

            // Calculate discount
            $discountAmount = 0;
            if ($coupon->type === 'percentage') {
                $discountAmount = ($validated['subtotal'] * $coupon->amount) / 100;
            } elseif ($coupon->type === 'fixed_amount') {
                $discountAmount = $coupon->amount;
            }

            // Apply maximum discount limit if set
            if ($coupon->max_discount_amount && $discountAmount > $coupon->max_discount_amount) {
                $discountAmount = $coupon->max_discount_amount;
            }

            // Discount can't exceed cart total
            $discountAmount = min($discountAmount, $validated['subtotal']);

            return $this->sendSuccess([
                'code' => $coupon->code,
                'discount_type' => $coupon->type,
                'discount_value' => $coupon->amount,
                'discount_amount' => round($discountAmount, 2),
                'max_discount_amount' => $coupon->max_discount_amount,
                'min_purchase_amount' => $coupon->min_order_amount ?? 0,
                'final_total' => round(max(0, $validated['subtotal'] - $discountAmount), 2),
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
            // Merge cart_total into subtotal for backward compatibility
            if ($request->has('cart_total') && !$request->has('subtotal')) {
                $request->merge(['subtotal' => $request->input('cart_total')]);
            }

            $validated = $request->validate([
                'subtotal' => 'required|numeric|min:0',
                'user_id' => 'nullable|integer|exists:users,id',
                'product_ids' => 'nullable|array',
                'product_ids.*' => 'integer',
                'category_ids' => 'nullable|array',
                'category_ids.*' => 'integer',
            ]);

            // Get applicable coupons
            $query = DB::table('discounts')
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
                })
                ->where(function ($q) use ($validated) {
                    $q->whereNull('min_order_amount')
                      ->orWhere('min_order_amount', '<=', $validated['subtotal']);
                })
                ->where(function ($q) {
                    $q->whereNull('max_uses')
                      ->orWhereColumn('used_count', '<', 'max_uses');
                });

            $coupons = $query->get();

            $bestCoupon = null;
            $maxDiscount = 0;

            foreach ($coupons as $coupon) {
                // Skip if user has reached per-user limit
                if (isset($validated['user_id']) && $coupon->usage_limit_per_customer) {
                    $userUsageCount = CouponUsage::where('coupon_id', $coupon->id)
                        ->where('user_id', $validated['user_id'])
                        ->count();

                    if ($userUsageCount >= $coupon->usage_limit_per_customer) {
                        continue;
                    }
                }

                // Check product restrictions
                if (!empty($coupon->product_ids) && isset($validated['product_ids'])) {
                    $allowedProducts = json_decode($coupon->product_ids, true) ?? [];
                    $applicableProducts = array_intersect($validated['product_ids'], $allowedProducts);
                    if (count($applicableProducts) === 0) {
                        continue;
                    }
                }

                // Check category restrictions
                if (!empty($coupon->category_ids) && isset($validated['category_ids'])) {
                    $allowedCategories = json_decode($coupon->category_ids, true) ?? [];
                    $applicableCategories = array_intersect($validated['category_ids'], $allowedCategories);
                    if (count($applicableCategories) === 0) {
                        continue;
                    }
                }

                // Check customer restrictions
                if (!empty($coupon->customer_ids) && isset($validated['user_id'])) {
                    $allowedCustomers = json_decode($coupon->customer_ids, true) ?? [];
                    if (!in_array($validated['user_id'], $allowedCustomers)) {
                        continue;
                    }
                }

                // Calculate discount
                $discountAmount = 0;
                if ($coupon->type === 'percentage') {
                    $discountAmount = ($validated['subtotal'] * $coupon->amount) / 100;
                } elseif ($coupon->type === 'fixed_amount') {
                    $discountAmount = $coupon->amount;
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
                    'discount_type' => $bestCoupon->type,
                    'discount_value' => $bestCoupon->amount,
                    'discount_amount' => round($maxDiscount, 2),
                    'max_discount_amount' => $bestCoupon->max_discount_amount,
                    'min_purchase_amount' => $bestCoupon->min_order_amount ?? 0,
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
