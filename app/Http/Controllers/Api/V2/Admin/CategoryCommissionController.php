<?php

namespace App\Http\Controllers\Api\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategoryAffiliateCommission;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CategoryCommissionController extends Controller
{
    /**
     * Get all category commissions.
     * GET /api/v2/admin/category-commissions
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = CategoryAffiliateCommission::with(['category', 'affiliate.user'])
                ->orderBy('created_at', 'desc');

            // Filter by affiliate
            if ($request->has('affiliate_id')) {
                $query->where('affiliate_id', $request->input('affiliate_id'));
            }

            // Filter by category
            if ($request->has('category_id')) {
                $query->where('category_id', $request->input('category_id'));
            }

            // Search by category name
            if ($request->has('search') && !empty($request->input('search'))) {
                $searchTerm = $request->input('search');
                $query->whereHas('category', function ($q) use ($searchTerm) {
                    $q->where('name', 'like', '%' . $searchTerm . '%');
                });
            }

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->input('is_active'));
            }

            // Global vs Specific filter
            if ($request->has('type')) {
                if ($request->input('type') === 'global') {
                    $query->whereNull('affiliate_id');
                } elseif ($request->input('type') === 'specific') {
                    $query->whereNotNull('affiliate_id');
                }
            }

            $perPage = $request->input('per_page', 20);
            $commissions = $query->paginate($perPage);

            $commissions->getCollection()->transform(function ($commission) {
                return [
                    'id' => $commission->id,
                    'category_id' => $commission->category_id,
                    'category_name' => $commission->category?->name ?? 'N/A',
                    'affiliate_id' => $commission->affiliate_id,
                    'affiliate_name' => $commission->affiliate?->user?->name ?? 'All Affiliates',
                    'commission_rate' => (float) $commission->commission_rate,
                    'is_active' => $commission->is_active,
                    'type' => $commission->affiliate_id === null ? 'global' : 'specific',
                    'created_at' => $commission->created_at->toDateTimeString(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'commissions' => $commissions->items(),
                    'pagination' => [
                        'total' => $commissions->total(),
                        'per_page' => $commissions->perPage(),
                        'current_page' => $commissions->currentPage(),
                        'last_page' => $commissions->lastPage(),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch category commissions', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commissions',
            ], 500);
        }
    }

    /**
     * Get commissions for a specific category.
     * GET /api/v2/admin/categories/{id}/commissions
     */
    public function getCategoryCommissions($categoryId): JsonResponse
    {
        try {
            $category = Category::findOrFail($categoryId);

            $commissions = CategoryAffiliateCommission::with('affiliate')
                ->where('category_id', $categoryId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->transform(function ($commission) {
                    return [
                        'id' => $commission->id,
                        'affiliate_id' => $commission->affiliate_id,
                        'affiliate_name' => $commission->affiliate?->user?->name ?? 'All Affiliates',
                        'commission_rate' => (float) $commission->commission_rate,
                        'is_active' => $commission->is_active,
                        'type' => $commission->affiliate_id === null ? 'global' : 'specific',
                        'created_at' => $commission->created_at->toDateTimeString(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => [
                        'id' => $category->id,
                        'name' => $category->name,
                    ],
                    'commissions' => $commissions,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch category commissions', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commissions',
            ], 500);
        }
    }

    /**
     * Create category commission.
     * POST /api/v2/admin/category-commissions
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'category_id' => 'required|integer|exists:categories,id',
                'affiliate_id' => 'nullable|integer|exists:affiliates,id',
                'commission_rate' => 'required|numeric|min:0|max:100',
                'is_active' => 'boolean',
            ]);

            $commission = CategoryAffiliateCommission::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Category commission created successfully',
                'data' => [
                    'id' => $commission->id,
                    'category_id' => $commission->category_id,
                    'commission_rate' => (float) $commission->commission_rate,
                ],
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to create category commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create commission',
            ], 500);
        }
    }

    /**
     * Update category commission.
     * PUT /api/v2/admin/category-commissions/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'commission_rate' => 'sometimes|numeric|min:0|max:100',
                'is_active' => 'sometimes|boolean',
            ]);

            $commission = CategoryAffiliateCommission::findOrFail($id);
            $commission->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Category commission updated successfully',
                'data' => [
                    'id' => $commission->id,
                    'commission_rate' => (float) $commission->commission_rate,
                    'is_active' => $commission->is_active,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Commission not found',
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to update category commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update commission',
            ], 500);
        }
    }

    /**
     * Delete category commission.
     * DELETE /api/v2/admin/category-commissions/{id}
     */
    public function destroy($id): JsonResponse
    {
        try {
            $commission = CategoryAffiliateCommission::findOrFail($id);
            $commission->delete();

            return response()->json([
                'success' => true,
                'message' => 'Category commission deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Commission not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to delete category commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete commission',
            ], 500);
        }
    }
}
