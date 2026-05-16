<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Cached Product List Controller
 *
 * Provides high-performance product listing with caching
 * Use this instead of ProductController::index() for better performance
 *
 * @package App\Http\Controllers\Api\V2
 */
class ProductListController extends Controller
{
    use ApiResponse;

    /**
     * Get cached product list
     *
     * Caches product list for 5 minutes to reduce database load
     * Cache key includes filters to ensure correct results
     *
     * GET /api/v2/catalog/products/cached
     */
    public function index(Request $request)
    {
        // Generate cache key based on filters
        $cacheKey = $this->getCacheKey($request);

        // Try to get from cache first
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $this->sendSuccess($cached);
        }

        // Cache miss - build query
        $query = Product::query()
            ->select([
                'products.id',
                'products.name',
                'products.slug',
                'products.product_code',
                'products.status',
                'products.category_id',
                'products.brand_id',
                'products.thumbnail_id',
                'products.sort_order',
                'products.created_at',
            ])
            ->with([
                'category' => fn($q) => $q->select('id', 'name', 'slug'),
                'brand' => fn($q) => $q->select('id', 'name', 'slug'),
                'thumbnail' => fn($q) => $q->select('id', 'file_name', 'disk'),
                'variants' => fn($q) => $q
                    ->where('channel', 'wholesale')
                    ->select('id', 'product_id', 'variant_name', 'stock', 'price'),
            ]);

        // Apply filters
        if ($request->search) {
            $query->where('products.name', 'like', "%{$request->search}%");
        }

        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        if ($request->status && $request->status !== 'all') {
            $query->where('products.status', $request->status);
        }

        if ($request->brand_id) {
            $query->where('products.brand_id', $request->brand_id);
        }

        // Pagination
        $perPage = min((int)($request->per_page ?? 20), 100); // Max 100 for cached version
        $page = $request->page ?? 1;

        $result = $query->paginate($perPage, ['*'], 'page', $page);

        // Transform to add computed fields
        $result->getCollection()->transform(function ($product) {
            $product->thumbnail_url = $product->thumbnail?->full_url ?? null;
            $product->total_stock = $product->variants->sum('stock') ?? 0;
            $product->variants_count = $product->variants->count();
            return $product;
        });

        // Cache for 5 minutes (300 seconds)
        Cache::put($cacheKey, $result, 300);

        return $this->sendSuccess($result);
    }

    /**
     * Clear product list cache
     *
     * Call this after creating/updating/deleting products
     *
     * POST /api/v2/catalog/products/cached/clear
     */
    public function clearCache()
    {
        // Clear all product-related cache keys
        $pattern = 'products:list:*';
        $keys = Cache::getMemcached()?->get($pattern) ?? [];

        foreach ($keys as $key) {
            Cache::forget($key);
        }

        // Alternative: Use cache tags if supported
        // Cache::tags(['products'])->flush();

        return $this->sendSuccess(null, 'Product list cache cleared');
    }

    /**
     * Generate cache key based on request parameters
     */
    private function getCacheKey(Request $request): string
    {
        $params = [
            'search' => $request->search,
            'category_id' => $request->category_id,
            'status' => $request->status,
            'brand_id' => $request->brand_id,
            'sort_by' => $request->sort_by,
            'per_page' => $request->per_page,
            'page' => $request->page,
        ];

        // Create deterministic cache key
        ksort($params);
        return 'products:list:' . md5(json_encode($params));
    }
}
