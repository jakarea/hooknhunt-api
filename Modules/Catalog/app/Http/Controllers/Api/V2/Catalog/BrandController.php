<?php

namespace App\Modules\Catalog\Http\Controllers\Api\V2\Catalog;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Brand Controller for V2 API
 * Handles brand listing and management
 */
class BrandController extends Controller
{
    private const CACHE_TTL = 600; // 10 minutes

    /**
     * Get brands dropdown list
     * GET /api/v2/catalog/brands/dropdown
     *
     * @return JsonResponse
     */
    public function dropdown(): JsonResponse
    {
        try {
            $brands = Cache::remember('brands:dropdown:v2', self::CACHE_TTL, function () {
                return Brand::select('id', 'name', 'slug', 'logo_id')
                    ->orderBy('name', 'asc')
                    ->get()
                    ->map(function ($brand) {
                        return [
                            'id' => $brand->id,
                            'name' => $brand->name,
                            'slug' => $brand->slug,
                            'logo_id' => $brand->logo_id,
                        ];
                    });
            });

            return response()->json([
                'success' => true,
                'message' => 'Brands retrieved successfully',
                'data' => $brands->toArray()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve brands',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get paginated list of brands
     * GET /api/v2/catalog/brands
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->input('per_page', 20);
            $search = $request->input('search', '');

            $cacheKey = "brands:v2:per_page:{$perPage}:search:{$search}";

            $brands = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search) {
                $query = Brand::select('id', 'name', 'slug', 'logo_id', 'website', 'created_at', 'updated_at');

                // Search filter
                if ($search) {
                    $query->where('name', 'like', "%{$search}%")
                          ->orWhere('slug', 'like', "%{$search}%");
                }

                return $query->orderBy('name', 'asc')
                    ->paginate($perPage);
            });

            return response()->json([
                'success' => true,
                'message' => 'Brands retrieved successfully',
                'data' => [
                    'brands' => $brands->items(),
                    'pagination' => [
                        'current_page' => $brands->currentPage(),
                        'per_page' => $brands->perPage(),
                        'total' => $brands->total(),
                        'last_page' => $brands->lastPage(),
                        'from' => $brands->firstItem(),
                        'to' => $brands->lastItem(),
                        'has_more_pages' => $brands->hasMorePages(),
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve brands',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get single brand by slug
     * GET /api/v2/catalog/brands/{slug}
     *
     * @param string $slug
     * @return JsonResponse
     */
    public function show(string $slug): JsonResponse
    {
        try {
            $cacheKey = "brand:v2:slug:{$slug}";

            $brand = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug) {
                return Brand::where('slug', $slug)
                    ->firstOrFail();
            });

            return response()->json([
                'success' => true,
                'message' => 'Brand retrieved successfully',
                'data' => $brand
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Brand not found',
                'error' => 'The requested brand does not exist'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve brand',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Create new brand (Authenticated)
     * POST /api/v2/catalog/brands
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255|unique:brands,slug',
                'logo_id' => 'nullable|integer',
                'website' => 'nullable|url|max:255',
            ]);

            $brand = Brand::create($validated);

            // Clear cache
            Cache::forget('brands:*');

            return response()->json([
                'success' => true,
                'message' => 'Brand created successfully',
                'data' => $brand
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create brand',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Update brand (Authenticated)
     * PUT /api/v2/catalog/brands/{id}
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $brand = Brand::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'slug' => 'nullable|string|max:255|unique:brands,slug,' . $id,
                'logo_id' => 'nullable|integer',
                'website' => 'nullable|url|max:255',
            ]);

            $brand->update($validated);

            // Clear cache
            Cache::forget("brand:v2:slug:{$brand->slug}");
            Cache::forget('brands:*');

            return response()->json([
                'success' => true,
                'message' => 'Brand updated successfully',
                'data' => $brand
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Brand not found',
                'error' => 'The requested brand does not exist'
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update brand',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Delete brand (Authenticated)
     * DELETE /api/v2/catalog/brands/{id}
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $brand = Brand::findOrFail($id);

            // Check if brand has products
            if ($brand->products()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete brand with products',
                    'error' => 'Please reassign products to another brand first'
                ], 422);
            }

            $brandSlug = $brand->slug;
            $brand->delete();

            // Clear cache
            Cache::forget("brand:v2:slug:{$brandSlug}");
            Cache::forget('brands:*');

            return response()->json([
                'success' => true,
                'message' => 'Brand deleted successfully'
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Brand not found',
                'error' => 'The requested brand does not exist'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete brand',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }
}