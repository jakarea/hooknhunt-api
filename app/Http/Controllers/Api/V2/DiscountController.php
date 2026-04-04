<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\CouponUsage;
use App\Models\Discount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DiscountController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Discount::latest();

        if ($request->filled('search')) {
            $query->where('code', 'like', '%' . strtoupper($request->search) . '%');
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('is_auto_apply') && $request->boolean('is_auto_apply')) {
            $query->where('is_auto_apply', true);
        }

        $perPage = $request->integer('per_page', 25);

        return $this->sendSuccess($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:discounts,code',
            'description' => 'nullable|string|max:500',
            'type' => 'required|in:percentage,fixed_amount',
            'amount' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'is_auto_apply' => 'nullable|boolean',
            'first_purchase_only' => 'nullable|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
            'customer_ids' => 'nullable|array',
            'customer_ids.*' => 'integer',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['used_count'] = 0;

        $discount = Discount::create($validated);

        return $this->sendSuccess($discount, 'Coupon created successfully', 201);
    }

    public function show($id)
    {
        $discount = Discount::with('usages.user')->findOrFail($id);

        return $this->sendSuccess($discount);
    }

    public function update(Request $request, $id)
    {
        $discount = Discount::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|required|string|unique:discounts,code,' . $id,
            'description' => 'nullable|string|max:500',
            'type' => 'sometimes|required|in:percentage,fixed_amount',
            'amount' => 'sometimes|required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'is_auto_apply' => 'nullable|boolean',
            'first_purchase_only' => 'nullable|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
            'customer_ids' => 'nullable|array',
            'customer_ids.*' => 'integer',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $discount->update($validated);

        return $this->sendSuccess($discount, 'Coupon updated successfully');
    }

    public function destroy($id)
    {
        $discount = Discount::findOrFail($id);
        $discount->delete();

        return $this->sendSuccess(null, 'Coupon deleted');
    }

    /**
     * Toggle coupon active/inactive status.
     */
    public function toggleStatus($id)
    {
        $discount = Discount::findOrFail($id);
        $discount->update(['is_active' => !$discount->is_active]);

        return $this->sendSuccess($discount, 'Coupon status updated');
    }

    /**
     * Bulk generate coupon codes with a shared prefix.
     */
    public function bulkGenerate(Request $request)
    {
        $validated = $request->validate([
            'prefix' => 'required|string|max:10',
            'quantity' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string|max:500',
            'type' => 'required|in:percentage,fixed_amount',
            'amount' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'is_auto_apply' => 'nullable|boolean',
            'first_purchase_only' => 'nullable|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
            'customer_ids' => 'nullable|array',
            'customer_ids.*' => 'integer',
        ]);

        $prefix = strtoupper($validated['prefix']);
        $quantity = $validated['quantity'];
        unset($validated['prefix'], $validated['quantity']);

        $coupons = [];
        for ($i = 0; $i < $quantity; $i++) {
            $code = $prefix . strtoupper(Str::random(6));

            // Ensure uniqueness
            while (Discount::where('code', $code)->exists()) {
                $code = $prefix . strtoupper(Str::random(6));
            }

            $coupons[] = Discount::create(array_merge($validated, [
                'code' => $code,
                'used_count' => 0,
            ]));
        }

        return $this->sendSuccess($coupons, "{$quantity} coupons generated successfully", 201);
    }

    /**
     * Validate a coupon code against a cart context.
     * Payload: { code, cart_total, user_id?, cart_product_ids?, cart_category_ids? }
     */
    public function checkValidity(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'cart_total' => 'required|numeric|min:0',
            'user_id' => 'nullable|integer',
            'cart_product_ids' => 'nullable|array',
            'cart_product_ids.*' => 'integer',
            'cart_category_ids' => 'nullable|array',
            'cart_category_ids.*' => 'integer',
        ]);

        $coupon = Discount::where('code', strtoupper($validated['code']))->first();

        if (!$coupon) {
            return $this->sendError('Invalid coupon code', null, 404);
        }

        $result = $coupon->validateForOrder(
            (float) $validated['cart_total'],
            $validated['user_id'] ?? null,
            $validated['cart_product_ids'] ?? [],
            $validated['cart_category_ids'] ?? []
        );

        if (!$result['valid']) {
            return $this->sendError($result['error']);
        }

        return $this->sendSuccess([
            'code' => $coupon->code,
            'type' => $coupon->type,
            'discount_amount' => $result['discount_amount'],
            'final_total' => $result['final_total'],
            'coupon' => $coupon,
        ], 'Coupon applied successfully');
    }
}
