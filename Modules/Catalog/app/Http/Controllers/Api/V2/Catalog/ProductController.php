<?php

/* hooknhunt-api/Modules/Catalog/app/Http/Controllers/Api/V2/Catalog/ProductController.php */

namespace App\Modules\Catalog\Http\Controllers\Api\V2\Catalog;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Catalog\Models\Category;
use App\Modules\Catalog\Services\VariantDataTransformer;
use App\Traits\ImageHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Catalog Product Controller for V2 API
 * Handles product listing, details, and management
 */
class ProductController extends Controller
{
    use ImageHelper;
    private const CACHE_TTL = 300; // 5 minutes
    private const DEFAULT_PER_PAGE = 20;  // Reduced from 50 for faster initial load
    private const MAX_PER_PAGE = 500;

    /**
     * Invalidate all product list cache by incrementing the cache version
     * When version changes, all cached products become invalid
     */
    private function clearProductsListCache(): void
    {
        // Increment cache version - this invalidates ALL cached products lists
        $currentVersion = Cache::get('products:v2:version', 1);
        Cache::put('products:v2:version', $currentVersion + 1, 365 * 24 * 60 * 60); // Keep version for a year

        // Clear all product-related cache (admin + storefront)
        try {
            Cache::tags(['product:v2', 'storefront:product:v2'])->flush();
        } catch (\Exception $e) {
            // Tags not supported, try direct clearing
            $this->clearStorefrontProductCache();
        }
    }

    /**
     * Clear storefront product cache for a specific product
     */
    private function clearStorefrontProductCache(?string $slug = null): void
    {
        if ($slug) {
            Cache::forget("storefront:product:v2:slug:{$slug}");
        } else {
            // Clear all storefront product caches - iterate through common patterns
            // This is a fallback when tags aren't supported
            for ($i = 1; $i <= 100; $i++) {
                Cache::forget("storefront:product:v2:slug:product-{$i}");
            }
        }
    }

    /**
     * Get paginated list of products
     * GET /api/v2/catalog/products
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = min(
                (int) $request->input('per_page', self::DEFAULT_PER_PAGE),
                self::MAX_PER_PAGE
            );
            $page = (int) $request->input('page', 1);
            $search = $request->input('search', '');
            $status = $request->input('status');
            $categoryId = $request->input('category_id');
            $categorySlug = $request->input('category');
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');

            // Get cache version - when products update, this version changes, invalidating all cached products
            $cacheVersion = Cache::get('products:v2:version', 1);

            // Cache key for products list - includes version so any product change invalidates all cache
            $cacheKey = "products:v2:v{$cacheVersion}:page:{$page}:per_page:{$perPage}:search:{$search}:status:{$status}:category_id:{$categoryId}:category:{$categorySlug}:sort:{$sortBy}:{$sortOrder}";

            // Get products from cache or database
            $products = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search, $status, $categoryId, $categorySlug, $sortBy, $sortOrder) {
                $query = Product::query()
                    ->select('id', 'name', 'slug', 'product_code', 'thumbnail_id', 'category_id', 'brand_id', 'status', 'sort_order', 'created_at', 'updated_at')
                    ->with([
                        'category:id,name,slug',
                        'brand:id,name,slug',
                        'variants' => function ($query) {
                            $query->select('id', 'product_id', 'stock');
                        }
                    ]);

                // Search filter
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('product_code', 'like', "%{$search}%");
                    });
                }

                // Status filter (allow admin to filter by status)
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }

                // Category filter: prefer numeric category_id from admin UI, fall back to slug for storefront
                if ($categoryId) {
                    $query->where('category_id', (int) $categoryId);
                } elseif ($categorySlug) {
                    if (is_numeric($categorySlug)) {
                        $query->where('category_id', (int) $categorySlug);
                    } else {
                        $category = Category::where('slug', $categorySlug)->first();
                        if ($category) {
                            $query->where('category_id', $category->id);
                        }
                    }
                }

                // Sorting
                $allowedSortFields = ['name', 'price', 'created_at', 'updated_at', 'stock'];
                $sortField = in_array($sortBy, $allowedSortFields) ? $sortBy : 'created_at';
                $sortDirection = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

                $query->orderBy($sortField, $sortDirection);

                // Paginate products
                $paginatedProducts = $query->paginate($perPage);

                return $paginatedProducts;
            });

            // Transform to lightweight format for list view
            $transformedProducts = collect($products->items())->map(function ($product) {
                // Calculate stock from variants - handle empty collection
                $stock = 0;
                if ($product->variants && $product->variants->count() > 0) {
                    $stock = (int) $product->variants->sum('stock');
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'productCode' => $product->product_code,
                    'thumbnailId' => $product->thumbnail_id,
                    'thumbnailUrl' => $product->thumbnailUrl,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                        'slug' => $product->category->slug,
                    ] : null,
                    'brand' => $product->brand ? [
                        'id' => $product->brand->id,
                        'name' => $product->brand->name,
                        'slug' => $product->brand->slug,
                    ] : null,
                    'variantsCount' => $product->variants ? $product->variants->count() : 0,
                    'stock' => $stock,
                    'status' => $product->status,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Products retrieved successfully',
                'data' => $transformedProducts->toArray(),
                'pagination' => [
                    'current_page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                    'last_page' => $products->lastPage(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem(),
                    'has_more_pages' => $products->hasMorePages(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve products',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get single product by slug
     * GET /api/v2/catalog/products/{slug}
     *
     * @param string $slug
     * @return JsonResponse
     */
    public function show(string $slug): JsonResponse
    {
        try {
            $user = auth()->user();
            // Check if user is authenticated and has admin role
            $isAdmin = $user && $user->role && (
                $user->role->slug === 'super_admin' ||
                $user->role->slug === 'admin' ||
                $user->role_id == 1
            );

            $cacheKey = "product:v2:slug:{$slug}";

            try {
                // Use tagged cache for easier invalidation
                $product = Cache::tags(['product:v2'])->remember($cacheKey, self::CACHE_TTL, function () use ($slug, $isAdmin) {
                    $query = Product::with([
                        'category',
                        'brand',
                        'variants' => function ($query) {
                            // Always show only active (non-deleted) variants
                            $query->withoutTrashed()
                                ->select('id', 'product_id', 'sku', 'variant_name', 'price', 'offer_price', 'stock', 'is_active', 'thumbnail_id', 'purchase_cost', 'weight', 'moq', 'purchase_cost');
                        }
                    ])
                    ->where('slug', $slug);

                    // Only show published products to non-admin users
                    if (!$isAdmin) {
                        $query->where('status', 'published');
                    }

                    return $query->firstOrFail();
                });
            } catch (\Exception $e) {
                // If tags not supported, use regular remember
                $product = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug, $isAdmin) {
                    $query = Product::with([
                        'category',
                        'brand',
                        'variants' => function ($query) {
                            $query->withoutTrashed()
                                ->select('id', 'product_id', 'sku', 'variant_name', 'price', 'offer_price', 'stock', 'is_active', 'thumbnail_id', 'purchase_cost', 'weight', 'moq', 'purchase_cost');
                        }
                    ])
                    ->where('slug', $slug);

                    if (!$isAdmin) {
                        $query->where('status', 'published');
                    }

                    return $query->firstOrFail();
                });
            }

