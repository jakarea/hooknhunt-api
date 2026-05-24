<?php

namespace App\Modules\Catalog\Http\Controllers\Api\V2\Catalog;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Catalog Category Controller for V2 API
 * Handles category listing, dropdown, details, and management
 */
class CategoryController extends Controller
{
    private const CACHE_TTL = 600; // 10 minutes

    /**
     * Get categories dropdown list
     * GET /api/v2/catalog/categories/dropdown
     *
     * @return JsonResponse
     */
    public function dropdown(): JsonResponse
    {
        try {
            $categories = Cache::remember('categories:dropdown:v2', self::CACHE_TTL, function () {
                return Category::select('id', 'name', 'slug', 'parent_id')
                    ->where('is_active', true)
                    ->orderBy('sort_order', 'asc')
                    ->orderBy('name', 'asc')
                    ->get()
                    ->map(function ($category) {
                        return [
                            'id' => $category->id,
                            'name' => $category->name,
                            'slug' => $category->slug,
                            'parent_id' => $category->parent_id,
                            'has_children' => $category->children()->where('is_active', true)->exists(),
                        ];
                    });
            });

            return response()->json([
                'success' => true,
                'message' => 'Categories retrieved successfully',
                'data' => $categories->toArray()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve categories',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get paginated list of categories
     * GET /api/v2/catalog/categories
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->input('per_page', 20);
            $search = $request->input('search', '');
            $parentId = $request->input('parent_id');

            $cacheKey = "categories:v2:per_page:{$perPage}:search:{$search}:parent:{$parentId}";

            $categories = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search, $parentId) {
                $query = Category::select('id', 'name', 'slug', 'image_id', 'parent_id', 'is_active', 'sort_order', 'category_code')
                    ->with(['parent', 'children'])
                    ->where('is_active', true);

                // Search filter
                if ($search) {
                    $query->where('name', 'like', "%{$search}%");
                }

                // Parent filter
                if ($parentId !== null && $parentId !== '') {
                    if ($parentId === '0') {
                        $query->whereNull('parent_id');
                    } else {
                        $query->where('parent_id', $parentId);
                    }
                }

                return $query->orderBy('sort_order', 'asc')
                    ->orderBy('name', 'asc')
                    ->paginate($perPage);
            });

            return response()->json([
                'success' => true,
                'message' => 'Categories retrieved successfully',
                'data' => [
                    'categories' => $categories->items(),
                    'pagination' => [
                        'current_page' => $categories->currentPage(),
                        'per_page' => $categories->perPage(),
                        'total' => $categories->total(),
                        'last_page' => $categories->lastPage(),
                        'from' => $categories->firstItem(),
                        'to' => $categories->lastItem(),
                        'has_more_pages' => $categories->hasMorePages(),
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve categories',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get single category by slug
     * GET /api/v2/catalog/categories/{slug}
     *
     * @param string $slug
     * @return JsonResponse
     */
    public function show(string $slug): JsonResponse
    {
        try {
            $cacheKey = "category:v2:slug:{$slug}";

            $category = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug) {
                return Category::with([
                    'parent',
                    'children' => function ($query) {
                        $query->where('is_active', true);
                    }
                ])
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();
            });

            return response()->json([
                'success' => true,
                'message' => 'Category retrieved successfully',
                'data' => $category
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'error' => 'The requested category does not exist or is not available'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve category',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Create new category (Authenticated)
     * POST /api/v2/catalog/categories
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255|unique:categories,slug',
                'parent_id' => 'nullable|exists:categories,id',
                'image_id' => 'nullable|integer',
                'is_active' => 'nullable|boolean',
                'sort_order' => 'nullable|integer|min:0',
                'category_code' => 'nullable|string|max:50',
            ]);

            $category = Category::create($validated);

            // Clear cache
            Cache::forget('categories:*');

            return response()->json([
                'success' => true,
                'message' => 'Category created successfully',
                'data' => $category->load(['parent', 'children'])
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
                'message' => 'Failed to create category',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Update category (Authenticated)
     * PUT /api/v2/catalog/categories/{id}
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $category = Category::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'slug' => 'nullable|string|max:255|unique:categories,slug,' . $id,
                'parent_id' => 'nullable|exists:categories,id',
                'image_id' => 'nullable|integer',
                'is_active' => 'nullable|boolean',
                'sort_order' => 'nullable|integer|min:0',
                'category_code' => 'nullable|string|max:50',
            ]);

            $category->update($validated);

            // Clear cache
            Cache::forget("category:v2:slug:{$category->slug}");
            Cache::forget('categories:*');

            return response()->json([
                'success' => true,
                'message' => 'Category updated successfully',
                'data' => $category->load(['parent', 'children'])
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'error' => 'The requested category does not exist'
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
                'message' => 'Failed to update category',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Delete category (Authenticated)
     * DELETE /api/v2/catalog/categories/{id}
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $category = Category::findOrFail($id);

            // Check if category has children
            if ($category->children()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete category with subcategories',
                    'error' => 'Please delete or move subcategories first'
                ], 422);
            }

            // Check if category has products
            if ($category->products()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete category with products',
                    'error' => 'Please reassign products to another category first'
                ], 422);
            }

            $categorySlug = $category->slug;
            $category->delete();

            // Clear cache
            Cache::forget("category:v2:slug:{$categorySlug}");
            Cache::forget('categories:*');

            return response()->json([
                'success' => true,
                'message' => 'Category deleted successfully'
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'error' => 'The requested category does not exist'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete category',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }
}