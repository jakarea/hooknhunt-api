<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Public Review Controller
 * Handles public-facing review endpoints
 */
class ReviewController extends Controller
{
    /**
     * Display a listing of reviews with pagination.
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

        // Pagination - 12 per page for infinite scroll
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
        $product = Product::where('slug', $productSlug)
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

        return response()->json([
            'data' => $reviews->items(),
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

        return response()->json([
            'data' => $reviews,
        ]);
    }
}