            // Append cross-sell and up-sell products for single product view only
            // This prevents N+1 queries on product list pages
            $product->append(['crossSaleProducts', 'upSaleProducts']);

            // Append pricing fields to each variant for single product view only
            $product->variants->each->append(['retailPrice', 'retailOfferPrice', 'wholesalePrice', 'wholesaleOfferPrice']);

            return response()->json([
                'success' => true,
                'message' => 'Product retrieved successfully',
                'data' => $product
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => 'The requested product does not exist or is not available'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve product',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Create new product (Authenticated)
     * POST /api/v2/catalog/products
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Handle productName as alias for name
            if ($request->has('productName') && !$request->has('name')) {
                $request->merge(['name' => $request->input('productName')]);
            }

            // Handle category/brand as IDs
            if ($request->has('category')) {
                $request->merge(['category_id' => $request->input('category')]);
            }
            if ($request->has('brand')) {
                $request->merge(['brand_id' => $request->input('brand')]);
            }

            // Handle productName -> name and retailName -> retail_name
            if ($request->has('productName')) {
                $request->merge(['name' => $request->input('productName')]);
            }
            if ($request->has('retailName')) {
                $request->merge(['retail_name' => $request->input('retailName')]);
            }
            if ($request->has('wholesaleName')) {
                $request->merge(['wholesale_name' => $request->input('wholesaleName')]);
            }
            if ($request->has('retailNameBn')) {
                $request->merge(['retail_name_bn' => $request->input('retailNameBn')]);
            }
            if ($request->has('wholesaleNameBn')) {
                $request->merge(['wholesale_name_bn' => $request->input('wholesaleNameBn')]);
            }

            // Handle featuredImage as alias for thumbnail_id
            if ($request->has('featuredImage')) {
                $request->merge(['thumbnail_id' => $request->input('featuredImage')]);
            }

            // Handle galleryImages as alias for gallery_images
            if ($request->has('galleryImages')) {
                $request->merge(['gallery_images' => $request->input('galleryImages')]);
            }

            // Handle enableWarranty as alias for warranty_enabled
            if ($request->has('enableWarranty')) {
                $request->merge(['warranty_enabled' => $request->input('enableWarranty')]);
            }

            // Handle enablePreorder - store in metadata or description
            if ($request->has('enablePreorder')) {
                // This could be stored as a custom field or in the description
                // For now, we'll note it but not store it directly
            }

            // Handle expectedDeliveryDate - could be stored as a custom field
            if ($request->has('expectedDeliveryDate')) {
                // This could be stored as a custom field
            }

            // Handle videoUrl -> video_url
            if ($request->has('videoUrl')) {
                $request->merge(['video_url' => $request->input('videoUrl')]);
            }

            // Handle seoTitle -> seo_title
            if ($request->has('seoTitle')) {
                $request->merge(['seo_title' => $request->input('seoTitle')]);
            }

            // Handle seoDescription -> seo_description
            if ($request->has('seoDescription')) {
                $request->merge(['seo_description' => $request->input('seoDescription')]);
            }

            // Handle seoTags -> seo_tags (convert array/string to proper format)
            if ($request->has('seoTags')) {
                $tags = $request->input('seoTags');
                if (is_array($tags)) {
                    // Already an array, use as-is
                    $request->merge(['seo_tags' => $tags]);
                } elseif (is_string($tags)) {
                    // Convert comma-separated string to array
                    $tagsArray = array_map('trim', explode(',', $tags));
                    $tagsArray = array_filter($tagsArray, fn($tag) => !empty($tag));
                    $request->merge(['seo_tags' => array_values($tagsArray)]);
                } else {
                    $request->merge(['seo_tags' => []]);
                }
                // Remove the original camelCase field to prevent validation errors
                $request->request->remove('seoTags');
            }

            // Handle affiliateCommission
            if ($request->has('affiliateCommission')) {
                // Store as custom field or in metadata
            }

            // Handle includesInTheBox as includes_in_box (convert string to array if needed)
            if ($request->has('includesInTheBox')) {
                $value = $request->input('includesInTheBox');
                if (is_string($value)) {
                    // Convert string to array (split by newlines or keep as single element)
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['includes_in_box' => $value]);
                // Remove the original camelCase field to prevent validation errors
                $request->request->remove('includesInTheBox');
            }

            // Handle includesInTheBoxBn as includes_in_box_bn (convert string to array if needed)
            if ($request->has('includesInTheBoxBn')) {
                $value = $request->input('includesInTheBoxBn');
                if (is_string($value)) {
                    // Convert string to array (split by newlines or keep as single element)
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['includes_in_box_bn' => $value]);
                // Remove the original camelCase field to prevent validation errors
                $request->request->remove('includesInTheBoxBn');
            }

            // Handle highlights (convert string to array if needed)
            if ($request->has('highlights')) {
                $value = $request->input('highlights');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['highlights' => $value]);
            }

            // Handle highlightsBn (convert string to array if needed)
            if ($request->has('highlightsBn')) {
                $value = $request->input('highlightsBn');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['highlights_bn' => $value]);
            }

