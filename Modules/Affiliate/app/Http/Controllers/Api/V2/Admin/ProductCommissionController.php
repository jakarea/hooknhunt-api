<?php

namespace App\Modules\Affiliate\Http\Controllers\Api\V2\Admin;

use App\Http\Controllers\Controller;
use App\Modules\Affiliate\Models\ProductAffiliateCommission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductCommissionController extends Controller
{
    /**
     * Get all product commissions.
     * GET /api/v2/admin/product-commissions
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Use direct database query with joins for module independence
            $query = DB::table('product_affiliate_commissions as pac')
                ->leftJoin('products as p', 'pac.product_id', '=', 'p.id')
                ->leftJoin('users as u', 'pac.affiliate_id', '=', 'u.id') // Assuming affiliate table has user_id
                ->select(
                    'pac.*',
                    'p.name as product_name',
                    'p.product_code',
                    'u.name as affiliate_name'
                )
                ->orderBy('pac.created_at', 'desc');

            // Filter by affiliate
            if ($request->has('affiliate_id')) {
                $query->where('pac.affiliate_id', $request->input('affiliate_id'));
            }

            // Filter by product
            if ($request->has('product_id')) {
                $query->where('pac.product_id', $request->input('product_id'));
            }

            // Search by product name or code using direct WHERE clause
            if ($request->has('search') && !empty($request->input('search'))) {
                $searchTerm = '%' . $request->input('search') . '%';
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('p.name', 'like', $searchTerm)
                      ->orWhere('p.product_code', 'like', $searchTerm);
                });
            }

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('pac.is_active', $request->input('is_active'));
            }

            // Global vs Specific filter
            if ($request->has('type')) {
                if ($request->input('type') === 'global') {
                    $query->whereNull('pac.affiliate_id');
                } elseif ($request->input('type') === 'specific') {
                    $query->whereNotNull('pac.affiliate_id');
                }
            }

            $perPage = $request->input('per_page', 20);
            $commissions = $query->paginate($perPage);

            $commissions->getCollection()->transform(function ($commission) {
                $product = $commission->product;
                $price = 0;
                $imageUrl = null;

                // Get price from first active variant
                if ($product && $product->activeVariant) {
                    $price = $product->activeVariant->price ?? 0;
                }

                // Get image from thumbnail
                if ($product && $product->thumbnail) {
                    $imageUrl = $product->thumbnail->full_url ?? null;
                }

                return [
                    'id' => $commission->id,
                    'product_id' => $commission->product_id,
                    'product_name' => $product?->name ?? 'N/A',
                    'product_code' => $product?->product_code ?? 'N/A',
                    'product_price' => (float) $price,
                    'product_image' => $imageUrl,
                    'affiliate_id' => $commission->affiliate_id,
                    'affiliate_name' => $commission->affiliate?->user?->name ?? 'All Affiliates',
                    'affiliate_referral_code' => $commission->affiliate?->referral_code ?? null,
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
            Log::error('Failed to fetch product commissions', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commissions',
            ], 500);
        }
    }

    /**
     * Get commissions for a specific product.
     * GET /api/v2/admin/products/{id}/commissions
     */
    public function getProductCommissions($productId): JsonResponse
    {
        try {
            $product = Product::findOrFail($productId);

            $commissions = ProductAffiliateCommission::with('affiliate')
                ->where('product_id', $productId)
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
                    'product' => [
                        'id' => $product->id,
                        'name' => $product->name,
                        'product_code' => $product->product_code,
                    ],
                    'commissions' => $commissions,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch product commissions', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commissions',
            ], 500);
        }
    }

    /**
     * Create product commission.
     * POST /api/v2/admin/product-commissions
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|integer|exists:products,id',
                'affiliate_id' => 'nullable|integer|exists:affiliates,id',
                'commission_rate' => 'required|numeric|min:0|max:100',
                'is_active' => 'boolean',
            ]);

            $commission = ProductAffiliateCommission::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Product commission created successfully',
                'data' => [
                    'id' => $commission->id,
                    'product_id' => $commission->product_id,
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
            Log::error('Failed to create product commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create commission',
            ], 500);
        }
    }

    /**
     * Update product commission.
     * PUT /api/v2/admin/product-commissions/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'commission_rate' => 'sometimes|numeric|min:0|max:100',
                'is_active' => 'sometimes|boolean',
            ]);

            $commission = ProductAffiliateCommission::findOrFail($id);
            $commission->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Product commission updated successfully',
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
            Log::error('Failed to update product commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update commission',
            ], 500);
        }
    }

    /**
     * Delete product commission.
     * DELETE /api/v2/admin/product-commissions/{id}
     */
    public function destroy($id): JsonResponse
    {
        try {
            $commission = ProductAffiliateCommission::findOrFail($id);
            $commission->delete();

            return response()->json([
                'success' => true,
                'message' => 'Product commission deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Commission not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to delete product commission', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete commission',
            ], 500);
        }
    }
}
