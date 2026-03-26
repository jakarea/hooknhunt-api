<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Discount; // Ensure you have this Model created in Batch 4 migration
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DiscountController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->sendSuccess(Discount::latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'code' => 'required|unique:discounts,code|uppercase',
            'type' => 'required|in:percentage,fixed_amount',
            'amount' => 'required|numeric',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'min_purchase_amount' => 'nullable|numeric'
        ]);

        $discount = Discount::create($request->all());

        return $this->sendSuccess($discount, 'Coupon created successfully', 201);
    }

    /**
     * Validate Coupon for Checkout
     * Payload: { "code": "EID2025", "cart_total": 5000 }
     */
    public function checkValidity(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'cart_total' => 'required|numeric'
        ]);

        $coupon = Discount::where('code', $request->code)->first();

        // 1. Check Existence
        if (!$coupon) {
            return $this->sendError('Invalid coupon code', null, 404);
        }

        // 2. Check Active Status
        if (!$coupon->is_active) {
            return $this->sendError('This coupon is inactive.');
        }

        // 3. Check Expiry
        if ($coupon->expires_at && Carbon::now()->greaterThan($coupon->expires_at)) {
            return $this->sendError('This coupon has expired.');
        }

        // 4. Check Min Purchase
        if ($coupon->min_purchase_amount && $request->cart_total < $coupon->min_purchase_amount) {
            return $this->sendError("Minimum purchase of {$coupon->min_purchase_amount} required.");
        }

        // 5. Check Usage Limit (Optional - if you added usage_limit column)
        /*
        if ($coupon->usage_limit > 0 && $coupon->used_count >= $coupon->usage_limit) {
            return $this->sendError('Coupon usage limit reached.');
        }
        */

        // Calculate Discount Amount
        $discountAmount = 0;
        if ($coupon->type === 'percentage') {
            $discountAmount = ($request->cart_total * $coupon->amount) / 100;
            // Max discount cap check can be added here
        } else {
            $discountAmount = $coupon->amount;
        }

        return $this->sendSuccess([
            'code' => $coupon->code,
            'discount_amount' => $discountAmount,
            'final_total' => max(0, $request->cart_total - $discountAmount)
        ], 'Coupon applied successfully');
    }

    public function destroy($id)
    {
        Discount::destroy($id);
        return $this->sendSuccess(null, 'Coupon deleted');
    }
}