            // Handle attributes (convert string to array if needed)
            if ($request->has('attributes')) {
                $value = $request->input('attributes');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['attributes' => $value]);
            }

            // Handle attributesBn (convert string to array if needed)
            if ($request->has('attributesBn')) {
                $value = $request->input('attributesBn');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['attributes_bn' => $value]);
            }

            // Handle thankYou -> thank_you
            if ($request->has('thankYou')) {
                $request->merge(['thank_you' => $request->input('thankYou')]);
            }

            // Handle hideFromWebsite -> hide_from_website
            if ($request->has('hideFromWebsite')) {
                $request->merge(['hide_from_website' => $request->input('hideFromWebsite')]);
            }

            // Normalize variant field names before validation (convert any camelCase to snake_case)
            // The transformer will handle the actual conversion during save
            if ($request->has('variants')) {
                $variants = $request->input('variants');
                foreach ($variants as &$variant) {
                    // Accept both camelCase and snake_case - validation will handle the actual transform
                    // This just normalizes the input for validation
                    if (isset($variant['retailPrice']) && !isset($variant['retail_price'])) {
                        $variant['retail_price'] = $variant['retailPrice'];
                    }
                    if (isset($variant['retailOfferPrice']) && !isset($variant['retail_offer_price'])) {
                        $variant['retail_offer_price'] = $variant['retailOfferPrice'];
                    }
                    if (isset($variant['purchaseCost']) && !isset($variant['purchase_cost'])) {
                        $variant['purchase_cost'] = $variant['purchaseCost'];
                    }
                    if (isset($variant['thumbnailId']) && !isset($variant['thumbnail_id'])) {
                        $variant['thumbnail_id'] = $variant['thumbnailId'];
                    }
                    if (isset($variant['wholesaleMoq']) && !isset($variant['wholesale_moq'])) {
                        $variant['wholesale_moq'] = $variant['wholesaleMoq'];
                    }
                }
                $request->merge(['variants' => $variants]);
            }

            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'retail_name' => 'nullable|string|max:255',
                'wholesale_name' => 'nullable|string|max:255',
                'retail_name_bn' => 'nullable|string|max:255',
                'wholesale_name_bn' => 'nullable|string|max:255',
                'slug' => 'nullable|string|max:255|unique:products,slug',
                'product_code' => 'nullable|string|max:100|unique:products,product_code',
                'category_id' => 'nullable|exists:categories,id',
                'brand_id' => 'nullable|exists:brands,id',
                'thumbnail_id' => 'nullable|integer|exists:media_files,id',
                'gallery_images' => 'nullable|array',
                'gallery_images.*' => 'integer|exists:media_files,id',
                'description' => 'nullable|string',
                'description_bn' => 'nullable|string',
                'video_url' => 'nullable|string|max:500',
                'seo_title' => 'nullable|string|max:255',
                'seo_description' => 'nullable|string|max:500',
                'seo_tags' => 'nullable|array',
                'status' => 'nullable|in:draft,published,archived',
                'warranty_enabled' => 'nullable|boolean',
                'warranty_details' => 'nullable|string',
                'highlights' => 'nullable|array',
                'highlights_bn' => 'nullable|array',
                'attributes' => 'nullable|array',
                'attributes_bn' => 'nullable|array',
                'includes_in_box' => 'nullable|array',
                'includes_in_box_bn' => 'nullable|array',
                'thank_you' => 'nullable|boolean',
                'hide_from_website' => 'nullable|boolean',
                'variants' => 'nullable|array',
                'variants.*.name' => 'required_with:variants|string|max:255',
                'variants.*.seller_sku' => 'required_with:variants|string|max:100',
                'variants.*.purchase_cost' => 'required_with:variants|numeric|min:0',
                'variants.*.retail_price' => 'required_with:variants|numeric|min:0',
                'variants.*.wholesale_price' => 'nullable|numeric|min:0',
                'variants.*.retail_offer_price' => 'nullable|numeric|min:0',
                'variants.*.wholesale_offer_price' => 'nullable|numeric|min:0',
                'variants.*.wholesale_moq' => 'nullable|integer|min:0',
                'variants.*.weight' => 'nullable|numeric|min:0',
                'variants.*.stock' => 'required_with:variants|integer|min:0',
                'variants.*.thumbnail_id' => 'nullable|integer|exists:media_files,id',
            ]);

            // Handle variants creation
            if (!empty($validated['variants'])) {
                return $this->storeWithVariants($validated);
            }

            // Simple product creation (without variants)
            return DB::transaction(function () use ($validated) {
                // Use name or retail_name as the main name
                if (empty($validated['name']) && !empty($validated['retail_name'])) {
                    $validated['name'] = $validated['retail_name'];
                }

                // Generate slug if not provided
                if (empty($validated['slug']) && !empty($validated['name'])) {
                    $validated['slug'] = \Illuminate\Support\Str::slug($validated['name']) . '-' . time();
                }

                // thumbnail_id and gallery_images already contain media_files IDs
                // No conversion needed - save directly
                $product = Product::create($validated);

                // Clear cache
                $this->clearProductsListCache();

                // Reload product with non-deleted variants only
                $product->load([
                    'category',
                    'brand',
                    'variants' => function ($query) {
                        $query->withoutTrashed();
                    }
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Product created successfully',
                    'data' => $product
                ], 201);
            });

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create product',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Store product with variants
     * Handles creation of products that have variants
     */
    protected function storeWithVariants(array $validated): JsonResponse
    {
        return DB::transaction(function () use ($validated) {
            $variantsData = $validated['variants'] ?? [];
            unset($validated['variants']);

            if (empty($validated['name']) && !empty($validated['retail_name'])) {
                $validated['name'] = $validated['retail_name'];
            }

            if (empty($validated['slug']) && !empty($validated['name'])) {
                $validated['slug'] = \Illuminate\Support\Str::slug($validated['name']) . '-' . time();
            }

            $product = Product::create($validated);

            foreach ($variantsData as $variantData) {
                // Use pure transformer to handle field mapping and decimal rounding
                $transformedData = VariantDataTransformer::transformVariantForCreate($variantData);

                // Add product_id and required enum field
                $transformedData['product_id'] = $product->id;
                $transformedData['channel'] = 'retail';
                $transformedData['is_active'] = true;
                $transformedData['variant_slug'] = \Illuminate\Support\Str::slug($transformedData['variant_name']) . '-' . time();

                ProductVariant::create($transformedData);
            }

            $this->clearProductsListCache();

            $product->load([
                'category',
                'brand',
                'variants' => function ($query) {
                    $query->withoutTrashed();
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Product with variants created successfully',
                'data' => $product
            ], 201);
        });
    }

    /**
     * Update product (Authenticated)
     * PUT /api/v2/catalog/products/{id}
     *
     * @param Request $request
     * @param int|string $identifier
     * @return JsonResponse
     */
    public function update(Request $request, int|string $identifier): JsonResponse
    {
        try {
            // Check if the identifier is numeric (ID) or string (slug)
            if (is_numeric($identifier)) {
                $product = Product::findOrFail((int) $identifier);
            } else {
                $product = Product::where('slug', $identifier)->firstOrFail();
            }

            // Handle camelCase to snake_case field mapping
            if ($request->has('productName')) {
                $request->merge(['name' => $request->input('productName')]);
            }
            if ($request->has('retailName')) {
                $request->merge(['retail_name' => $request->input('retailName')]);
            }
            if ($request->has('wholesaleName')) {
                $request->merge(['wholesale_name' => $request->input('wholesaleName')]);
            }
            if ($request->has('retailNameBn')) {
                $request->merge(['retail_name_bn' => $request->input('retailNameBn')]);
            }
            if ($request->has('wholesaleNameBn')) {
                $request->merge(['wholesale_name_bn' => $request->input('wholesaleNameBn')]);
            }
            if ($request->has('productCode')) {
                $request->merge(['product_code' => $request->input('productCode')]);
            }
            if ($request->has('videoUrl')) {
                $request->merge(['video_url' => $request->input('videoUrl')]);
            }
            if ($request->has('seoTitle')) {
                $request->merge(['seo_title' => $request->input('seoTitle')]);
            }
            if ($request->has('seoDescription')) {
                $request->merge(['seo_description' => $request->input('seoDescription')]);
            }
            if ($request->has('seoTags')) {
                $tags = $request->input('seoTags');
                if (is_array($tags)) {
                    // Already an array, use as-is
                    $request->merge(['seo_tags' => $tags]);
                } elseif (is_string($tags)) {
                    // Convert comma-separated string to array
                    $tagsArray = array_map('trim', explode(',', $tags));
                    $tagsArray = array_filter($tagsArray, fn($tag) => !empty($tag));
                    $request->merge(['seo_tags' => array_values($tagsArray)]);
                } else {
                    $request->merge(['seo_tags' => []]);
                }
                // Remove the original camelCase field to prevent validation errors
                $request->request->remove('seoTags');
            }
            if ($request->has('warrantyEnabled')) {
                $request->merge(['warranty_enabled' => $request->input('warrantyEnabled')]);
            }
            if ($request->has('warrantyDetails')) {
                $request->merge(['warranty_details' => $request->input('warrantyDetails')]);
            }
            if ($request->has('includesInTheBox')) {
                $value = $request->input('includesInTheBox');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['includes_in_box' => $value]);
                $request->request->remove('includesInTheBox');
            }
            if ($request->has('includesInTheBoxBn')) {
                $value = $request->input('includesInTheBoxBn');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['includes_in_box_bn' => $value]);
                $request->request->remove('includesInTheBoxBn');
            }
            if ($request->has('highlights')) {
                $value = $request->input('highlights');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['highlights' => $value]);
            }
            if ($request->has('highlightsBn')) {
                $value = $request->input('highlightsBn');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['highlights_bn' => $value]);
            }
            if ($request->has('attributes')) {
                $value = $request->input('attributes');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['attributes' => $value]);
            }
            if ($request->has('attributesBn')) {
                $value = $request->input('attributesBn');
                if (is_string($value)) {
                    $value = array_filter(array_map('trim', explode("\n", $value)));
                    if (count($value) === 1 && empty($value[0])) {
                        $value = [];
                    }
                }
                $request->merge(['attributes_bn' => $value]);
            }
            if ($request->has('thankYou')) {
                $request->merge(['thank_you' => $request->input('thankYou')]);
            }
            if ($request->has('hideFromWebsite')) {
                $request->merge(['hide_from_website' => $request->input('hideFromWebsite')]);
            }

            // Handle galleryImages as alias for gallery_images
            if ($request->has('galleryImages')) {
                $request->merge(['gallery_images' => $request->input('galleryImages')]);
            }

            // Handle includes_in_box as string (convert to array)
            if ($request->has('includes_in_box') && is_string($request->input('includes_in_box'))) {
                $value = $request->input('includes_in_box');
                $value = array_filter(array_map('trim', explode("\n", $value)));
                if (count($value) === 1 && empty($value[0])) {
                    $value = [];
                }
                $request->merge(['includes_in_box' => $value]);
            }

            // Handle includes_in_box_bn as string (convert to array)
            if ($request->has('includes_in_box_bn') && is_string($request->input('includes_in_box_bn'))) {
                $value = $request->input('includes_in_box_bn');
                $value = array_filter(array_map('trim', explode("\n", $value)));
                if (count($value) === 1 && empty($value[0])) {
                    $value = [];
                }
                $request->merge(['includes_in_box_bn' => $value]);
            }

            // Normalize variant field names before validation (convert any camelCase to snake_case)
            // The transformer will handle the actual conversion during save
            if ($request->has('variants')) {
                $variants = $request->input('variants');
                foreach ($variants as &$variant) {
                    // Accept both camelCase and snake_case - validation will handle the actual transform
                    // This just normalizes the input for validation
                    if (isset($variant['retailPrice']) && !isset($variant['retail_price'])) {
                        $variant['retail_price'] = $variant['retailPrice'];
                    }
                    if (isset($variant['retailOfferPrice']) && !isset($variant['retail_offer_price'])) {
                        $variant['retail_offer_price'] = $variant['retailOfferPrice'];
                    }
                    if (isset($variant['purchaseCost']) && !isset($variant['purchase_cost'])) {
                        $variant['purchase_cost'] = $variant['purchaseCost'];
                    }
                    if (isset($variant['thumbnailId']) && !isset($variant['thumbnail_id'])) {
                        $variant['thumbnail_id'] = $variant['thumbnailId'];
                    }
                    if (isset($variant['wholesaleMoq']) && !isset($variant['wholesale_moq'])) {
                        $variant['wholesale_moq'] = $variant['wholesaleMoq'];
                    }
                }
                $request->merge(['variants' => $variants]);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'slug' => 'nullable|string|max:255|unique:products,slug,' . $product->id,
                'sku' => 'sometimes|string|max:100|unique:products,sku,' . $product->id,
                'retail_name' => 'nullable|string|max:255',
                'wholesale_name' => 'nullable|string|max:255',
                'retail_name_bn' => 'nullable|string|max:255',
                'wholesale_name_bn' => 'nullable|string|max:255',
                'product_code' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'description_bn' => 'nullable|string',
                'video_url' => 'nullable|string|max:500',
                'price' => 'sometimes|numeric|min:0',
                'compare_at_price' => 'nullable|numeric|min:0',
                'cost_price' => 'nullable|numeric|min:0',
                'stock' => 'sometimes|integer|min:0',
                'category_id' => 'nullable|exists:categories,id',
                'brand_id' => 'nullable|exists:brands,id',
                'status' => 'nullable|in:draft,published,archived',
                'weight' => 'nullable|numeric|min:0',
                'warranty_enabled' => 'nullable|boolean',
                'warranty_details' => 'nullable|string',
                'highlights' => 'nullable|array',
                'highlights_bn' => 'nullable|array',
                'attributes' => 'nullable|array',
                'attributes_bn' => 'nullable|array',
                'includes_in_box' => 'nullable|array',
                'includes_in_box_bn' => 'nullable|array',
                'seo_title' => 'nullable|string|max:255',
                'seo_description' => 'nullable|string|max:500',
                'seo_tags' => 'nullable|array',
                'thumbnail_id' => 'nullable|integer',
                'gallery_images' => 'nullable|array',
                'gallery_images.*' => 'integer',
                'cross_sale' => 'nullable|string',
                'up_sale' => 'nullable|string',
                'thank_you' => 'nullable|boolean',
                'hide_from_website' => 'nullable|boolean',
                'sort_order' => 'nullable|integer',
                // Variant validation
                'variants' => 'nullable|array',
                'variants.*.id' => 'nullable|integer|exists:product_variants,id',
                'variants.*.name' => 'nullable|string|max:255',
                'variants.*.sku' => 'nullable|string|max:255',
                'variants.*.retail_price' => 'nullable|numeric|min:0',
                'variants.*.wholesale_price' => 'nullable|numeric|min:0',
                'variants.*.retail_offer_price' => 'nullable|numeric|min:0',
                'variants.*.wholesale_offer_price' => 'nullable|numeric|min:0',
                'variants.*.wholesale_moq' => 'nullable|integer|min:0',
                'variants.*.weight' => 'nullable|numeric|min:0',
                'variants.*.stock' => 'nullable|integer|min:0',
                'variants.*.thumbnail_id' => 'nullable|integer|exists:media_files,id',
                'deleted_variant_ids' => 'nullable|array',
                'deleted_variant_ids.*' => 'integer|exists:product_variants,id',
            ]);

            // thumbnail_id and gallery_images already contain media_files IDs
            // No conversion needed - save directly
            $product->update($validated);

            // Delete variants FIRST (before updating) to avoid unique constraint violations
            if (isset($validated['deleted_variant_ids']) && is_array($validated['deleted_variant_ids'])) {
                foreach ($validated['deleted_variant_ids'] as $variantId) {
                    ProductVariant::where('id', $variantId)
                        ->where('product_id', $product->id)
                        ->delete(); // Soft delete - preserves referential integrity with orders
                }
                \Log::info('Deleted variants', ['variant_ids' => $validated['deleted_variant_ids']]);
            }

            // Handle variants update
            if (isset($validated['variants']) && is_array($validated['variants'])) {
                \Log::info('Processing variants update', ['count' => count($validated['variants'])]);

                foreach ($validated['variants'] as $index => $variantData) {
                    $variantId = $variantData['id'] ?? null;

                    // Use pure transformer to handle field mapping and rounding
                    // For UPDATE: only include fields that are explicitly provided
                    $updateData = VariantDataTransformer::transformVariantForUpdate($variantData);

                    // Add required fields
                    $updateData['channel'] = 'retail';
                    $updateData['is_active'] = true;

                    // Only generate slug if name was changed
                    if (isset($updateData['variant_name'])) {
                        $updateData['variant_slug'] = \Illuminate\Support\Str::slug($updateData['variant_name']) . '-' . time();
                    }

                    \Log::info("Processing variant {$index}", [
                        'variant_id' => $variantId,
                        'update_data' => $updateData,
                    ]);

                    if ($variantId) {
                        \Log::info('Updating variant', ['variant_id' => $variantId, 'data_count' => count($updateData)]);
                        $affected = ProductVariant::where('id', $variantId)
                            ->where('product_id', $product->id)
                            ->update($updateData);
                        \Log::info('Variant update result', ['affected_rows' => $affected]);
                    } else {
                        // Create new variant
                        $createData = VariantDataTransformer::transformVariantForCreate($variantData);
                        $createData['product_id'] = $product->id;
                        $createData['channel'] = 'retail';
                        $createData['is_active'] = true;
                        $createData['variant_slug'] = \Illuminate\Support\Str::slug($createData['variant_name']) . '-' . time();

                        \Log::info('Creating new variant', ['data_count' => count($createData)]);
                        ProductVariant::create($createData);
                    }
                }
            } else {
                \Log::info('No variants in request', ['all_keys' => array_keys($validated)]);
            }

            // Clear cache
            Cache::forget("product:v2:slug:{$product->slug}");
            $this->clearProductsListCache();

            // Reload product with non-deleted variants only
            $product->load([
                'category',
                'brand',
                'variants' => function ($query) {
                    $query->withoutTrashed();
                }
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => 'The requested product does not exist'
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
                'message' => 'Failed to update product',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Delete product (Authenticated)
     * DELETE /api/v2/catalog/products/{id}
     *
     * @param int|string $identifier
     * @return JsonResponse
     */
    public function destroy(int|string $identifier): JsonResponse
    {
        try {
            // Check if the identifier is numeric (ID) or string (slug)
            if (is_numeric($identifier)) {
                $product = Product::findOrFail((int) $identifier);
            } else {
                $product = Product::where('slug', $identifier)->firstOrFail();
            }
            $productSlug = $product->slug;

            $product->delete();

            // Clear cache
            Cache::forget("product:v2:slug:{$productSlug}");
            $this->clearProductsListCache();

            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully'
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => 'The requested product does not exist'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete product',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Update product status (publish/draft/archive)
     * PATCH /api/v2/catalog/products/{id}/status
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:draft,published,archived',
            ]);

            $product = Product::findOrFail($id);
            $oldStatus = $product->status;

            // Direct DB update to bypass any model issues, then dispatch event manually
            DB::table('products')
                ->where('id', $id)
                ->update([
                    'status' => $validated['status'],
                    'updated_at' => now(),
                ]);

            // Refresh to get updated data
            $product->refresh();

            // Manually fire the event since we bypassed the Model update
            \App\Modules\Catalog\Events\ProductUpdated::dispatch($product);

            // Clear related cache keys - clear both admin and storefront caches
            Cache::forget("product:v2:slug:{$product->slug}");
            Cache::forget("storefront:product:v2:slug:{$product->slug}");
            // Clear all products list cache variations
            $this->clearProductsListCache();

            return response()->json([
                'success' => true,
                'message' => 'Product status updated successfully',
                'data' => [
                    'id' => $product->id,
                    'status' => $product->status
                ]
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => 'The requested product does not exist'
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status value',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Product status update failed', [
                'product_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update product status',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    // ================================================
    // STOREFRONT PUBLIC METHODS (Safe Data Only)
    // ================================================

    /**
     * Get paginated list of products for storefront (PUBLIC)
     * GET /api/v2/catalog/storefront/products
     *
     * Returns only safe fields - NO sensitive business data
     */
    public function storefrontIndex(Request $request): JsonResponse
    {
        try {
            $perPage = min(
                (int) $request->input('per_page', self::DEFAULT_PER_PAGE),
                self::MAX_PER_PAGE
            );
            $page = (int) $request->input('page', 1);
            $search = $request->input('search', '');
            $categoryId = $request->input('category_id');
            $categorySlug = $request->input('category');
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');

            // Cache key for storefront products list
            $cacheKey = "storefront:products:v2:page:{$page}:per_page:{$perPage}:search:{$search}:category_id:{$categoryId}:category:{$categorySlug}:sort:{$sortBy}:{$sortOrder}";

            $products = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search, $categoryId, $categorySlug, $sortBy, $sortOrder) {
                $query = Product::query()
                    ->with(['category', 'brand', 'variants' => function ($query) {
                        $query->select('id', 'product_id', 'price', 'stock', 'is_active');
                    }])
                    ->where('status', 'published')
                    ->where('hide_from_website', false);

                // Search filter
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('sku', 'like', "%{$search}%");
                    });
                }

                // Category filter: prefer numeric category_id, fall back to slug
                if ($categoryId) {
                    $query->where('category_id', (int) $categoryId);
                } elseif ($categorySlug) {
                    if (is_numeric($categorySlug)) {
                        $query->where('category_id', (int) $categorySlug);
                    } else {
                        $category = Category::where('slug', $categorySlug)->first();
                        if ($category) {
                            $query->where('category_id', $category->id);
                        }
                    }
                }

                // Sorting
                $allowedSortFields = ['name', 'created_at', 'updated_at'];
                $sortField = in_array($sortBy, $allowedSortFields) ? $sortBy : 'created_at';
                $sortDirection = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

                $query->orderBy($sortField, $sortDirection);

                return $query->paginate($perPage);
            });

            // Transform to include only safe fields
            $safeProducts = collect($products->items())->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'thumbnail_id' => $product->thumbnail_id,
                    'thumbnailUrl' => $product->thumbnailUrl,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                        'slug' => $product->category->slug
                    ] : null,
                    'brand' => $product->brand ? [
                        'id' => $product->brand->id,
                        'name' => $product->brand->name,
                        'slug' => $product->brand->slug
                    ] : null,
                    'stock' => $product->stock,
                    'stock_status' => $product->stock_status,
                    'in_stock' => $product->in_stock,
                    'stock_level' => $product->stock_level,
                    'min_price' => $product->min_price,
                    'max_price' => $product->max_price,
                    'price_range' => $product->price_range,
                    'status' => $product->status,
                    'created_at' => $product->created_at,
                    'updated_at' => $product->updated_at,
                    // EXCLUDED SENSITIVE DATA: purchaseCost, internalData, etc.
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Products retrieved successfully',
                'data' => $safeProducts->toArray(),
                'pagination' => [
                    'current_page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                    'last_page' => $products->lastPage(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem(),
                    'has_more_pages' => $products->hasMorePages(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve products',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get single product details for storefront (PUBLIC)
     * GET /api/v2/catalog/storefront/products/{slug}
     *
     * Returns only safe fields - NO sensitive business data
     */
    public function storefrontShow(string $slug): JsonResponse
    {
        try {
            $cacheKey = "storefront:product:v2:slug:{$slug}";

            $product = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug) {
                return Product::with([
                    'category',
                    'brand',
                    'variants' => function ($query) {
                        // Show only active (non-deleted) variants on storefront
                        // Deleted variants should not be visible to customers
                        $query->select('id', 'product_id', 'variant_name', 'sku', 'price',
                                     'offer_price', 'stock', 'is_active', 'thumbnail');
                    }
                ])
                ->where('slug', $slug)
                ->where('status', 'published')
                ->where('hide_from_website', false)
                ->firstOrFail();
            });

            // Transform to include only safe fields
            $safeProduct = [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'thumbnail_id' => $product->thumbnail_id,
                'thumbnailUrl' => $product->thumbnailUrl,
                'gallery_images' => $product->gallery_images,
                'galleryImagesUrls' => $product->galleryImagesUrls,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                    'slug' => $product->category->slug
                ] : null,
                'brand' => $product->brand ? [
                    'id' => $product->brand->id,
                    'name' => $product->brand->name,
                    'slug' => $product->brand->slug
                ] : null,
                'stock' => $product->stock,
                'stock_status' => $product->stock_status,
                'in_stock' => $product->in_stock,
                'stock_level' => $product->stock_level,
                'min_price' => $product->min_price,
                'max_price' => $product->max_price,
                'price_range' => $product->price_range,
                'status' => $product->status,
                'variants' => $product->variants->map(function ($variant) use ($product) {
                    return [
                        'id' => $variant->id,
                        'variant_name' => $variant->variant_name,
                        'sku' => $variant->sku,
                        'price' => (float) $variant->price,
                        'offer_price' => $variant->offer_price ? (float) $variant->offer_price : null,
                        'stock' => $variant->stock,
                        'is_active' => $variant->is_active,
                        'thumbnailUrl' => $variant->thumbnailUrl ?? $product->thumbnailUrl ?? null,
                    ];
                })->toArray(),
                'created_at' => $product->created_at,
                'updated_at' => $product->updated_at,
                // EXCLUDED SENSITIVE DATA: purchaseCost, wholesalePricing, internalData, etc.
            ];

            return response()->json([
                'success' => true,
                'message' => 'Product retrieved successfully',
                'data' => $safeProduct
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => 'The requested product does not exist or is not available'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve product',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get thank you page products (for order confirmation page)
     * GET /api/v2/catalog/thank-you-products
     *
     * Returns products marked as thank_you products
     * These products are shown on order confirmation page as upsell/cross-sell
     */
    public function thankYouProducts(Request $request): JsonResponse
    {
        try {
            $cacheKey = "thank_you_products:v2:limit:" . ($request->input('limit', 10));

            $products = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($request) {
                $limit = min((int) $request->input('limit', 10), 20);

                return Product::with([
                    'category',
                    'brand',
                    'variants' => function ($query) {
                        $query->where('is_active', true)
                              ->select('id', 'product_id', 'variant_name', 'sku', 'price',
                                     'offer_price', 'stock', 'is_active', 'thumbnail');
                    }
                ])
                ->where('status', 'published')
                ->where('thank_you', true)
                ->inRandomOrder()
                ->limit($limit)
                ->get();
            });

            // Transform to include only safe fields
            $safeProducts = $products->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'thumbnail_id' => $product->thumbnail_id,
                    'thumbnailUrl' => $product->thumbnailUrl,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                        'slug' => $product->category->slug
                    ] : null,
                    'brand' => $product->brand ? [
                        'id' => $product->brand->id,
                        'name' => $product->brand->name,
                        'slug' => $product->brand->slug
                    ] : null,
                    'min_price' => $product->min_price,
                    'max_price' => $product->max_price,
                    'price_range' => $product->price_range,
                    'variants' => $product->variants->map(function ($variant) use ($product) {
                        return [
                            'id' => $variant->id,
                            'variant_name' => $variant->variant_name,
                            'sku' => $variant->sku,
                            'price' => (float) $variant->price,
                            'offer_price' => $variant->offer_price ? (float) $variant->offer_price : null,
                            'stock' => $variant->stock,
                            'is_active' => $variant->is_active,
                            'thumbnailUrl' => $variant->thumbnailUrl ?? $product->thumbnailUrl ?? null,
                        ];
                    })->toArray(),
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Thank you products retrieved successfully',
                'data' => $safeProducts->toArray()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve thank you products',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }
}