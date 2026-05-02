<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Validate a coupon code for the cart.
     * POST /api/v2/store/coupons/validate
     */
    public function validate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:255',
            'cart_total' => 'required|numeric|min:0',
        ]);

        try {
            $discount = Discount::where('code', strtoupper($validated['code']))
                ->first();

            if (!$discount) {
                return response()->json([
                    'status' => false,
                    'message' => 'Invalid coupon code',
                    'data' => null,
                ], 404);
            }

            // Get authenticated user ID if available
            $userId = $request->user()?->id;

            // Validate the discount
            $validation = $discount->validateForOrder(
                $validated['cart_total'],
                $userId,
                [],
                []
            );

            if (!$validation['valid']) {
                return response()->json([
                    'status' => false,
                    'message' => $validation['error'],
                    'data' => null,
                ], 400);
            }

            return response()->json([
                'status' => true,
                'message' => 'Coupon applied successfully',
                'data' => [
                    'code' => $discount->code,
                    'description' => $discount->description,
                    'discount_type' => $discount->type,
                    'discount_value' => (float) $discount->amount,
                    'discount_amount' => $validation['discount_amount'],
                    'max_discount_amount' => $discount->max_discount_amount ? (float) $discount->max_discount_amount : null,
                    'min_purchase_amount' => $discount->min_order_amount ? (float) $discount->min_order_amount : 0,
                    'final_total' => $validation['final_total'],
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Coupon validation failed', [
                'error' => $e->getMessage(),
                'code' => $validated['code'] ?? null,
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Failed to validate coupon',
                'data' => null,
            ], 500);
        }
    }

    /**
     * Get auto-apply coupons for the cart.
     * GET /api/v2/store/coupons/auto-apply
     */
    public function autoApply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_total' => 'required|numeric|min:0',
        ]);

        try {
            $cartTotal = $validated['cart_total'];
            $userId = $request->user()?->id;

            $discounts = Discount::where('is_active', true)
                ->where('is_auto_apply', true)
                ->where(function ($query) use ($cartTotal) {
                    $query->whereNull('min_order_amount')
                        ->orWhere('min_order_amount', '<=', $cartTotal);
                })
                ->where(function ($query) {
                    $query->whereNull('starts_at')
                        ->orWhere('starts_at', '<=', now());
                })
                ->where(function ($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>=', now());
                })
                ->get();

            $applicableDiscounts = $discounts->map(function ($discount) use ($cartTotal, $userId) {
                $validation = $discount->validateForOrder($cartTotal, $userId, [], []);

                if (!$validation['valid']) {
                    return null;
                }

                return [
                    'code' => $discount->code,
                    'description' => $discount->description,
                    'discount_type' => $discount->type,
                    'discount_value' => (float) $discount->amount,
                    'discount_amount' => $validation['discount_amount'],
                ];
            })->filter()->sortByDesc('discount_amount')->values()->toArray();

            return response()->json([
                'status' => true,
                'message' => 'Auto-apply coupons retrieved',
                'data' => $applicableDiscounts,
            ]);

        } catch (\Exception $e) {
            \Log::error('Auto-apply coupons failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve coupons',
                'data' => [],
            ], 500);
        }
    }
}
