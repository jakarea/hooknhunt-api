<?php

namespace App\Modules\Catalog\Http\Controllers\Api\V2\Catalog;

use App\Http\Controllers\Controller;
use App\Modules\Website\Models\Discount;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DiscountController extends Controller
{
    use ApiResponse;

    /**
     * List all discounts/coupons.
     */
    public function index(Request $request): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.index')) {
            return $this->sendError('You do not have permission to view discounts.', null, 403);
        }

        $query = Discount::query();

        // Filter by type
        if ($request->filled('type') && in_array($request->type, ['percentage', 'fixed_amount', 'shipping'])) {
            $query->where('type', $request->type);
        }

        // Filter by status
        if ($request->filled('status') && $request->status === 'active') {
            $query->where('is_active', true);
        } elseif ($request->filled('status') && $request->status === 'inactive') {
            $query->where('is_active', false);
        }

        // Search by code or description
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('code', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        $discounts = $query->latest()->paginate($request->per_page ?? 20);

        return $this->sendSuccess($discounts, 'Discounts retrieved successfully.');
    }

    /**
     * Store a new discount/coupon.
     */
    public function store(Request $request): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.create')) {
            return $this->sendError('You do not have permission to create discounts.', null, 403);
        }

        $request->validate([
            'code' => 'required|string|unique:discounts,code',
            'description' => 'nullable|string',
            'type' => 'required|in:percentage,fixed_amount,shipping',
            'amount' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
            'is_auto_apply' => 'boolean',
            'first_purchase_only' => 'boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
            'customer_ids' => 'nullable|array',
            'customer_ids.*' => 'integer',
        ]);

        DB::beginTransaction();
        try {
            $discount = Discount::create([
                'code' => strtoupper($request->code),
                'description' => $request->description,
                'type' => $request->type,
                'amount' => $request->amount,
                'max_discount_amount' => $request->max_discount_amount,
                'min_order_amount' => $request->min_order_amount,
                'starts_at' => $request->starts_at,
                'expires_at' => $request->expires_at,
                'max_uses' => $request->max_uses,
                'usage_limit_per_customer' => $request->usage_limit_per_customer,
                'used_count' => 0,
                'is_active' => $request->is_active ?? true,
                'is_auto_apply' => $request->is_auto_apply ?? false,
                'first_purchase_only' => $request->first_purchase_only ?? false,
                'product_ids' => $request->product_ids ?? [],
                'category_ids' => $request->category_ids ?? [],
                'customer_ids' => $request->customer_ids ?? [],
            ]);

            DB::commit();

            return $this->sendSuccess($discount, 'Discount created successfully.', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create discount: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Show single discount.
     */
    public function show($id): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.index')) {
            return $this->sendError('You do not have permission to view discounts.', null, 403);
        }

        $discount = Discount::findOrFail($id);

        return $this->sendSuccess($discount, 'Discount retrieved successfully.');
    }

    /**
     * Update discount.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.edit')) {
            return $this->sendError('You do not have permission to edit discounts.', null, 403);
        }

        $discount = Discount::findOrFail($id);

        $request->validate([
            'code' => ['sometimes', 'string', Rule::unique('discounts')->ignore($discount->id)],
            'description' => 'nullable|string',
            'type' => 'sometimes|in:percentage,fixed_amount,shipping',
            'amount' => 'sometimes|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
            'is_auto_apply' => 'sometimes|boolean',
            'first_purchase_only' => 'sometimes|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
            'customer_ids' => 'nullable|array',
            'customer_ids.*' => 'integer',
        ]);

        DB::beginTransaction();
        try {
            $updateData = [];

            // Only include fields that were actually sent in the request
            if ($request->has('code')) {
                $updateData['code'] = strtoupper($request->code);
            }
            if ($request->has('description')) {
                $updateData['description'] = $request->description;
            }
            if ($request->has('type')) {
                $updateData['type'] = $request->type;
            }
            if ($request->has('amount')) {
                $updateData['amount'] = $request->amount;
            }
            if ($request->has('max_discount_amount')) {
                $updateData['max_discount_amount'] = $request->max_discount_amount;
            }
            if ($request->has('min_order_amount')) {
                $updateData['min_order_amount'] = $request->min_order_amount;
            }
            if ($request->has('starts_at')) {
                $updateData['starts_at'] = $request->starts_at;
            }
            if ($request->has('expires_at')) {
                $updateData['expires_at'] = $request->expires_at;
            }
            if ($request->has('max_uses')) {
                $updateData['max_uses'] = $request->max_uses;
            }
            if ($request->has('usage_limit_per_customer')) {
                $updateData['usage_limit_per_customer'] = $request->usage_limit_per_customer;
            }
            if ($request->exists('is_active')) {
                $updateData['is_active'] = $request->boolean('is_active');
            }
            if ($request->exists('is_auto_apply')) {
                $updateData['is_auto_apply'] = $request->boolean('is_auto_apply');
            }
            if ($request->exists('first_purchase_only')) {
                $updateData['first_purchase_only'] = $request->boolean('first_purchase_only');
            }
            if ($request->has('product_ids')) {
                $updateData['product_ids'] = $request->product_ids ?? [];
            }
            if ($request->has('category_ids')) {
                $updateData['category_ids'] = $request->category_ids ?? [];
            }
            if ($request->has('customer_ids')) {
                $updateData['customer_ids'] = $request->customer_ids ?? [];
            }

            $discount->update($updateData);

            DB::commit();

            return $this->sendSuccess($discount, 'Discount updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update discount: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Delete discount.
     */
    public function destroy($id): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.delete')) {
            return $this->sendError('You do not have permission to delete discounts.', null, 403);
        }

        $discount = Discount::findOrFail($id);

        DB::beginTransaction();
        try {
            $discount->delete();
            DB::commit();

            return $this->sendSuccess(null, 'Discount deleted successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to delete discount: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Bulk generate discount codes.
     */
    public function bulkGenerate(Request $request): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.bulk-generate')) {
            return $this->sendError('You do not have permission to bulk generate discounts.', null, 403);
        }

        $request->validate([
            'prefix' => 'required|string|max:10',
            'count' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string',
            'type' => 'required|in:percentage,fixed_amount,shipping',
            'amount' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'max_uses' => 'nullable|integer|min:1',
            'usage_limit_per_customer' => 'nullable|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            $discounts = [];
            $prefix = strtoupper($request->prefix);

            for ($i = 0; $i < $request->count; $i++) {
                $code = $prefix . '-' . Str::random(8);

                $discount = Discount::create([
                    'code' => $code,
                    'description' => $request->description,
                    'type' => $request->type,
                    'amount' => $request->amount,
                    'max_discount_amount' => $request->max_discount_amount,
                    'min_order_amount' => $request->min_order_amount,
                    'starts_at' => $request->starts_at,
                    'expires_at' => $request->expires_at,
                    'max_uses' => $request->max_uses,
                    'usage_limit_per_customer' => $request->usage_limit_per_customer,
                    'used_count' => 0,
                    'is_active' => true,
                    'is_auto_apply' => false,
                    'first_purchase_only' => false,
                    'product_ids' => [],
                    'category_ids' => [],
                    'customer_ids' => [],
                ]);

                $discounts[] = $discount;
            }

            DB::commit();

            return $this->sendSuccess($discounts, "Successfully generated {$request->count} discount codes.", 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to bulk generate discounts: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Check coupon validity (test tool for admin).
     */
    public function checkValidity(Request $request): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.check-validity')) {
            return $this->sendError('You do not have permission to check discount validity.', null, 403);
        }

        $request->validate([
            'code' => 'required|string|exists:discounts,code',
            'subtotal' => 'required|numeric|min:0',
            'user_id' => 'nullable|integer|exists:users,id',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer',
        ]);

        $discount = Discount::where('code', $request->code)->first();

        if (!$discount) {
            return $this->sendError('Discount code not found.', null, 404);
        }

        $validation = $discount->validateForOrder(
            $request->subtotal,
            $request->user_id,
            $request->product_ids ?? [],
            $request->category_ids ?? []
        );

        if (!$validation['valid']) {
            return $this->sendError($validation['error'], [
                'valid' => false,
                'error' => $validation['error'],
            ], 400);
        }

        return $this->sendSuccess([
            'valid' => true,
            'discount_amount' => $validation['discount_amount'],
            'final_total' => $validation['final_total'],
        ], 'Coupon is valid.');
    }

    /**
     * Toggle discount active status.
     */
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        if (!auth()->user()->hasPermissionTo('catalog.discounts.toggle-status')) {
            return $this->sendError('You do not have permission to toggle discount status.', null, 403);
        }

        $discount = Discount::findOrFail($id);

        $discount->update([
            'is_active' => !$discount->is_active,
        ]);

        return $this->sendSuccess($discount, 'Discount status toggled successfully.');
    }
}
