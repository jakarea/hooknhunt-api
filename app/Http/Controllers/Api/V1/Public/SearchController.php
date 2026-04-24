<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class SearchController extends Controller
{
    use ApiResponse;

    /**
     * Search products (public - no auth required)
     * GET /api/v1/public/search?q={query}&page={page}&per_page={per_page}
     */
    public function search(Request $request)
    {
        $query = $request->input('q');
        $perPage = $request->input('per_page', 24);
        $page = $request->input('page', 1);

        if (!$query || strlen($query) < 2) {
            return $this->sendSuccess([
                'data' => [],
                'total' => 0,
                'last_page' => 1,
                'current_page' => 1,
                'per_page' => $perPage,
            ]);
        }

        $search = Product::with(['thumbnail', 'category', 'variants'])
            ->where('is_active', true)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('name_bn', 'like', "%{$query}%")
                  ->orWhere('short_description', 'like', "%{$query}%")
                  ->orWhere('long_description', 'like', "%{$query}%");
            });

        $products = $search->paginate($perPage, ['*'], 'page', $page);

        // Transform products to match frontend expected format
        $transformed = collect($products->items())->map(function ($product) {
            $thumbnail = $product->thumbnail?->first();
            $price = $product->variants?->first()?->offer_price
                ?? $product->variants?->first()?->price
                ?? $product->price;

            return [
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'name_bn' => $product->name_bn,
                'short_description' => $product->short_description,
                'long_description' => $product->long_description,
                'image' => $thumbnail?->url ?? null,
                'featured_image' => $thumbnail?->url ?? null,
                'thumbnail' => $thumbnail?->url ?? null,
                'price' => (float) $price,
                'actual_price' => (float) $price,
                'compare_at_price' => $product->compare_at_price,
                'originalPrice' => $product->compare_at_price,
                'stock' => $product->stock_qty,
                'inventory_quantity' => $product->stock_qty,
                'variant_count' => $product->variants?->count() ?? 0,
                'category' => [
                    'id' => $product->category?->id,
                    'name' => $product->category?->name,
                ],
            ];
        });

        return $this->sendSuccess([
            'data' => $transformed->toArray(),
            'total' => $products->total(),
            'last_page' => $products->lastPage(),
            'current_page' => $products->currentPage(),
            'per_page' => $products->perPage(),
        ]);
    }

    /**
     * Get search suggestions (autocomplete)
     * GET /api/v1/public/search/suggestions?q={query}
     */
    public function suggestions(Request $request)
    {
        $query = $request->input('q');

        if (!$query || strlen($query) < 2) {
            return $this->sendSuccess(['suggestions' => []]);
        }

        $products = Product::where('is_active', true)
            ->where('name', 'like', "{$query}%")
            ->limit(10)
            ->get(['id', 'name', 'name_bn', 'slug']);

        return $this->sendSuccess([
            'suggestions' => $products->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'name_bn' => $product->name_bn,
                    'slug' => $product->slug,
                ];
            }),
        ]);
    }
}
