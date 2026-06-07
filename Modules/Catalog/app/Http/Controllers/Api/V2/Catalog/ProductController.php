<?php

namespace App\Modules\Catalog\Http\Controllers\Api\V2\Catalog;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
use App\Modules\Catalog\Models\ProductImage;
use App\Modules\Catalog\Models\Category;
use App\Traits\ImageHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Catalog Product Controller for V2 API
 * Handles product listing, details, and management
 */
class ProductController extends Controller
{
    use ImageHelper;
    private const CACHE_TTL = 300; // 5 minutes
    private const DEFAULT_PER_PAGE = 20;
    private const MAX_PER_PAGE = 50;

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
            $categorySlug = $request->input('category');
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');

            // Cache key for products list
            $cacheKey = "products:v2:page:{$page}:per_page:{$perPage}:search:{$search}:category:{$categorySlug}:sort:{$sortBy}:{$sortOrder}";

            $products = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search, $categorySlug, $sortBy, $sortOrder) {
                $query = Product::query()
                    ->with(['category', 'brand', 'thumbnail', 'variants' => function ($query) {
                        $query->select('id', 'product_id', 'sku', 'variant_name', 'price', 'offer_price', 'stock', 'is_active', 'thumbnail');
                    }])
                    ->where('status', 'published');

                // Search filter
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('product_code', 'like', "%{$search}%")
                          ->orWhere('description', 'like', "%{$search}%");
                    });
                }

                // Category filter
                if ($categorySlug) {
                    $category = Category::where('slug', $categorySlug)->first();
                    if ($category) {
                        $query->where('category_id', $category->id);
                    }
                }

                // Sorting
                $allowedSortFields = ['name', 'price', 'created_at', 'updated_at', 'stock'];
                $sortField = in_array($sortBy, $allowedSortFields) ? $sortBy : 'created_at';
                $sortDirection = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

                $query->orderBy($sortField, $sortDirection);

                // Paginate and append full_url to thumbnails
                $paginatedProducts = $query->paginate($perPage);
                $paginatedProducts->getCollection()->transform(function ($product) {
                    if ($product->thumbnail) {
                        $product->thumbnail->append('full_url');
                    }
                    return $product;
                });

                return $paginatedProducts;
            });

            return response()->json([
                'success' => true,
                'message' => 'Products retrieved successfully',
                'data' => $products->items(),
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
            $cacheKey = "product:v2:slug:{$slug}";

            $product = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug) {
                return Product::with([
                    'category',
                    'brand',
                    'thumbnail',
                    'variants' => function ($query) {
                        $query->where('is_active', true)
                              ->select('id', 'product_id', 'sku', 'variant_name', 'price', 'offer_price', 'stock', 'is_active', 'thumbnail', 'purchase_cost');
                    }
                ])
                ->where('slug', $slug)
                ->where('status', 'published')
                ->firstOrFail();
            });

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

            // Handle variant field name conversions (camelCase to snake_case)
            if ($request->has('variants')) {
                $variants = $request->input('variants');
                foreach ($variants as &$variant) {
                    // Convert camelCase to snake_case
                    $variant['seller_sku'] = $variant['sellerSku'] ?? $variant['seller_sku'] ?? null;
                    $variant['purchase_cost'] = $variant['purchaseCost'] ?? $variant['purchase_cost'] ?? 0;
                    $variant['retail_price'] = $variant['retailPrice'] ?? $variant['retail_price'] ?? 0;
                    $variant['wholesale_price'] = $variant['wholesalePrice'] ?? $variant['wholesale_price'] ?? null;
                    $variant['retail_offer_price'] = $variant['retailOfferPrice'] ?? $variant['retail_offer_price'] ?? 0;
                    $variant['wholesale_offer_price'] = $variant['wholesaleOfferPrice'] ?? $variant['wholesale_offer_price'] ?? null;
                    $variant['wholesale_moq'] = $variant['wholesaleMoq'] ?? $variant['wholesale_moq'] ?? null;

                    // Remove camelCase versions
                    unset($variant['sellerSku'], $variant['purchaseCost'], $variant['retailPrice'],
                            $variant['wholesalePrice'], $variant['retailOfferPrice'], $variant['wholesaleOfferPrice'],
                            $variant['wholesaleMoq']);
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
                'variants.*.thumbnail' => 'nullable|string|max:500',
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

                // Store media file IDs separately before creating product
                $thumbnailMediaId = $validated['thumbnail_id'] ?? null;
                $galleryMediaIds = $validated['gallery_images'] ?? [];

                // Remove image fields from validated data - will add back after conversion
                unset($validated['thumbnail_id'], $validated['gallery_images']);

                // Create the product first (without images)
                $product = Product::create($validated);

                // Now create catalog_product_images entries with the product_id
                if ($thumbnailMediaId) {
                    $thumbnailCatalogId = $this->createCatalogProductImageWithProduct($thumbnailMediaId, $product->id, true);
                    if ($thumbnailCatalogId) {
                        $product->thumbnail_id = $thumbnailCatalogId;
                    }
                }

                if (!empty($galleryMediaIds)) {
                    $galleryCatalogIds = $this->createCatalogProductImagesWithProduct($galleryMediaIds, $product->id);
                    if (!empty($galleryCatalogIds)) {
                        $product->gallery_images = $galleryCatalogIds;
                    }
                }

                $product->save();

                // Clear cache
                Cache::forget('products:v2:*');

                return response()->json([
                    'success' => true,
                    'message' => 'Product created successfully',
                    'data' => $product->load(['category', 'brand', 'variants'])
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
            // Extract variants from validated data
            $variantsData = $validated['variants'] ?? [];
            unset($validated['variants']);

            // Use name or retail_name as the main name
            if (empty($validated['name']) && !empty($validated['retail_name'])) {
                $validated['name'] = $validated['retail_name'];
            }

            // Generate slug if not provided
            if (empty($validated['slug']) && !empty($validated['name'])) {
                $validated['slug'] = \Illuminate\Support\Str::slug($validated['name']) . '-' . time();
            }

            // Store media file IDs separately before creating product
            $thumbnailMediaId = $validated['thumbnail_id'] ?? null;
            $galleryMediaIds = $validated['gallery_images'] ?? [];

            // Remove image fields from validated data - will add back after conversion
            unset($validated['thumbnail_id'], $validated['gallery_images']);

            // Create the product first (without images)
            $product = Product::create($validated);

            // Now create catalog_product_images entries with the product_id
            if ($thumbnailMediaId) {
                $thumbnailCatalogId = $this->createCatalogProductImageWithProduct($thumbnailMediaId, $product->id, true);
                if ($thumbnailCatalogId) {
                    $product->thumbnail_id = $thumbnailCatalogId;
                }
            }

            if (!empty($galleryMediaIds)) {
                $galleryCatalogIds = $this->createCatalogProductImagesWithProduct($galleryMediaIds, $product->id);
                if (!empty($galleryCatalogIds)) {
                    $product->gallery_images = $galleryCatalogIds;
                }
            }

            $product->save();

            // Create variants
            foreach ($variantsData as $variantData) {
                $variantData['product_id'] = $product->id;
                $variantData['sku'] = $variantData['seller_sku'] ?? \Illuminate\Support\Str::slug($variantData['name'] ?? 'variant') . '-' . time();
                $variantData['variant_slug'] = \Illuminate\Support\Str::slug($variantData['name'] ?? 'variant') . '-' . time();
                $variantData['variant_name'] = $variantData['name'];
                $variantData['purchase_cost'] = $variantData['purchase_cost'] ?? 0;
                $variantData['price'] = $variantData['retail_price'] ?? 0;
                $variantData['offer_price'] = $variantData['retail_offer_price'] ?? 0;
                $variantData['stock'] = $variantData['stock'] ?? 0;
                $variantData['weight'] = $variantData['weight'] ?? 0;
                $variantData['moq'] = $variantData['wholesale_moq'] ?? 0;
                $variantData['thumbnail'] = $variantData['thumbnail'] ?? null;
                $variantData['channel'] = 'retail'; // Required field - enum('retail','wholesale','daraz','pos')
                $variantData['is_active'] = true;

                // Remove fields that don't exist in the database
                unset($variantData['name'], $variantData['seller_sku'], $variantData['retail_price'],
                        $variantData['retail_offer_price'], $variantData['wholesale_price'],
                        $variantData['wholesale_offer_price'], $variantData['wholesale_moq'],
                        $variantData['retail_id'], $variantData['wholesale_id']);

                ProductVariant::create($variantData);
            }

            // Clear cache
            Cache::forget('products:v2:*');

            return response()->json([
                'success' => true,
                'message' => 'Product with variants created successfully',
                'data' => $product->load(['category', 'brand', 'variants'])
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
            ]);

            // Handle thumbnail_id conversion if it's a media_files ID
            if (!empty($validated['thumbnail_id'])) {
                // Check if it's already a catalog_product_images ID for THIS product
                $existingCatalogImage = DB::table('catalog_product_images')
                    ->where('id', $validated['thumbnail_id'])
                    ->where('product_id', $product->id)
                    ->first();

                if (!$existingCatalogImage) {
                    // Either it's a media_files ID or it belongs to another product
                    // Check if it's a catalog_product_images ID (for any product)
                    $isAnyCatalogImage = DB::table('catalog_product_images')->where('id', $validated['thumbnail_id'])->exists();

                    if ($isAnyCatalogImage) {
                        // It's a catalog_product_images ID but belongs to another product
                        // We need to get the original media file and create a new entry
                        $otherCatalogImage = DB::table('catalog_product_images')->where('id', $validated['thumbnail_id'])->first();
                        // Find the original media file
                        $mediaFile = DB::table('media_files')->where('filename', $otherCatalogImage->file_name)->first();
                        if ($mediaFile) {
                            $catalogId = $this->createCatalogProductImageWithProduct($mediaFile->id, $product->id, true);
                            if ($catalogId) {
                                $validated['thumbnail_id'] = $catalogId;
                            } else {
                                unset($validated['thumbnail_id']);
                            }
                        }
                    } else {
                        // It's a media_files ID, convert it
                        $catalogId = $this->createCatalogProductImageWithProduct($validated['thumbnail_id'], $product->id, true);
                        if ($catalogId) {
                            $validated['thumbnail_id'] = $catalogId;
                        } else {
                            unset($validated['thumbnail_id']);
                        }
                    }
                }
            }

            // Handle gallery_images conversion if they are media_files IDs
            if (!empty($validated['gallery_images']) && is_array($validated['gallery_images'])) {
                $convertedGalleryIds = [];
                foreach ($validated['gallery_images'] as $imageId) {
                    // Check if it's already a catalog_product_images ID for THIS product
                    $existingCatalogImage = DB::table('catalog_product_images')
                        ->where('id', $imageId)
                        ->where('product_id', $product->id)
                        ->first();

                    if ($existingCatalogImage) {
                        // Already exists for this product, use it
                        $convertedGalleryIds[] = $imageId;
                    } else {
                        // Check if it's a catalog_product_images ID for any product
                        $isAnyCatalogImage = DB::table('catalog_product_images')->where('id', $imageId)->exists();

                        if ($isAnyCatalogImage) {
                            // It's a catalog_product_images ID but belongs to another product
                            $otherCatalogImage = DB::table('catalog_product_images')->where('id', $imageId)->first();
                            $mediaFile = DB::table('media_files')->where('filename', $otherCatalogImage->file_name)->first();
                            if ($mediaFile) {
                                $catalogId = $this->createCatalogProductImageWithProduct($mediaFile->id, $product->id, false);
                                if ($catalogId) {
                                    $convertedGalleryIds[] = $catalogId;
                                }
                            }
                        } else {
                            // It's a media_files ID, convert it
                            $catalogId = $this->createCatalogProductImageWithProduct($imageId, $product->id, false);
                            if ($catalogId) {
                                $convertedGalleryIds[] = $catalogId;
                            }
                        }
                    }
                }
                $validated['gallery_images'] = $convertedGalleryIds;
            }

            $product->update($validated);

            // Clear cache
            Cache::forget("product:v2:slug:{$product->slug}");
            Cache::forget('products:v2:*');

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product->load(['category', 'brand', 'variants'])
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
            Cache::forget('products:v2:*');

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
            $categorySlug = $request->input('category');
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');

            // Cache key for storefront products list
            $cacheKey = "storefront:products:v2:page:{$page}:per_page:{$perPage}:search:{$search}:category:{$categorySlug}:sort:{$sortBy}:{$sortOrder}";

            $products = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($perPage, $search, $categorySlug, $sortBy, $sortOrder) {
                $query = Product::query()
                    ->with(['category', 'brand', 'thumbnail', 'variants' => function ($query) {
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

                // Category filter
                if ($categorySlug) {
                    $category = Category::where('slug', $categorySlug)->first();
                    if ($category) {
                        $query->where('category_id', $category->id);
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
                    'thumbnail',
                    'images',
                    'variants' => function ($query) {
                        $query->where('is_active', true)
                              ->select('id', 'product_id', 'variant_name', 'sku', 'price',
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
                    'thumbnail',
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

    /**
     * Create catalog_product_image entry from media_file with product_id
     * Converts media_files ID to catalog_product_images ID
     */
    protected function createCatalogProductImageWithProduct(int $mediaFileId, int $productId, bool $isThumbnail = false): ?int
    {
        $mediaFile = DB::table('media_files')->where('id', $mediaFileId)->first();
        if (!$mediaFile) {
            return null;
        }

        // Check if catalog_product_image already exists for this media file and product
        $existingImage = DB::table('catalog_product_images')
            ->where('file_name', $mediaFile->filename)
            ->where('product_id', $productId)
            ->first();

        if ($existingImage) {
            return $existingImage->id;
        }

        // Create new catalog_product_image entry with product_id
        return DB::table('catalog_product_images')->insertGetId([
            'product_id' => $productId,
            'url' => $mediaFile->url,
            'file_name' => $mediaFile->filename,
            'original_filename' => $mediaFile->original_filename,
            'mime_type' => $mediaFile->mime_type,
            'size' => $mediaFile->size,
            'width' => $mediaFile->width ?? null,
            'height' => $mediaFile->height ?? null,
            'disk' => $mediaFile->disk,
            'path' => $mediaFile->path,
            'is_thumbnail' => $isThumbnail,
            'sort_order' => 0,
            'alt_text' => $mediaFile->alt_text ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Create catalog_product_image entries from media_files array with product_id
     * Converts media_files IDs to catalog_product_images IDs
     */
    protected function createCatalogProductImagesWithProduct(array $mediaFileIds, int $productId): array
    {
        $catalogImageIds = [];
        $sortOrder = 0;
        foreach ($mediaFileIds as $mediaFileId) {
            $catalogImageId = $this->createCatalogProductImageWithProduct($mediaFileId, $productId, false);
            if ($catalogImageId) {
                $catalogImageIds[] = $catalogImageId;
                // Update sort order
                DB::table('catalog_product_images')
                    ->where('id', $catalogImageId)
                    ->update(['sort_order' => $sortOrder++]);
            }
        }
        return $catalogImageIds;
    }
}