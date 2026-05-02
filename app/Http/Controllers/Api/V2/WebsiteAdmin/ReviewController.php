<?php

namespace App\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Review Controller
 * Handles CRUD operations for reviews in admin panel
 */
class ReviewController extends Controller
{
    /**
     * Display a listing of reviews.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['screenshot', 'products' => function ($q) {
            $q->select('products.id', 'products.name', 'products.slug');
        }]);

        // Filter by rating if provided
        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        // Filter by product if provided
        if ($request->has('product_id')) {
            $query->whereHas('products', function ($q) use ($request) {
                $q->where('products.id', $request->product_id);
            });
        }

        // Search by review text
        if ($request->has('search')) {
            $search = $request->search;
            $query->where('review_text', 'like', "%{$search}%");
        }

        // Pagination
        $perPage = $request->input('per_page', 12);
        $page = $request->input('page', 1);

        $reviews = $query->latest()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $reviews->items(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'from' => $reviews->firstItem(),
                'to' => $reviews->lastItem(),
            ],
        ]);
    }

    /**
     * Store a newly created review.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'screenshot_id' => 'nullable|exists:media_files,id',
            'review_text' => 'required|string|max:2000',
            'rating' => 'required|integer|min:1|max:5',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
            'product_ids' => 'array',
            'product_ids.*' => 'exists:products,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $review = Review::create([
                'screenshot_id' => $request->screenshot_id,
                'review_text' => $request->review_text,
                'rating' => $request->rating,
                'is_featured' => $request->boolean('is_featured', false),
                'sort_order' => $request->integer('sort_order', 0),
            ]);

            // Attach products if provided
            if ($request->has('product_ids') && is_array($request->product_ids)) {
                $review->products()->attach($request->product_ids);
            }

            DB::commit();

            // Load relationships for response
            $review->load(['screenshot', 'products' => function ($q) {
                $q->select('products.id', 'products.name', 'products.slug');
            }]);

            return response()->json([
                'message' => 'Review created successfully',
                'data' => $review,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified review.
     *
     * @param Review $review
     * @return JsonResponse
     */
    public function show(Review $review): JsonResponse
    {
        $review->load(['screenshot', 'products' => function ($q) {
            $q->select('products.id', 'products.name', 'products.slug', 'products.thumbnail_id');
        }]);

        return response()->json([
            'data' => $review,
        ]);
    }

    /**
     * Update the specified review.
     *
     * @param Request $request
     * @param Review $review
     * @return JsonResponse
     */
    public function update(Request $request, Review $review): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'screenshot_id' => 'nullable|exists:media_files,id',
            'review_text' => 'sometimes|required|string|max:2000',
            'rating' => 'sometimes|required|integer|min:1|max:5',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
            'product_ids' => 'array',
            'product_ids.*' => 'exists:products,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $review->update([
                'screenshot_id' => $request->screenshot_id ?? $review->screenshot_id,
                'review_text' => $request->review_text ?? $review->review_text,
                'rating' => $request->rating ?? $review->rating,
                'is_featured' => $request->boolean('is_featured', $review->is_featured),
                'sort_order' => $request->integer('sort_order', $review->sort_order),
            ]);

            // Sync products if provided
            if ($request->has('product_ids')) {
                $review->products()->sync($request->product_ids ?? []);
            }

            DB::commit();

            // Load relationships for response
            $review->load(['screenshot', 'products' => function ($q) {
                $q->select('products.id', 'products.name', 'products.slug');
            }]);

            return response()->json([
                'message' => 'Review updated successfully',
                'data' => $review,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to update review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified review.
     *
     * @param Review $review
     * @return JsonResponse
     */
    public function destroy(Review $review): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Detach all products
            $review->products()->detach();

            // Delete review
            $review->delete();

            DB::commit();

            return response()->json([
                'message' => 'Review deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to delete review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get reviews for a specific product.
     *
     * @param Request $request
     * @param int $productId
     * @return JsonResponse
     */
    public function getByProduct(Request $request, int $productId): JsonResponse
    {
        // Validate product exists
        $product = Product::find($productId);
        if (!$product) {
            return response()->json([
                'message' => 'Product not found',
            ], 404);
        }

        $query = Review::whereHas('products', function ($q) use ($productId) {
            $q->where('products.id', $productId);
        })->with(['screenshot', 'products' => function ($q) {
            $q->select('products.id', 'products.name', 'products.slug');
        }]);

        // Filter by rating if provided
        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        // Pagination
        $perPage = $request->input('per_page', 12);
        $page = $request->input('page', 1);

        $reviews = $query->latest()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $reviews->items(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'from' => $reviews->firstItem(),
                'to' => $reviews->lastItem(),
            ],
        ]);
    }

    /**
     * Toggle featured status of a review.
     *
     * @param Review $review
     * @return JsonResponse
     */
    public function toggleFeatured(Review $review): JsonResponse
    {
        $review->update([
            'is_featured' => !$review->is_featured,
        ]);

        return response()->json([
            'message' => 'Review featured status toggled',
            'data' => $review,
        ]);
    }

    /**
     * Update sort order for multiple reviews.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSortOrder(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reviews' => 'required|array',
            'reviews.*.id' => 'required|exists:reviews,id',
            'reviews.*.sort_order' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($request->reviews as $reviewData) {
                Review::where('id', $reviewData['id'])
                    ->update(['sort_order' => $reviewData['sort_order']]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Sort order updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to update sort order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
