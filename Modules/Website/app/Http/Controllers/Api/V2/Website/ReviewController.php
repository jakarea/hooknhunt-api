<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;


use App\Http\Controllers\Controller;
use App\Modules\Website\Models\Review; // Website module model
use App\Modules\Website\Models\WebsiteProduct; // Website module product model
use App\Traits\ApiResponse;
use App\Traits\ImageHelper;
// Cross-module dependencies removed - using direct data access
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Public Review Controller
 * Handles public-facing review endpoints
 */
class ReviewController extends Controller
{
    use ApiResponse;
    /**
     * Display a listing of reviews with pagination.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Use Website Review model without cross-module relationships
        $query = Review::query();

        // Filter by rating if provided
        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        // Filter by product using pivot table directly (no Product model dependency)
        if ($request->has('product_id')) {
            $query->whereExists(function ($q) use ($request) {
                $q->select(DB::raw(1))
                    ->from('review_product')
                    ->whereColumn('review_product.review_id', 'reviews.id')
                    ->where('review_product.product_id', $request->product_id);
            });
        }

        // Pagination - 12 per page for infinite scroll
        $perPage = $request->input('per_page', 12);
        $page = $request->input('page', 1);

        $reviews = $query->latest()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($reviews->items())->map(function ($review) {
                // Format screenshot image URL
                $imageData = $this->formatScreenshotImage($review->screenshot_id, null);

                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'review_text' => $review->review_text,
                    'is_featured' => $review->is_featured,
                    'created_at' => $review->created_at,
                    'image_url' => $imageData['image_url'],
                    'image_id' => $imageData['image_id'],
                ];
            })->toArray(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'has_more_pages' => $reviews->hasMorePages(),
            ],
        ]);
    }

    /**
     * Get reviews for a specific product.
     *
     * @param Request $request
     * @param string $productSlug
     * @return JsonResponse
     */
    public function getByProductSlug(Request $request, string $productSlug): JsonResponse
    {
        $product = WebsiteProduct::where('slug', $productSlug)
            ->select('id', 'name', 'slug')
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Product not found',
            ], 404);
        }

        $query = Review::whereHas('products', function ($q) use ($product) {
            $q->where('products.id', $product->id);
        })->with(['screenshot', 'products' => function ($q) {
            $q->select('products.id', 'products.name', 'products.slug');
        }]);

        // Filter by rating if provided
        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        // Pagination - unlimited but paginated for infinite scroll
        $perPage = $request->input('per_page', 12);
        $page = $request->input('page', 1);

        $reviews = $query->latest()
            ->paginate($perPage, ['*'], 'page', $page);

        // Transform reviews to format screenshot image URLs
        $transformed = collect($reviews->items())->map(function ($review) {
            $reviewArray = $review->toArray();

            // Format screenshot image URL
            if (isset($reviewArray['screenshot']) && $reviewArray['screenshot']) {
                $imageData = $this->formatScreenshotImage(
                    $reviewArray['screenshot']['id'] ?? null,
                    $reviewArray['screenshot']['path'] ?? null
                );
                $reviewArray['image_url'] = $imageData['image_url'];
                $reviewArray['image_id'] = $imageData['image_id'];
            } else {
                $imageData = $this->formatScreenshotImage(null, null);
                $reviewArray['image_url'] = $imageData['image_url'];
                $reviewArray['image_id'] = $imageData['image_id'];
            }

            // Remove old screenshot reference
            unset($reviewArray['screenshot']);

            return $reviewArray;
        });

        return response()->json([
            'data' => $transformed,
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'has_more_pages' => $reviews->hasMorePages(),
            ],
        ]);
    }

    /**
     * Get featured reviews for homepage.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function featured(Request $request): JsonResponse
    {
        $reviews = Review::featured()
            ->with(['screenshot', 'products' => function ($q) {
                $q->select('products.id', 'products.name', 'products.slug');
            }])
            ->limit($request->input('limit', 6))
            ->get();

        // Transform reviews to format screenshot image URLs
        $transformed = $reviews->map(function ($review) {
            $reviewArray = $review->toArray();

            // Format screenshot image URL
            if ($review->screenshot) {
                $imageData = $this->formatScreenshotImage(
                    $review->screenshot->id ?? null,
                    $review->screenshot->path ?? null
                );
                $reviewArray['image_url'] = $imageData['image_url'];
                $reviewArray['image_id'] = $imageData['image_id'];
            } else {
                $imageData = $this->formatScreenshotImage(null, null);
                $reviewArray['image_url'] = $imageData['image_url'];
                $reviewArray['image_id'] = $imageData['image_id'];
            }

            // Remove old screenshot reference
            unset($reviewArray['screenshot']);

            return $reviewArray;
        });

        return response()->json([
            'data' => $transformed,
        ]);
    }

    /**
     * Admin: Get all reviews with management data.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        try {
            $query = Review::query();

            // Filter by rating
            if ($request->has('rating')) {
                $query->where('rating', $request->rating);
            }

            // Filter by product
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

            $perPage = min((int) $request->input('per_page', 20), 100);
            $reviews = $query->latest()->paginate($perPage);

            return $this->sendSuccess($reviews, 'Reviews retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error retrieving admin reviews', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve reviews.', null, 500);
        }
    }

    /**
     * Admin: Store a new review.
     */
    public function adminStore(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'screenshot_id' => 'nullable|integer|exists:media_files,id',
                'review_text' => 'required|string',
                'rating' => 'required|integer|min:1|max:5',
                'is_featured' => 'nullable|boolean',
                'sort_order' => 'nullable|integer|min:0',
                'product_ids' => 'nullable|array',
                'product_ids.*' => 'integer|exists:products,id',
            ]);

            $review = Review::create([
                'screenshot_id' => $validated['screenshot_id'] ?? null,
                'review_text' => $validated['review_text'],
                'rating' => $validated['rating'],
                'is_featured' => $validated['is_featured'] ?? false,
                'sort_order' => $validated['sort_order'] ?? 0,
                'status' => 'approved',
            ]);

            // Attach products if provided
            if (!empty($validated['product_ids'])) {
                $review->products()->attach($validated['product_ids']);
            }

            return $this->sendSuccess($review->load('products'), 'Review created successfully.', 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error creating review', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to create review.', null, 500);
        }
    }

    /**
     * Admin: Update a review.
     */
    public function adminUpdate(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'screenshot_id' => 'nullable|integer|exists:media_files,id',
                'review_text' => 'nullable|string',
                'rating' => 'nullable|integer|min:1|max:5',
                'is_featured' => 'nullable|boolean',
                'sort_order' => 'nullable|integer|min:0',
                'product_ids' => 'nullable|array',
                'product_ids.*' => 'integer|exists:products,id',
            ]);

            $review = Review::find($id);
            if (!$review) {
                return $this->sendError('Review not found.', null, 404);
            }

            $review->update([
                'screenshot_id' => $validated['screenshot_id'] ?? $review->screenshot_id,
                'review_text' => $validated['review_text'] ?? $review->review_text,
                'rating' => $validated['rating'] ?? $review->rating,
                'is_featured' => $validated['is_featured'] ?? $review->is_featured,
                'sort_order' => $validated['sort_order'] ?? $review->sort_order,
            ]);

            // Update products if provided
            if (isset($validated['product_ids'])) {
                $review->products()->sync($validated['product_ids']);
            }

            return $this->sendSuccess($review->load('products'), 'Review updated successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error updating review', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to update review.', null, 500);
        }
    }

    /**
     * Admin: Delete a review.
     */
    public function adminDestroy(int $id): JsonResponse
    {
        try {
            $review = Review::find($id);
            if (!$review) {
                return $this->sendError('Review not found.', null, 404);
            }

            $review->delete();

            return $this->sendSuccess(null, 'Review deleted successfully.');

        } catch (\Exception $e) {
            Log::error('Error deleting review', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to delete review.', null, 500);
        }
    }

    /**
     * Admin: Toggle featured status.
     */
    public function toggleFeatured(int $id): JsonResponse
    {
        try {
            $review = Review::find($id);
            if (!$review) {
                return $this->sendError('Review not found.', null, 404);
            }

            $review->update(['is_featured' => !$review->is_featured]);

            return $this->sendSuccess($review, 'Review featured status toggled successfully.');

        } catch (\Exception $e) {
            Log::error('Error toggling review featured status', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to toggle featured status.', null, 500);
        }
    }

    /**
     * Admin: Update sort order for multiple reviews.
     */
    public function updateSortOrder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'reviews' => 'required|array',
                'reviews.*.id' => 'required|integer|exists:reviews,id',
                'reviews.*.sort_order' => 'required|integer|min:0',
            ]);

            foreach ($validated['reviews'] as $reviewData) {
                Review::where('id', $reviewData['id'])
                    ->update(['sort_order' => $reviewData['sort_order']]);
            }

            return $this->sendSuccess(null, 'Review sort order updated successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error updating review sort order', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to update sort order.', null, 500);
        }
    }
}
