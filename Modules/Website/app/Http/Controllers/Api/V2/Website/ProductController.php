<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;


use App\Http\Controllers\Controller;
use App\Modules\Website\Traits\ApiResponse; // Website module independent
use App\Traits\ImageHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    use ApiResponse, ImageHelper;

    /**
     * List published products (retail channel only).
     * GET /api/v2/store/products
     *
     * OPTIMIZED: Returns ONLY what ProductCard needs - nothing more, nothing less
     */
    public function index(Request $request): JsonResponse
    {
        // Build query with direct SQL - only select what's needed
        // Use COALESCE to check both catalog_product_images and media_files
        $query = DB::table('products as p')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id'); // Only join media_files if catalog_product_images not found
            })
            ->where('p.status', 'published')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.retail_name_bn',
                'p.slug',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'p.created_at',
            ]);

        // Apply filters
        if ($request->search) {
            $query->where('p.name', 'like', "%{$request->search}%");
        }
        if ($request->category_id) {
            $query->where('p.category_id', $request->category_id);
        }
        if ($request->brand_id) {
            $query->where('p.brand_id', $request->brand_id);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at_desc');
        switch ($sortBy) {
            case 'created_at_desc':
                $query->orderBy('p.created_at', 'desc');
                break;
            case 'created_at_asc':
                $query->orderBy('p.created_at', 'asc');
                break;
            case 'name_asc':
                $query->orderBy('p.name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('p.name', 'desc');
                break;
            default:
                $query->orderBy('p.created_at', 'desc');
        }

        // Pagination
        $perPage = min((int)($request->input('per_page', 20)), 100);
        $page = $request->input('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->count();
        $products = $query->offset($offset)->limit($perPage)->get();

        // Get all variant data in one query for performance
        $productIds = $products->pluck('id')->toArray();
        $allVariants = DB::table('product_variants')
            ->whereIn('product_id', $productIds)
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->select('product_id', 'id', 'variant_name', 'variant_slug', 'sku', 'price', 'offer_price', 'stock', 'weight', 'size', 'color')
            ->get()
            ->groupBy('product_id');

        // Transform to array - OPTIMIZED for ProductCard only
        // Removed: variants array, thumbnail object, galleryImages, category, brand, descriptions
        $transformed = $products->map(function ($product) use ($allVariants) {
            // Build standardized image URL
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            // Get all variants for this product
            $variants = $allVariants->get($product->id, collect());
            $variantCount = $variants->count();

            // Calculate price from first variant
            $firstVariant = $variants->first();
            $price = 0;
            $originalPrice = 0;
            $stock = 0;

            if ($firstVariant) {
                $price = ($firstVariant->offer_price > 0) ? (float) $firstVariant->offer_price : (float) $firstVariant->price;
                $originalPrice = (float) $firstVariant->price;
                $stock = (int) $variants->sum('stock');
            }

            return [
                // Core fields - ProductCard needs these
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'retailName' => $product->retail_name ?? $product->name,
                'title' => $product->retail_name ?? $product->name,
                'nameBn' => $product->retail_name_bn ?? $product->name,

                // Images - standardized format
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],

                // Pricing - ProductCard needs these
                'price' => $price,
                'actual_price' => $price,
                'originalPrice' => $originalPrice,
                'compare_at_price' => $originalPrice,

                // Stock - ProductCard needs these
                'stock' => $stock,
                'inventory_quantity' => $stock,

                // Variant count - ProductCard needs this
                'variant_count' => $variantCount,
            ];
        });

        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = (int) $page;

        // Return response with correct structure for frontend
        // Frontend expects: response.data = { data: [...], total: ..., last_page: ..., current_page: ..., next_page_url: ... }
        return response()->json([
            'status' => true,
            'message' => 'Success',
            'data' => [
                'data' => $transformed,
                'total' => $total,
                'last_page' => $lastPage,
                'current_page' => $currentPage,
                'next_page_url' => ($currentPage < $lastPage) ? url()->current() . '?' . http_build_query(['page' => $currentPage + 1, 'per_page' => $perPage]) : null,
            ],
            'errors' => null,
        ]);
    }

    /**
     * Get a single published product by slug (retail only).
     * GET /api/v2/store/products/{slug}
     *
     * DIRECT SQL - Memory optimized to prevent crashes
     */
    public function show(string $slug): JsonResponse
    {
        // Use direct SQL to avoid model serialization overhead
        // Use COALESCE to check both catalog_product_images and media_files
        $product = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id'); // Only join media_files if catalog_product_images not found
            })
            ->where('p.slug', $slug)
            ->where('p.status', 'published')
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.wholesale_name',
                'p.retail_name_bn',
                'p.wholesale_name_bn',
                'p.slug',
                'p.product_code',
                'p.status',
                'p.category_id',
                'p.brand_id',
                'p.thumbnail_id',
                'p.gallery_images',
                'p.description',
                'p.description_bn',
                'p.highlights',
                'p.highlights_bn',
                'p.attributes',
                'p.attributes_bn',
                'p.includes_in_box',
                'p.includes_in_box_bn',
                'p.video_url',
                'p.warranty_enabled',
                'p.warranty_details',
                'p.seo_title',
                'p.seo_description',
                'p.seo_tags',
                'p.thank_you',
                'p.cross_sale',
                'p.up_sale',
                'c.id as category_id',
                'c.name as category_name',
                'c.slug as category_slug',
                'b.id as brand_id',
                'b.name as brand_name',
                'b.slug as brand_slug',
                DB::raw('COALESCE(cp.id, mf.id) as thumbnail_join_id'),
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                DB::raw('COALESCE(cp.disk, mf.disk) as thumbnail_disk'),
                DB::raw('COALESCE(cp.original_filename, mf.original_filename) as original_filename'),
            ])
            ->first();

        if (!$product) {
            return $this->sendError('Product not found', [], 404);
        }

        // Load retail variants using direct SQL
        $variants = DB::table('product_variants')
            ->where('product_id', $product->id)
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->select([
                'id',
                'product_id',
                'variant_name',
                'variant_slug',
                'sku',
                'stock',
                'price',
                'offer_price',
                'offer_starts',
                'offer_ends',
                'weight',
                'size',
                'color',
                'thumbnail',
            ])
            ->get();

        // Build standardized thumbnail URL
        $imageData = $this->formatProductImage(
            $product->thumbnail_id,
            $product->thumbnail_path,
            $product->thumbnail_url
        );
        $thumbnailUrl = $imageData['image_url'];

        // Parse JSON fields
        $galleryImages = $product->gallery_images;
        if (is_string($galleryImages)) {
            $galleryImages = json_decode($galleryImages, true) ?? [];
        }

        $highlights = $product->highlights;
        if (is_string($highlights)) {
            $highlights = json_decode($highlights, true) ?? [];
        }

        $highlightsBn = $product->highlights_bn;
        if (is_string($highlightsBn)) {
            $highlightsBn = json_decode($highlightsBn, true) ?? [];
        }

        $attributes = $product->attributes;
        if (is_string($attributes)) {
            $attributes = json_decode($attributes, true) ?? [];
        }

        $attributesBn = $product->attributes_bn;
        if (is_string($attributesBn)) {
            $attributesBn = json_decode($attributesBn, true) ?? [];
        }

        $includesInBox = $product->includes_in_box;
        if (is_string($includesInBox)) {
            $includesInBox = json_decode($includesInBox, true) ?? [];
        }

        $includesInBoxBn = $product->includes_in_box_bn;
        if (is_string($includesInBoxBn)) {
            $includesInBoxBn = json_decode($includesInBoxBn, true) ?? [];
        }

        $seoTags = $product->seo_tags;
        if (is_string($seoTags)) {
            $seoTags = json_decode($seoTags, true) ?? [];
        }

        // Get gallery image URLs
        $galleryUrls = $this->getGalleryImagesUrlsDirect($galleryImages);

        // Get first variant for price calculation
        $firstVariant = $variants->first();
        $price = 0;
        $originalPrice = 0;
        if ($firstVariant) {
            $price = ($firstVariant->offer_price > 0) ? (float) $firstVariant->offer_price : (float) $firstVariant->price;
            $originalPrice = (float) $firstVariant->price;
        }

        $stock = (int) $variants->sum('stock');

        // Build response array directly - NO MODEL OVERHEAD
        $response = [
            'id' => $product->id,
            'name' => $product->name,
            'retailName' => $product->retail_name ?? $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'shortDescription' => null,
            'highlights' => $highlights ?: [],
            'attributes' => $attributes ?: [],
            'includesInBox' => $includesInBox ?: [],
            // Bangla fields
            'nameBn' => $product->retail_name_bn ?? $product->name,
            'descriptionBn' => $product->description_bn,
            'highlightsBn' => $highlightsBn ?: [],
            'attributesBn' => $attributesBn ?: [],
            'includesInBoxBn' => $includesInBoxBn ?: [],
            // Common fields
            'videoUrl' => $product->video_url,
            'warrantyEnabled' => (bool) $product->warranty_enabled,
            'warrantyDetails' => $product->warranty_details,
            'seoTitle' => $product->seo_title,
            'seoDescription' => $product->seo_description,
            'seoTags' => $seoTags ?: [],
            // Image fields - standardized format (camelCase to match catalog API)
            'imageUrl' => $thumbnailUrl,
            'image_id' => $imageData['image_id'],
            'galleryImages' => collect($galleryUrls)->map(fn($url) => ['imageUrl' => $url])->values()->toArray(),
            // Price fields
            'price' => $price,
            'actual_price' => $price,
            'originalPrice' => $originalPrice,
            'compare_at_price' => $originalPrice,
            // Stock fields
            'stock' => $stock,
            'inventory_quantity' => $stock,
            'variant_count' => $variants->count(),
            // Relations
            'category' => $product->category_id ? [
                'id' => $product->category_id,
                'name' => $product->category_name,
                'slug' => $product->category_slug,
            ] : null,
            'brand' => $product->brand_id ? [
                'id' => $product->brand_id,
                'name' => $product->brand_name,
            ] : null,
            'variants' => $variants->map(fn($v) => [
                'id' => $v->id,
                'variantName' => $v->variant_name,
                'variantSlug' => $v->variant_slug,
                'sku' => $v->sku,
                'price' => (float) $v->price,
                'offerPrice' => (float) $v->offer_price,
                'offerStarts' => $v->offer_starts,
                'offerEnds' => $v->offer_ends,
                'stock' => (int) $v->stock,
                'weight' => $v->weight,
                'size' => $v->size,
                'color' => $v->color,
                'isActive' => true,
                'image_url' => $this->formatVariantThumbnail($v->thumbnail, $thumbnailUrl),
            ])->values()->toArray(),
            'crossSaleProducts' => [],
            'upSaleProducts' => [],
            'isThankYou' => (bool) $product->thank_you,
        ];

        // Clear references
        unset($variants, $product);

        return $this->sendSuccess($response);
    }

    /**
     * Get featured/published products for homepage (retail only).
     * GET /api/v2/store/products/featured
     *
     * DIRECT SQL - Memory optimized
     */
    public function featured(Request $request): JsonResponse
    {
        $limit = min((int) $request->input('limit', 12), 100);

        $products = DB::table('products as p')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->orderBy('p.created_at', 'desc')
            ->limit($limit)
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.retail_name_bn',
                'p.slug',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'p.created_at',
            ])
            ->get();

        // Get all variant data
        $productIds = $products->pluck('id')->toArray();
        $allVariants = DB::table('product_variants')
            ->whereIn('product_id', $productIds)
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->select('product_id', 'id', 'variant_name', 'variant_slug', 'sku', 'price', 'offer_price', 'stock', 'weight', 'size', 'color')
            ->get()
            ->groupBy('product_id');

        // Transform to array - OPTIMIZED for ProductCard only
        // Removed: variants array, thumbnail object, galleryImages, category, brand, descriptions
        $transformed = $products->map(function ($product) use ($allVariants) {
            // Build standardized image URL
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            $variants = $allVariants->get($product->id, collect());
            $firstVariant = $variants->first();
            $price = 0;
            $originalPrice = 0;
            $stock = 0;

            if ($firstVariant) {
                $price = ($firstVariant->offer_price > 0) ? (float) $firstVariant->offer_price : (float) $firstVariant->price;
                $originalPrice = (float) $firstVariant->price;
                $stock = (int) $variants->sum('stock');
            }

            return [
                // Core fields - ProductCard needs these
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'retailName' => $product->retail_name ?? $product->name,
                'title' => $product->retail_name ?? $product->name,
                'nameBn' => $product->retail_name_bn ?? $product->name,
                // Images - standardized format
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],
                // Pricing - ProductCard needs these
                'price' => $price,
                'actual_price' => $price,
                'originalPrice' => $originalPrice,
                'compare_at_price' => $originalPrice,
                // Stock - ProductCard needs these
                'stock' => $stock,
                'inventory_quantity' => $stock,
                // Variant count - ProductCard needs this
                'variant_count' => $variants->count(),
            ];
        });

        return $this->sendSuccess($transformed);
    }

    /**
     * Get products with the biggest discounts (retail only).
     * GET /api/v2/store/products/hot-deals
     *
     * DIRECT SQL - Memory optimized
     */
    public function hotDeals(Request $request): JsonResponse
    {
        $limit = min((int) $request->input('limit', 12), 100);

        $products = DB::table('products as p')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->where('offer_price', '>', 0)
                    ->whereColumn('offer_price', '<', 'price')
                    ->limit(1);
            })
            ->orderBy('p.created_at', 'desc')
            ->limit($limit)
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.retail_name_bn',
                'p.slug',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'p.created_at',
            ])
            ->get();

        // Get all variant data
        $productIds = $products->pluck('id')->toArray();
        $allVariants = DB::table('product_variants')
            ->whereIn('product_id', $productIds)
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->select('product_id', 'id', 'variant_name', 'variant_slug', 'sku', 'price', 'offer_price', 'stock', 'weight', 'size', 'color')
            ->get()
            ->groupBy('product_id');

        // Transform to array - OPTIMIZED for ProductCard only
        // Removed: variants array, thumbnail object, galleryImages, category, brand, descriptions
        $transformed = $products->map(function ($product) use ($allVariants) {
            // Build standardized image URL
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            $variants = $allVariants->get($product->id, collect());
            $firstVariant = $variants->first();
            $price = 0;
            $originalPrice = 0;
            $stock = 0;

            if ($firstVariant) {
                $price = ($firstVariant->offer_price > 0) ? (float) $firstVariant->offer_price : (float) $firstVariant->price;
                $originalPrice = (float) $firstVariant->price;
                $stock = (int) $variants->sum('stock');
            }

            return [
                // Core fields - ProductCard needs these
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'retailName' => $product->retail_name ?? $product->name,
                'title' => $product->retail_name ?? $product->name,
                'nameBn' => $product->retail_name_bn ?? $product->name,
                // Images - standardized format
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],
                // Pricing - ProductCard needs these
                'price' => $price,
                'actual_price' => $price,
                'originalPrice' => $originalPrice,
                'compare_at_price' => $originalPrice,
                // Stock - ProductCard needs these
                'stock' => $stock,
                'inventory_quantity' => $stock,
                // Variant count - ProductCard needs this
                'variant_count' => $variants->count(),
            ];
        });

        return $this->sendSuccess($transformed);
    }

    /**
     * Get cross-sale products for cart page.
     * GET /api/v2/store/cross-sale-products
     *
     * DIRECT SQL - Memory optimized
     */
    public function crossSaleForCart(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cross_sale_ids' => 'required|string',
            'cart_ids'       => 'nullable|string',
        ]);

        $crossSaleIds = array_map('intval', explode(',', $validated['cross_sale_ids']));
        $cartIds = array_map('intval', explode(',', $validated['cart_ids'] ?? ''));

        // Remove cart items from cross-sale suggestions
        $uniqueIds = array_values(array_unique(array_diff($crossSaleIds, $cartIds)));

        if (empty($uniqueIds)) {
            return $this->sendSuccess([]);
        }

        $products = DB::table('products as p')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->whereIn('p.id', $uniqueIds)
            ->where('p.status', 'published')
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.slug',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
            ])
            ->get()
            ->sortBy(fn($p) => array_search($p->id, $uniqueIds))
            ->values();

        $transformed = $products->map(function ($product) {
            $thumbnailUrl = null;
            if ($product->thumbnail_id) {
                $thumbnailUrl = $product->thumbnail_url;
                if (empty($thumbnailUrl) || !str_starts_with($thumbnailUrl, 'http')) {
                    $thumbnailUrl = url($product->thumbnail_path ?? '');
                }
            }

            return [
                'id' => $product->id,
                'title' => $product->retail_name ?? $product->name,
                'slug' => $product->slug,
                'name' => $product->retail_name ?? $product->name,
                'image' => $thumbnailUrl,
                'featured_image' => $thumbnailUrl,
                'thumbnail' => $thumbnailUrl ? [
                    'id' => $product->thumbnail_id,
                    'fullUrl' => $thumbnailUrl,
                ] : null,
            ];
        });

        return $this->sendSuccess($transformed);
    }

    /**
     * Get products marked as thank-you products (retail only).
     * GET /api/v2/store/products/thank-you
     *
     * DIRECT SQL - Memory optimized
     */
    public function thankYouProducts(Request $request): JsonResponse
    {
        $limit = min((int) $request->input('limit', 12), 100);

        $products = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->where('p.thank_you', true)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->orderBy('p.created_at', 'desc')
            ->limit($limit)
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.slug',
                'p.status',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'cp.original_filename',
                'c.id as category_id',
                'c.name as category_name',
                'c.slug as category_slug',
                'b.id as brand_id',
                'b.name as brand_name',
            ])
            ->get();

        $transformed = $products->map(function ($product) {
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            return [
                'id' => $product->id,
                'name' => $product->retail_name ?? $product->name,
                'slug' => $product->slug,
                'shortDescription' => null,
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],
                'category' => $product->category_id ? [
                    'id' => $product->category_id,
                    'name' => $product->category_name,
                    'slug' => $product->category_slug,
                ] : null,
                'brand' => $product->brand_id ? [
                    'id' => $product->brand_id,
                    'name' => $product->brand_name,
                ] : null,
            ];
        });

        return $this->sendSuccess($transformed);
    }

    /**
     * Get related products in the same category (retail only).
     * GET /api/v2/store/products/{slug}/related
     *
     * DIRECT SQL - Memory optimized
     */
    public function related(string $slug, Request $request): JsonResponse
    {
        // First get the product to find its category
        $product = DB::table('products')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->select('id', 'category_id')
            ->first();

        if (!$product) {
            return $this->sendError('Product not found', [], 404);
        }

        $limit = min((int) $request->input('limit', 8), 100);

        $related = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->where('p.id', '!=', $product->id)
            ->where('p.category_id', $product->category_id)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->orderBy('p.created_at', 'desc')
            ->limit($limit)
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.slug',
                'p.status',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'cp.original_filename',
                'c.id as category_id',
                'c.name as category_name',
                'c.slug as category_slug',
                'b.id as brand_id',
                'b.name as brand_name',
            ])
            ->get();

        $transformed = $related->map(function ($product) {
            $thumbnailUrl = null;
            if ($product->thumbnail_id) {
                $thumbnailUrl = $product->thumbnail_url;
                if (empty($thumbnailUrl) || !str_starts_with($thumbnailUrl, 'http')) {
                    $thumbnailUrl = url($product->thumbnail_path ?? '');
                }
            }

            return [
                'id' => $product->id,
                'name' => $product->retail_name ?? $product->name,
                'slug' => $product->slug,
                'shortDescription' => null,
                'image' => $thumbnailUrl,
                'featured_image' => $thumbnailUrl,
                'thumbnail' => $thumbnailUrl ? [
                    'id' => $product->thumbnail_id,
                    'fullUrl' => $thumbnailUrl,
                    'alt' => $product->original_filename,
                ] : null,
                'category' => $product->category_id ? [
                    'id' => $product->category_id,
                    'name' => $product->category_name,
                    'slug' => $product->category_slug,
                ] : null,
                'brand' => $product->brand_id ? [
                    'id' => $product->brand_id,
                    'name' => $product->brand_name,
                ] : null,
            ];
        });

        return $this->sendSuccess($transformed);
    }

    /**
     * Transform a media file for public URL.
     * NOTE: Don't use $media->full_url accessor - it was removed to prevent memory issues
     */
    private function transformMedia($media): ?array
    {
        if (!$media) {
            return null;
        }

        // Build URL directly instead of using accessor
        $fullUrl = $media->url;
        if (empty($fullUrl) || !str_starts_with($fullUrl, 'http')) {
            $fullUrl = url($media->path ?? '');
        }

        return [
            'id'       => $media->id,
            'fullUrl'  => $fullUrl,
            'alt'      => $media->original_filename ?? '',
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
     * Search products with suggestions dropdown.
     * GET /api/v2/public/search/suggestions?q=query
     *
     * DIRECT SQL - Memory optimized
     */
    public function searchSuggestions(Request $request): JsonResponse
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        $query = $request->input('q');

        $products = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->where(function ($q) use ($query) {
                $q->where('p.name', 'like', "%{$query}%")
                  ->orWhere('p.retail_name', 'like', "%{$query}%")
                  ->orWhere('c.name', 'like', "%{$query}%");
            })
            ->limit(8)
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.slug',
                'p.thumbnail_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'c.name as category_name',
            ])
            ->get();

        $suggestions = $products->map(function ($product) {
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            return [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],
                'category' => $product->category_name,
            ];
        });

        return $this->sendSuccess(['suggestions' => $suggestions]);
    }

    /**
     * Search products with full results.
     * GET /api/v2/public/search?q=query&category_id=X&per_page=20
     *
     * DIRECT SQL - Memory optimized
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
            'category_id' => 'nullable|integer|exists:categories,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $searchQuery = $request->input('q');

        $query = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
            ->leftJoin('media_files as mf', function($join) {
                $join->on('p.thumbnail_id', '=', 'mf.id')
                     ->whereNull('cp.id');
            })
            ->where('p.status', 'published')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->where(function ($q) use ($searchQuery) {
                $q->where('p.name', 'like', "%{$searchQuery}%")
                  ->orWhere('p.retail_name', 'like', "%{$searchQuery}%")
                  ->orWhere('c.name', 'like', "%{$searchQuery}%");
            })
            ->select([
                'p.id',
                'p.name',
                'p.retail_name',
                'p.slug',
                'p.status',
                'p.thumbnail_id',
                'p.category_id',
                'p.brand_id',
                DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                'cp.original_filename',
                'c.id as category_id',
                'c.name as category_name',
                'c.slug as category_slug',
                'b.id as brand_id',
                'b.name as brand_name',
                'p.created_at',
            ]);

        // Filter by category if provided
        if ($request->filled('category_id')) {
            $query->where('p.category_id', $request->input('category_id'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at_desc');
        switch ($sortBy) {
            case 'created_at_desc':
                $query->orderBy('p.created_at', 'desc');
                break;
            case 'created_at_asc':
                $query->orderBy('p.created_at', 'asc');
                break;
            case 'name_asc':
                $query->orderBy('p.name', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('p.name', 'desc');
                break;
            default:
                $query->orderBy('p.created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 24), 100);
        $page = $request->input('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->count();
        $products = $query->offset($offset)->limit($perPage)->get();

        $transformed = $products->map(function ($product) {
            $imageData = $this->formatProductImage(
                $product->thumbnail_id,
                $product->thumbnail_path,
                $product->thumbnail_url
            );

            return [
                'id' => $product->id,
                'name' => $product->retail_name ?? $product->name,
                'slug' => $product->slug,
                'shortDescription' => null,
                'imageUrl' => $imageData['image_url'],
                'image_id' => $imageData['image_id'],
                'category' => $product->category_id ? [
                    'id' => $product->category_id,
                    'name' => $product->category_name,
                    'slug' => $product->category_slug,
                ] : null,
                'brand' => $product->brand_id ? [
                    'id' => $product->brand_id,
                    'name' => $product->brand_name,
                ] : null,
            ];
        });

        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = (int) $page;

        // Return response with correct structure for frontend
        return response()->json([
            'status' => true,
            'message' => 'Success',
            'data' => [
                'data' => $transformed,
                'total' => $total,
                'last_page' => $lastPage,
                'current_page' => $currentPage,
                'next_page_url' => ($currentPage < $lastPage) ? url()->current() . '?' . http_build_query(['page' => $currentPage + 1, 'per_page' => $perPage]) : null,
            ],
            'errors' => null,
        ]);
    }

    /**
     * Get categories for storefront homepage.
     * GET /api/v2/store/categories
     *
     * OPTIMIZED: Returns ONLY what frontend uses - nothing more
     */
    public function categories(): JsonResponse
    {
        try {
            $categories = DB::table('categories as c')
                ->leftJoin('media_files as m', 'c.image_id', '=', 'm.id')
                ->whereNull('c.parent_id')
                ->where('c.is_active', true)
                ->select([
                    'c.id',
                    'c.name',
                    'c.slug',
                    'c.image_id',
                    'm.url as image_url',
                ])
                ->orderBy('c.sort_order', 'asc')
                ->orderBy('c.name', 'asc')
                ->get();

            $transformed = $categories->map(function ($category) {
                $imageData = $this->formatCategoryImage(
                    $category->image_id,
                    $category->image_url,
                    null
                );

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'image_url' => $imageData['image_url'],
                    'image_id' => $imageData['image_id'],
                ];
            });

            return response()->json([
                'status' => true,
                'message' => 'Success',
                'data' => [
                    'data' => $transformed,
                    'total' => $transformed->count(),
                ],
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            // Log error for debugging
            \Log::error('Categories API Error: ' . $e->getMessage());

            return response()->json([
                'status' => false,
                'message' => 'Error fetching categories',
                'data' => [
                    'data' => [],
                    'total' => 0,
                ],
                'errors' => ['message' => $e->getMessage()],
            ], 500);
        }
    }
}
