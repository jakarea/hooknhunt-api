<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    /**
     * List published products (retail channel only).
     * GET /api/v2/store/products
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand', 'thumbnail'])
            ->where('status', 'published')
            ->whereHas('variants', fn($q) => $q->where('channel', 'retail')->where('is_active', true));

        $this->applyFilters($query, $request);
        $this->applySorting($query, $request);

        $perPage = $request->input('per_page', 20);
        $products = $query->paginate($perPage);

        $products->getCollection()->transform(fn($product) => $this->transformProduct($product));

        return $this->sendSuccess($products);
    }

    /**
     * Get a single published product by slug (retail only).
     * GET /api/v2/store/products/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $product = Product::with(['category', 'brand', 'thumbnail'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        return $this->sendSuccess($this->transformProduct($product));
    }

    /**
     * Get featured/published products for homepage (retail only).
     * GET /api/v2/store/products/featured
     */
    public function featured(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 12);

        $products = Product::with(['category', 'brand', 'thumbnail'])
            ->where('status', 'published')
            ->whereHas('variants', fn($q) => $q->where('channel', 'retail')->where('is_active', true))
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        $products->transform(fn($product) => $this->transformProduct($product));

        return $this->sendSuccess($products);
    }

    /**
     * Get products with the biggest discounts (retail only).
     * Sorted by highest discount amount (price - offer_price).
     * GET /api/v2/store/products/hot-deals
     */
    public function hotDeals(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 12);

        $products = Product::with(['category', 'brand', 'thumbnail'])
            ->where('status', 'published')
            ->whereHas('variants', fn($q) => $q
                ->where('channel', 'retail')
                ->where('is_active', true)
                ->where('offer_price', '>', 0)
                ->whereColumn('offer_price', '<', 'price')
            )
            ->limit($limit)
            ->get()
            ->sortByDesc(fn($product) => $this->getMaxDiscount($product))
            ->values();

        $products->transform(fn($product) => $this->transformProduct($product));

        return $this->sendSuccess($products);
    }

    /**
     * Get the highest discount amount across retail variants.
     */
    private function getMaxDiscount(Product $product): float
    {
        if (!$product->relationLoaded('variants')) {
            $product->load(['variants' => fn($q) => $q->where('channel', 'retail')->where('is_active', true)]);
        }

        return $product->variants
            ->filter(fn($v) => $v->offer_price > 0 && $v->offer_price < $v->price)
            ->map(fn($v) => (float) $v->price - (float) $v->offer_price)
            ->max() ?? 0;
    }

    /**
     * Get related products in the same category (retail only).
     * GET /api/v2/store/products/{slug}/related
     */
    public function related(string $slug, Request $request): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $limit = $request->input('limit', 8);

        $related = Product::with(['category', 'brand', 'thumbnail'])
            ->where('status', 'published')
            ->where('id', '!=', $product->id)
            ->where('category_id', $product->category_id)
            ->whereHas('variants', fn($q) => $q->where('channel', 'retail')->where('is_active', true))
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        $related->transform(fn($p) => $this->transformProduct($p));

        return $this->sendSuccess($related);
    }

    /**
     * Get products by category slug (retail only).
     * GET /api/v2/store/categories/{categorySlug}/products
     */
    public function byCategory(string $categorySlug, Request $request): JsonResponse
    {
        $category = Category::where('slug', $categorySlug)->firstOrFail();

        $query = Product::with(['category', 'brand', 'thumbnail'])
            ->where('status', 'published')
            ->where('category_id', $category->id)
            ->whereHas('variants', fn($q) => $q->where('channel', 'retail')->where('is_active', true));

        $this->applyFilters($query, $request);
        $this->applySorting($query, $request);

        $perPage = $request->input('per_page', 20);
        $products = $query->paginate($perPage);

        $products->getCollection()->transform(fn($product) => $this->transformProduct($product));

        return $this->sendSuccess($products);
    }

    // -------------------------------------------------------
    // Private helpers — pure transforms, no side effects
    // -------------------------------------------------------

    /**
     * Transform a product for storefront consumption.
     *
     * - Uses retail_name as the public-facing name (falls back to name)
     * - Loads only retail-channel variants
     * - Strips internal fields (purchase_cost, moq, wholesale_name, etc.)
     */
    private function transformProduct(Product $product): array
    {
        // Lazy-load retail variants only if not already loaded
        if (!$product->relationLoaded('variants')) {
            $product->load(['variants' => fn($q) => $q->where('channel', 'retail')->where('is_active', true)]);
        } else {
            // Filter already-loaded variants to retail + active
            $product->setRelation(
                'variants',
                $product->variants->filter(
                    fn($v) => $v->channel === 'retail' && $v->is_active
                )->values()
            );
        }

        return [
            'id'               => $product->id,
            'name'             => $product->retail_name ?? $product->name,
            'slug'             => $product->slug,
            'description'      => $product->description,
            'shortDescription' => $product->short_description,
            'highlights'       => $product->highlights,
            'includesInBox'    => $product->includes_in_box,
            'videoUrl'         => $product->video_url,
            'warrantyEnabled'  => $product->warranty_enabled,
            'warrantyDetails'  => $product->warranty_details,
            'seoTitle'         => $product->seo_title,
            'seoDescription'   => $product->seo_description,
            'seoTags'          => $product->seo_tags,
            'thumbnail'        => $this->transformMedia($product->thumbnail),
            'galleryImages'    => collect($product->gallery_images_urls)->map(fn($url) => ['fullUrl' => $url])->values()->toArray(),
            'category'         => $this->transformCategory($product->category),
            'brand'            => $product->brand ? [
                'id'   => $product->brand->id,
                'name' => $product->brand->name,
            ] : null,
            'variants'         => $product->variants->map(fn($v) => $this->transformVariant($v))->values()->toArray(),
        ];
    }

    /**
     * Transform a single variant — retail-safe fields only.
     */
    private function transformVariant($variant): array
    {
        return [
            'id'            => $variant->id,
            'variantName'   => $variant->variant_name,
            'variantSlug'   => $variant->variant_slug,
            'sku'           => $variant->sku,
            'price'         => (float) $variant->price,
            'offerPrice'    => (float) $variant->offer_price,
            'offerStarts'   => $variant->offer_starts,
            'offerEnds'     => $variant->offer_ends,
            'stock'         => (int) $variant->stock,
            'weight'        => $variant->weight,
            'size'          => $variant->size,
            'color'         => $variant->color,
            'isActive'      => (bool) $variant->is_active,
        ];
    }

    /**
     * Transform a media file for public URL.
     */
    private function transformMedia($media): ?array
    {
        if (!$media) {
            return null;
        }

        return [
            'id'       => $media->id,
            'fullUrl'  => $media->full_url,
            'alt'      => $media->original_filename,
        ];
    }

    /**
     * Transform a category for storefront.
     */
    private function transformCategory($category): ?array
    {
        if (!$category) {
            return null;
        }

        return [
            'id'   => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
        ];
    }

    /**
     * Apply query filters (search, category, brand).
     */
    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('retail_name', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhereHas('variants', fn($vq) => $vq->where('sku', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }
    }

    /**
     * Apply sorting to query.
     */
    private function applySorting($query, Request $request): void
    {
        $sortBy = $request->input('sort_by', 'created_at_desc');

        match ($sortBy) {
            'created_at_asc'  => $query->orderBy('created_at', 'asc'),
            'price_asc'       => $query->select('products.*')
                ->leftJoin('product_variants', function ($join) {
                    $join->on('products.id', '=', 'product_variants.product_id')
                         ->where('product_variants.channel', '=', 'retail');
                })
                ->groupBy('products.id')
                ->orderByRaw('MIN(product_variants.price) ASC'),
            'price_desc'      => $query->select('products.*')
                ->leftJoin('product_variants', function ($join) {
                    $join->on('products.id', '=', 'product_variants.product_id')
                         ->where('product_variants.channel', '=', 'retail');
                })
                ->groupBy('products.id')
                ->orderByRaw('MAX(product_variants.price) DESC'),
            default           => $query->orderBy('created_at', 'desc'),
        };
    }
}
