<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Helpers\SlugHelper;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ProductCodeService;
use App\Traits\ApiResponse;
use App\Events\Product\ProductCreated;
use App\Events\Product\ProductUpdated;
use App\Events\Product\ProductDeleted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    use ApiResponse;

    /**
     * 1. Product List (Optimized - Memory Efficient)
     *
     * OPTIMIZATION NOTES:
     * - Only selects necessary columns to reduce memory
     * - Eager loads relationships to prevent N+1 queries
     * - Does NOT load appends (gallery_images_urls, cross/up_sale) for performance
     * - Variants limited to wholesale channel only (duplicates retail data)
     * - Lightweight pagination for large datasets
     */
    public function index(Request $request)
    {
        // Build base query with optimized column selection
        $query = Product::query()
            // Select only necessary columns for list view
            ->select([
                'products.id',
                'products.name',
                'products.retail_name',
                'products.wholesale_name',
                'products.slug',
                'products.product_code',
                'products.status',
                'products.category_id',
                'products.brand_id',
                'products.thumbnail_id',
                'products.sort_order',
                'products.created_at',
                'products.updated_at',
                'products.deleted_at',
                // Only load gallery_images IDs (not full URLs) for list view
                'products.gallery_images',
            ])
            // Optimize eager loading - select only needed columns
            ->with([
                'category' => fn($q) => $q->select('id', 'name', 'slug'),
                'brand' => fn($q) => $q->select('id', 'name', 'slug'),
                'thumbnail' => fn($q) => $q->select('id', 'filename', 'path', 'url', 'disk'),
                // Load ONLY wholesale variants - retail has identical stock data
                'variants' => fn($q) => $q
                    ->where('channel', 'wholesale')
                    ->select('id', 'product_id', 'channel', 'variant_name', 'sku', 'stock', 'price'),
            ]);

        // Apply filters
        if ($request->search) {
            $query->where('products.name', 'like', "%{$request->search}%")
                  ->orWhereHas('variants', function($q) use ($request) {
                      $q->where('sku', 'like', "%{$request->search}%");
                  });
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

        // Sorting
        if ($request->sort_by) {
            $query->withoutGlobalScope('ordered');

            switch ($request->sort_by) {
                case 'created_at_desc':
                    $query->orderBy('products.created_at', 'desc');
                    break;
                case 'created_at_asc':
                    $query->orderBy('products.created_at', 'asc');
                    break;
                case 'updated_at_desc':
                    $query->orderBy('products.updated_at', 'desc');
                    break;
                case 'updated_at_asc':
                    $query->orderBy('products.updated_at', 'asc');
                    break;
                case 'price_desc':
                    $query->leftJoin('product_variants as pv', function ($join) {
                        $join->on('products.id', '=', 'pv.product_id')
                             ->where('pv.channel', 'wholesale');
                    })
                    ->groupBy('products.id')
                    ->orderByRaw('MIN(pv.price) DESC');
                    break;
                case 'price_asc':
                    $query->leftJoin('product_variants as pv', function ($join) {
                        $join->on('products.id', '=', 'pv.product_id')
                             ->where('pv.channel', 'wholesale');
                    })
                    ->groupBy('products.id')
                    ->orderByRaw('MIN(pv.price) ASC');
                    break;
            }
        }

        // Limit max per_page to prevent memory exhaustion
        $perPage = min((int)($request->per_page ?? 20), 500); // Max 500 per page
        $page = $request->page ?? 1;

        $result = $query->paginate($perPage, ['*'], 'page', $page);

        // Manually append thumbnail URLs - compute directly without accessor
        $result->getCollection()->transform(function ($product) {
            // Add thumbnail URL - compute directly without using append
            if ($product->thumbnail) {
                $thumbnail = $product->thumbnail;

                // 1. If absolute URL exists in DB, use it
                if ($thumbnail->url && str_starts_with($thumbnail->url, 'http')) {
                    $product->thumbnail_url = $thumbnail->url;
                }
                // 2. Otherwise generate from Disk using Storage facade
                elseif (!empty($thumbnail->path)) {
                    $product->thumbnail_url = Storage::disk($thumbnail->disk ?? 'public')->url($thumbnail->path);
                }
                else {
                    $product->thumbnail_url = null;
                }
            }
            // Add currentStock to each variant for frontend compatibility
            $product->variants->transform(function ($variant) {
                $variant->currentStock = (int)($variant->stock ?? 0);
                return $variant;
            });
            // Add basic stock total
            $product->total_stock = $product->variants->sum('stock') ?? 0;
            // Add variant count
            $product->variants_count = $product->variants->count();

            return $product;
        });

        return $this->sendSuccess($result);
    }

    /**
     * 2. Helper: Auto Generate Unique SKU
     */
    public function generateSku(Request $request)
    {
        // Format: CAT-BRAND-RANDOM (e.g., ELEC-SAM-8821)
        $prefix = strtoupper(substr($request->category_name ?? 'GEN', 0, 3));
        $unique = false;
        $sku = '';

        while (!$unique) {
            $sku = $prefix . '-' . rand(10000, 99999);
            if (!ProductVariant::where('sku', $sku)->exists()) {
                $unique = true;
            }
        }

        return $this->sendSuccess(['sku' => $sku]);
    }

    /**
     * 3. Create Product with Multi-Platform Variants
     * POST /api/v2/catalog/products
     */
    public function store(Request $request)
    {
        // Comprehensive validation with custom error messages
        $validated = $request->validate([
            // Product Basic Information
            'productName' => 'required|string|max:255',
            'retailName' => 'nullable|string|max:255',
            'wholesaleName' => 'nullable|string|max:255',
            'retailNameBn' => 'nullable|string|max:255',
            'wholesaleNameBn' => 'nullable|string|max:255',
            'productCode' => 'nullable|string|max:50',
            'category' => 'required|integer|exists:categories,id',
            'brand' => 'required|integer|exists:brands,id',
            'status' => 'required|in:draft,published,archived',
            'videoUrl' => 'nullable|url|max:500',

            // Affiliate Commission
            'affiliateCommission' => 'nullable|numeric|min:0|max:100',

            // Product Settings
            'enableWarranty' => 'boolean',
            'warrantyDetails' => 'nullable|string|max:1000',
            'enablePreorder' => 'boolean',
            'expectedDeliveryDate' => 'nullable|date|after:today',

            // Content
            'description' => 'required|string|min:10',
            'highlights' => 'nullable|array|max:20',
            'highlights.*' => 'string|max:255',
            'descriptionBn' => 'nullable|string',
            'highlightsBn' => 'nullable|array|max:20',
            'highlightsBn.*' => 'string|max:255',
            'attributes' => 'nullable|array|max:20',
            'attributes.*' => 'string|max:255',
            'attributesBn' => 'nullable|array|max:20',
            'attributesBn.*' => 'string|max:255',
            'includesInTheBox' => 'nullable|string|max:1000',
            'includesInTheBoxBn' => 'nullable|string|max:1000',

            // SEO
            'seoTitle' => 'nullable|string|max:60',
            'seoDescription' => 'nullable|string|max:160',
            'seoTags' => 'nullable|string|max:255',

            // Media
            'featuredImage' => 'nullable|integer|exists:media_files,id',
            'galleryImages' => 'nullable|array',
            'galleryImages.*' => 'integer|exists:media_files,id',

            // Variants (at least one required)
            'variants' => 'required|array|min:1',
            'variants.*.name' => 'required|string|max:255',
            'variants.*.sellerSku' => 'nullable|string|max:100',
            'variants.*.purchaseCost' => 'required|numeric|min:0',
            'variants.*.retailPrice' => 'required|numeric|min:0',
            'variants.*.wholesalePrice' => 'required|numeric|min:0',
            'variants.*.retailOfferPrice' => 'nullable|numeric|min:0|lte:variants.*.retailPrice',
            'variants.*.wholesaleOfferPrice' => 'nullable|numeric|min:0|lte:variants.*.wholesalePrice',
            'variants.*.wholesaleMoq' => 'required|integer|min:1',
            'variants.*.weight' => 'required|numeric|min:0|max:999999',
            'variants.*.stock' => 'required|integer|min:0',
        ], [
            // Custom error messages
            'productName.required' => 'Product name is required',
            'category.required' => 'Please select a category',
            'category.exists' => 'Selected category does not exist',
            'brand.required' => 'Please select a brand',
            'brand.exists' => 'Selected brand does not exist',
            'status.in' => 'Status must be draft, published, or archived',
            'videoUrl.url' => 'Video URL must be a valid URL',
            'description.required' => 'Product description is required',
            'description.min' => 'Description must be at least 10 characters',
            'highlights.max' => 'Maximum 20 highlights allowed',
            'highlightsBn.max' => 'Maximum 20 highlights allowed',
            'attributes.max' => 'Maximum 20 attributes allowed',
            'attributesBn.max' => 'Maximum 20 attributes allowed',
            'includesInTheBox.max' => 'Maximum 20 items allowed in box',
            'seoTitle.max' => 'SEO title must not exceed 60 characters',
            'seoDescription.max' => 'SEO description must not exceed 160 characters',
            'featuredImage.exists' => 'Featured image does not exist',
            'variants.required' => 'At least one variant is required',
            'variants.min' => 'At least one variant is required',
            'variants.*.name.required' => 'Variant name is required',
            'variants.*.retailPrice.required' => 'Retail price is required',
            'variants.*.wholesalePrice.required' => 'Wholesale price is required',
            'variants.*.purchaseCost.required' => 'Purchase cost is required',
            'variants.*.retailOfferPrice.lte' => 'Retail offer price cannot be higher than retail price',
            'variants.*.wholesaleOfferPrice.lte' => 'Wholesale offer price cannot be higher than wholesale price',
        ]);

        DB::beginTransaction();
        try {
            // Check for duplicate variant names
            $variantNames = array_column($validated['variants'], 'name');
            if (count($variantNames) !== count(array_unique($variantNames))) {
                $duplicates = array_filter(array_count_values($variantNames), function($count) {
                    return $count > 1;
                });
                $duplicateNames = implode(', ', array_keys($duplicates));

                return $this->sendError('Validation failed', [
                    'variants' => "Variant names must be unique. Duplicate(s) found: {$duplicateNames}"
                ], 422);
            }

            // 1. Create Product
            $product = Product::create([
                'name' => $validated['productName'],
                'retail_name' => $validated['retailName'] ?? $validated['productName'],
                'wholesale_name' => $validated['wholesaleName'] ?? null,
                'retail_name_bn' => $validated['retailNameBn'] ?? null,
                'wholesale_name_bn' => $validated['wholesaleNameBn'] ?? null,
                'product_code' => $validated['productCode'] ?? null,
                'slug' => SlugHelper::generateUniqueSlug($validated['productName'], 'products', 'slug'),
                'category_id' => $validated['category'],
                'brand_id' => $validated['brand'],
                'status' => $validated['status'],
                'video_url' => $validated['videoUrl'],
                'warranty_enabled' => $validated['enableWarranty'],
                'warranty_details' => $validated['warrantyDetails'],
                'description' => $validated['description'],
                'description_bn' => $validated['descriptionBn'] ?? null,
                'highlights' => $validated['highlights'],
                'highlights_bn' => $validated['highlightsBn'] ?? null,
                'attributes' => $validated['attributes'],
                'attributes_bn' => $validated['attributesBn'] ?? null,
                'includes_in_box' => !empty($validated['includesInTheBox']) ? array_map('trim', explode(',', $validated['includesInTheBox'])) : null,
                'includes_in_box_bn' => !empty($validated['includesInTheBoxBn']) ? array_map('trim', explode(',', $validated['includesInTheBoxBn'])) : null,
                'seo_title' => $validated['seoTitle'],
                'seo_description' => $validated['seoDescription'],
                'seo_tags' => $validated['seoTags'] ? explode(',', $validated['seoTags']) : null,
                'thumbnail_id' => $validated['featuredImage'],
                'gallery_images' => $validated['galleryImages'],
            ]);

            // Auto-generate product_code based on category (only if not provided by user)
            if ($product->category_id && $product->product_code === null) {
                $generatedCode = ProductCodeService::generateProductCode($product->category_id);
                if ($generatedCode !== null) {
                    $product->product_code = $generatedCode;
                    $product->save();
                }
            }

            // 3. Create default affiliate commission (uses provided rate or defaults to 5% for all affiliates)
            $commissionRate = isset($validated['affiliateCommission']) ? (float) $validated['affiliateCommission'] : 5.00;
            \App\Models\ProductAffiliateCommission::create([
                'product_id' => $product->id,
                'affiliate_id' => null, // null = all affiliates (global)
                'commission_rate' => $commissionRate,
                'is_active' => true,
            ]);

            // 4. Create Variants - TWO ROWS PER VARIANT (Retail + Wholesale)
            $createdVariants = [];

            foreach ($validated['variants'] as $index => $variant) {
                $baseSku = $variant['sellerSku'] ?? $this->generateSkuFromNames($product->name, $variant['name']);

                \Log::info('Creating variant', [
                    'index' => $index,
                    'name' => $variant['name'],
                    'thumbnail' => $variant['thumbnail'] ?? null
                ]);

                // RETAIL VARIANT ROW
                $retailVariant = ProductVariant::create([
                    'product_id' => $product->id,
                    'channel' => 'retail',
                    'variant_slug' => SlugHelper::generateVariantSlug($product->slug, $variant['name'], 'retail'),
                    'variant_name' => $variant['name'],
                    'thumbnail' => $variant['thumbnail'] ?? null,
                    'sku' => $baseSku . '-R-' . rand(1000, 9999),
                    'custom_sku' => $variant['sellerSku'],
                    'purchase_cost' => $variant['purchaseCost'],
                    'price' => $variant['retailPrice'],
                    'offer_price' => $variant['retailOfferPrice'] ?? 0,
                    'moq' => $variant['wholesaleMoq'],
                    'weight' => $variant['weight'],
                    'stock' => $variant['stock'],
                    'allow_preorder' => $validated['enablePreorder'],
                    'expected_delivery' => $validated['expectedDeliveryDate'],
                    'is_active' => true,
                ]);

                $createdVariants[] = $retailVariant;

                // WHOLESALE VARIANT ROW
                $wholesaleVariant = ProductVariant::create([
                    'product_id' => $product->id,
                    'channel' => 'wholesale',
                    'variant_slug' => SlugHelper::generateVariantSlug($product->slug, $variant['name'], 'wholesale'),
                    'variant_name' => $variant['name'],
                    'thumbnail' => $variant['thumbnail'] ?? null,
                    'sku' => $baseSku . '-W-' . rand(1000, 9999),
                    'custom_sku' => $variant['sellerSku'],
                    'purchase_cost' => $variant['purchaseCost'],
                    'price' => $variant['wholesalePrice'],
                    'offer_price' => $variant['wholesaleOfferPrice'] ?? 0,
                    'moq' => $variant['wholesaleMoq'],
                    'weight' => $variant['weight'],
                    'stock' => $variant['stock'],
                    'allow_preorder' => $validated['enablePreorder'],
                    'expected_delivery' => $validated['expectedDeliveryDate'],
                    'is_active' => true,
                ]);

                $createdVariants[] = $wholesaleVariant;
            }

            DB::commit();

            // Lazychat webhook sent to queue (background) instead of blocking response
            // This prevents timeout issues during product creation
            dispatch(new \App\Jobs\SendLazychatWebhook($product, 'product.created', 'product/create'))
                ->onQueue('lazychat-webhooks');

            return $this->sendSuccess([
                'product' => $product,
                'variants' => $createdVariants,
                'total_variants' => count($createdVariants)
            ], 'Product created successfully with ' . count($createdVariants) . ' variants (2 per platform)', 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return $this->sendError('Validation failed', $e->errors(), 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Product creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->sendError('Product creation failed', [
                'error' => 'An error occurred while creating the product. Please try again.',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Helper: Generate SKU from product and variant names
     */
    private function generateSkuFromNames($productName, $variantName)
    {
        $productCode = strtoupper(substr(Str::slug($productName), 0, 3));
        $variantCode = strtoupper(substr(Str::slug($variantName), 0, 3));
        return $productCode . '-' . $variantCode;
    }

    /**
     * 4. Add Variant (The SKU)
     */
    public function storeVariant(Request $request, $id)
    {
        $request->validate([
            'sku' => 'required|unique:product_variants,sku',
            'price' => 'required|numeric',
            'unit_id' => 'required|exists:units,id'
        ]);

        $product = Product::findOrFail($id);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => $request->sku,
            'custom_sku' => $request->custom_sku, // Owner's secret code
            'variant_name' => $request->variant_name, // e.g. "Red - XL"
            'size' => $request->size,
            'color' => $request->color,
            'unit_id' => $request->unit_id,
            'default_retail_price' => $request->price,
            'default_purchase_cost' => $request->cost ?? 0,
            'stock_alert_level' => $request->alert_qty ?? 5,
        ]);

        return $this->sendSuccess($variant, 'Variant added successfully', 201);
    }

    /**
     * Single Product View - Memory Optimized with Direct SQL
     *
     * COMPLETELY REWRITTEN to use direct SQL queries instead of models.
     * This prevents 512MB memory exhaustion from circular reference serialization.
     *
     * MEMORY BUDGET: ~2-5MB per single product (down from 512MB crash)
     */
    public function show($id)
    {
        // Use DIRECT SQL instead of models - prevents memory exhaustion
        $product = DB::table('products as p')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
            ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
            ->where('p.id', $id)
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
                'c.id as category_id',
                'c.name as category_name',
                'c.slug as category_slug',
                'b.id as brand_id',
                'b.name as brand_name',
                'b.slug as brand_slug',
                'm.id as thumbnail_id',
                'm.path as thumbnail_path',
                'm.url as thumbnail_url',
                'm.disk as thumbnail_disk',
            ])
            ->first();

        if (!$product) {
            return $this->sendError('Product not found', [], 404);
        }

        // Load variants using direct SQL
        $variants = DB::table('product_variants')
            ->where('product_id', $id)
            ->select([
                'id',
                'product_id',
                'channel',
                'variant_name',
                'sku',
                'purchase_cost',
                'stock',
                'price',
                'offer_price',
                'moq',
                'offer_starts',
                'offer_ends',
            ])
            ->get();

        // Transform variants to paired retail/wholesale format
        $variantPairs = $variants->groupBy('variant_name')->map(function ($group) {
            $retail = $group->firstWhere('channel', 'retail');
            $wholesale = $group->firstWhere('channel', 'wholesale');
            $base = $retail ?? $wholesale;

            return [
                'id' => $base->id,
                'retailId' => $retail?->id,
                'wholesaleId' => $wholesale?->id,
                'variantName' => $base->variant_name,
                'sku' => $base->sku,
                'purchaseCost' => (int)($base->purchase_cost ?? 0),
                'stock' => (int)($base->stock ?? 0),
                'currentStock' => (int)($base->stock ?? 0),
                'retailPrice' => (float)($retail?->price ?? 0),
                'retailOfferPrice' => $retail && $retail->offer_price ? (float)$retail->offer_price : null,
                'retailOfferStarts' => $retail?->offer_starts,
                'retailOfferEnds' => $retail?->offer_ends,
                'wholesalePrice' => (float)($wholesale?->price ?? 0),
                'wholesaleOfferPrice' => $wholesale && $wholesale->offer_price ? (float)$wholesale->offer_price : null,
                'wholesaleOfferStarts' => $wholesale?->offer_starts,
                'wholesaleOfferEnds' => $wholesale?->offer_ends,
                'wholesaleMoq' => (int)($wholesale?->moq ?? 1),
            ];
        })->values();

        // Build thumbnail URL
        $thumbnailUrl = null;
        if ($product->thumbnail_id) {
            // 1. If absolute URL exists in DB, use it
            if ($product->thumbnail_url && str_starts_with($product->thumbnail_url, 'http')) {
                $thumbnailUrl = $product->thumbnail_url;
            }
            // 2. Otherwise generate from Disk using Storage facade
            elseif (!empty($product->thumbnail_path)) {
                $disk = $product->thumbnail_disk ?? 'public';
                $thumbnailUrl = Storage::disk($disk)->url($product->thumbnail_path);
            }
        }

        // Parse JSON fields
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

        $galleryImages = $product->gallery_images;
        if (is_string($galleryImages)) {
            $galleryImages = json_decode($galleryImages, true) ?? [];
        }

        // Build response array directly - NO MODEL OVERHEAD
        $response = [
            'id' => $product->id,
            'name' => $product->name,
            'retailName' => $product->retail_name,
            'wholesaleName' => $product->wholesale_name,
            'retailNameBn' => $product->retail_name_bn,
            'wholesaleNameBn' => $product->wholesale_name_bn,
            'slug' => $product->slug,
            'productCode' => $product->product_code,
            'status' => $product->status,
            'description' => $product->description,
            'descriptionBn' => $product->description_bn,
            'highlights' => $highlights ?: [],
            'highlightsBn' => $highlightsBn ?: [],
            'attributes' => $attributes ?: [],
            'attributesBn' => $attributesBn ?: [],
            'includesInBox' => $includesInBox ?: [],
            'includesInBoxBn' => $includesInBoxBn ?: [],
            'videoUrl' => $product->video_url,
            'warrantyEnabled' => (bool)$product->warranty_enabled,
            'warrantyDetails' => $product->warranty_details,
            'seoTitle' => $product->seo_title,
            'seoDescription' => $product->seo_description,
            'seoTags' => $seoTags ?: [],
            'category' => $product->category_id ? [
                'id' => $product->category_id,
                'name' => $product->category_name,
                'slug' => $product->category_slug,
            ] : null,
            'brand' => $product->brand_id ? [
                'id' => $product->brand_id,
                'name' => $product->brand_name,
                'slug' => $product->brand_slug,
            ] : null,
            'thumbnail' => $product->thumbnail_id ? [
                'id' => $product->thumbnail_id,
                'path' => $product->thumbnail_path,
                'url' => $product->thumbnail_url,
                'fullUrl' => $thumbnailUrl,
            ] : null,
            'thumbnailUrl' => $thumbnailUrl,
            'featured_image' => $thumbnailUrl,
            'galleryImages' => $galleryImages ?: [],
            'galleryImagesUrls' => $this->getGalleryImagesUrls($galleryImages ?: []),
            'affiliateCommission' => 5.00,
            'variants' => $variantPairs,
        ];

        // Clear references
        unset($variants, $variantPairs, $product);

        // Return plain array - NOT a model - avoids serialization overhead
        return $this->sendSuccess($response);
    }

    /**
     * Get gallery image URLs - PURE SQL version (no models, no appends)
     * This prevents memory issues from model serialization
     */
    private function getGalleryImagesUrls($galleryIds): array
    {
        if (empty($galleryIds) || !is_array($galleryIds)) {
            return [];
        }

        // Use raw query to get ONLY the data we need
        $results = DB::table('media_files')
            ->whereIn('id', $galleryIds)
            ->select('id', 'path', 'url')
            ->get()
            ->keyBy('id');

        // Build URLs preserving order - no model overhead
        $urls = [];
        foreach ($galleryIds as $id) {
            if (isset($results[$id])) {
                $file = $results[$id];
                // Use absolute URL if exists, otherwise generate from path
                $urls[] = ($file->url && str_starts_with($file->url, 'http'))
                    ? $file->url
                    : url($file->path ?? '');
            }
        }

        return $urls;
    }

    /**
     * Link Supplier to Product
     * Route: POST /api/v2/products/{id}/suppliers
     */
    // Method: addSupplier

    public function addSupplier(Request $request, $id)
    {
        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'product_links' => 'nullable|array', // Must be an array
            'product_links.*' => 'url', // Each item must be a valid URL
            'cost_price' => 'nullable|numeric'
        ]);

        $product = Product::findOrFail($id);

        // Sync without detaching
        // Laravel automatically converts the array to JSON for the DB
        $product->suppliers()->syncWithoutDetaching([
            $request->supplier_id => [
                'product_links' => json_encode($request->product_links), // Explicit encode helps avoid issues
                'cost_price' => $request->cost_price
            ]
        ]);

        return $this->sendSuccess($product->load('suppliers'), 'Supplier linked with multiple URLs');
    }

    /**
     * Update Product (Memory Optimized with Direct SQL)
     *
     * OPTIMIZED: Uses direct SQL queries instead of Eloquent models to prevent memory exhaustion.
     * This follows the same pattern as the show() method.
     *
     * MEMORY BUDGET: ~5-10MB per product update (down from 512MB crash)
     *
     * PUT/PATCH /api/v2/catalog/products/{id}
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'productName' => 'sometimes|required|string',
            'retailName' => 'nullable|string',
            'wholesaleName' => 'nullable|string',
            'retailNameBn' => 'nullable|string',
            'wholesaleNameBn' => 'nullable|string',
            'productCode' => 'nullable|string',
            'category' => 'sometimes|required|exists:categories,id',
            'brand' => 'nullable|exists:brands,id',
            'status' => 'in:draft,published,archived',
            'description' => 'sometimes|required|string|min:10',
            'highlights' => 'nullable|array|max:20',
            'highlights.*' => 'string|max:255',
            'descriptionBn' => 'nullable|string',
            'highlightsBn' => 'nullable|array|max:20',
            'highlightsBn.*' => 'string|max:255',
            'attributes' => 'nullable|array|max:20',
            'attributes.*' => 'string|max:255',
            'attributesBn' => 'nullable|array|max:20',
            'attributesBn.*' => 'string|max:255',
            'includesInTheBox' => 'nullable|string|max:1000',
            'includesInTheBoxBn' => 'nullable|string|max:1000',
            'featuredImage' => 'nullable|integer|exists:media_files,id',
            'galleryImages' => 'nullable|array',
            'galleryImages.*' => 'integer|exists:media_files,id',
            'crossSale' => 'nullable|string',
            'upSale' => 'nullable|string',
            'thankYou' => 'nullable|boolean',
            'enablePreorder' => 'nullable|boolean',
            'expectedDeliveryDate' => 'nullable|date',
            'affiliateCommission' => 'nullable|numeric|min:0|max:100',
            'variants' => 'nullable|array',
            'variants.*.name' => 'nullable|string',
            'variants.*.sellerSku' => 'nullable|string',
            'variants.*.purchaseCost' => 'nullable|numeric',
            'variants.*.retailPrice' => 'nullable|numeric',
            'variants.*.wholesalePrice' => 'nullable|numeric',
            'variants.*.retailOfferPrice' => 'nullable|numeric',
            'variants.*.wholesaleOfferPrice' => 'nullable|numeric',
            'variants.*.wholesaleMoq' => 'nullable|integer',
            'variants.*.weight' => 'nullable|numeric',
            'variants.*.stock' => 'nullable|integer',
            'variants.*.thumbnail' => 'nullable|string',
            'variants.*.retail_id' => 'nullable|integer',
            'variants.*.wholesale_id' => 'nullable|integer',
        ]);

        // Load product using DIRECT SQL (not Eloquent) to prevent memory exhaustion
        $product = DB::table('products as p')
            ->where('p.id', $id)
            ->select(['p.*'])
            ->first();

        if (!$product) {
            return $this->sendError('Product not found', [], 404);
        }

        // Free memory immediately after getting current values
        $currentSlug = $product->slug;
        $currentName = $product->name;

        DB::beginTransaction();
        try {
            // Generate new slug if product name changed
            $newSlug = $currentSlug;
            if (isset($validated['productName']) && $validated['productName'] !== $currentName) {
                $newSlug = SlugHelper::generateUniqueSlug($validated['productName'], 'products', 'slug');
            }

            // Prepare includes_in_box: frontend may send comma-separated string
            $includesInTheBox = $product->includes_in_box;
            if (array_key_exists('includesInTheBox', $validated)) {
                $val = $validated['includesInTheBox'];
                $includesInTheBox = !empty($val) ? array_map('trim', explode(',', $val)) : null;
            }

            // Prepare seo_tags: frontend sends comma-separated string
            $seoTags = $product->seo_tags;
            if (is_string($seoTags)) {
                $seoTags = json_decode($seoTags, true) ?? [];
            }
            if (array_key_exists('seoTags', $validated)) {
                $val = $validated['seoTags'];
                $seoTags = !empty($val) ? array_map('trim', explode(',', $val)) : null;
            }

            // Prepare includes_in_box_bn
            $includesInTheBoxBn = $product->includes_in_box_bn;
            if (is_string($includesInTheBoxBn)) {
                $includesInTheBoxBn = json_decode($includesInTheBoxBn, true) ?? [];
            }
            if (array_key_exists('includesInTheBoxBn', $validated)) {
                $val = $validated['includesInTheBoxBn'];
                $includesInTheBoxBn = !empty($val) ? array_map('trim', explode(',', $val)) : [];
            }

            // Parse JSON fields if they're strings
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
            $galleryImages = $product->gallery_images;
            if (is_string($galleryImages)) {
                $galleryImages = json_decode($galleryImages, true) ?? [];
            }

            // Update product using DB::table (not Eloquent model)
            DB::table('products')
                ->where('id', $id)
                ->update([
                    'name' => $validated['productName'] ?? $product->name,
                    'retail_name' => $validated['retailName'] ?? ($validated['productName'] ?? $product->retail_name),
                    'wholesale_name' => $validated['wholesaleName'] ?? $product->wholesale_name,
                    'retail_name_bn' => array_key_exists('retailNameBn', $validated) ? $validated['retailNameBn'] : $product->retail_name_bn,
                    'wholesale_name_bn' => array_key_exists('wholesaleNameBn', $validated) ? $validated['wholesaleNameBn'] : $product->wholesale_name_bn,
                    'product_code' => array_key_exists('productCode', $validated) ? $validated['productCode'] : $product->product_code,
                    'slug' => $newSlug,
                    'category_id' => $validated['category'] ?? $product->category_id,
                    'brand_id' => $validated['brand'] ?? $product->brand_id,
                    'thumbnail_id' => array_key_exists('featuredImage', $validated) ? $validated['featuredImage'] : $product->thumbnail_id,
                    'gallery_images' => array_key_exists('galleryImages', $validated) ? $validated['galleryImages'] : $galleryImages,
                    'description' => $validated['description'] ?? $product->description,
                    'description_bn' => array_key_exists('descriptionBn', $validated) ? $validated['descriptionBn'] : $product->description_bn,
                    'video_url' => $validated['videoUrl'] ?? $product->video_url,
                    'seo_title' => $validated['seoTitle'] ?? $product->seo_title,
                    'seo_description' => $validated['seoDescription'] ?? $product->seo_description,
                    'seo_tags' => $seoTags,
                    'status' => $validated['status'] ?? $product->status,
                    'warranty_enabled' => array_key_exists('enableWarranty', $validated) ? filter_var($validated['enableWarranty'], FILTER_VALIDATE_BOOLEAN) : $product->warranty_enabled,
                    'warranty_details' => array_key_exists('warrantyDetails', $validated) && $validated['warrantyDetails'] !== '' ? $validated['warrantyDetails'] : $product->warranty_details,
                    'highlights' => $validated['highlights'] ?? $highlights,
                    'highlights_bn' => $validated['highlightsBn'] ?? $highlightsBn,
                    'attributes' => $validated['attributes'] ?? $attributes,
                    'attributes_bn' => $validated['attributesBn'] ?? $attributesBn,
                    'includes_in_box' => $includesInTheBox,
                    'includes_in_box_bn' => $includesInTheBoxBn,
                    'cross_sale' => array_key_exists('crossSale', $validated) ? $validated['crossSale'] : $product->cross_sale,
                    'up_sale' => array_key_exists('upSale', $validated) ? $validated['upSale'] : $product->up_sale,
                    'thank_you' => array_key_exists('thankYou', $validated) ? $validated['thankYou'] : $product->thank_you,
                    'updated_at' => now(),
                ]);

            // Clear product from memory
            unset($product);

            // Auto-generate product_code if null and category has code
            $updatedProduct = DB::table('products')->where('id', $id)->select('id', 'product_code', 'category_id', 'slug', 'name')->first();
            if ($updatedProduct->product_code === null && $updatedProduct->category_id) {
                $generatedCode = ProductCodeService::generateProductCode($updatedProduct->category_id);
                if ($generatedCode !== null) {
                    DB::table('products')->where('id', $id)->update(['product_code' => $generatedCode]);
                }
            }
            unset($updatedProduct);

            // Update affiliate commission (global commission for all affiliates)
            if (array_key_exists('affiliateCommission', $validated)) {
                $commissionRate = (float) $validated['affiliateCommission'];

                // Use DB query instead of model
                $existingCommission = DB::table('product_affiliate_commissions')
                    ->where('product_id', $id)
                    ->whereNull('affiliate_id')
                    ->first();

                if ($existingCommission) {
                    DB::table('product_affiliate_commissions')
                        ->where('id', $existingCommission->id)
                        ->update(['commission_rate' => $commissionRate]);
                } else {
                    DB::table('product_affiliate_commissions')->insert([
                        'product_id' => $id,
                        'affiliate_id' => null,
                        'commission_rate' => $commissionRate,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                unset($existingCommission);
            }

            // Handle variants update (create, update, delete)
            if (isset($validated['variants']) && is_array($validated['variants'])) {
                // Get all existing variant IDs using direct SQL
                $existingRetailIds = DB::table('product_variants')
                    ->where('product_id', $id)
                    ->where('channel', 'retail')
                    ->pluck('id')
                    ->toArray();
                $existingWholesaleIds = DB::table('product_variants')
                    ->where('product_id', $id)
                    ->where('channel', 'wholesale')
                    ->pluck('id')
                    ->toArray();

                $submittedRetailIds = [];
                $submittedWholesaleIds = [];
                $newSlugForVariants = $newSlug; // Use the slug we computed earlier

                foreach ($validated['variants'] as $variantData) {
                    // Common fields
                    $commonFields = [
                        'variant_name' => $variantData['name'],
                        'purchase_cost' => $variantData['purchaseCost'] ?? 0,
                        'weight' => $variantData['weight'] ?? 0,
                        'stock' => $variantData['stock'] ?? 0,
                        'allow_preorder' => $validated['enablePreorder'] ?? false,
                        'expected_delivery' => $validated['expectedDeliveryDate'] ?? null,
                    ];

                    $isNewVariant = empty($variantData['retail_id']) && empty($variantData['wholesale_id']);

                    if ($isNewVariant) {
                        // Create new retail + wholesale variant pair using direct SQL
                        $retailSlug = SlugHelper::generateVariantSlug($newSlugForVariants, $variantData['name'], 'retail');
                        $wholesaleSlug = SlugHelper::generateVariantSlug($newSlugForVariants, $variantData['name'], 'wholesale');

                        $baseSku = $variantData['sellerSku'] ?? $this->generateSkuFromNames($validated['productName'] ?? $currentName, $variantData['name']);

                        // Insert retail variant
                        $retailId = DB::table('product_variants')->insertGetId([
                            'product_id' => $id,
                            'channel' => 'retail',
                            'variant_slug' => $retailSlug,
                            'variant_name' => $variantData['name'],
                            'thumbnail' => $variantData['thumbnail'] ?? null,
                            'sku' => $baseSku . '-R-' . rand(1000, 9999),
                            'custom_sku' => $variantData['sellerSku'] ?? null,
                            'purchase_cost' => $commonFields['purchase_cost'],
                            'price' => ($variantData['retailPrice'] ?? 0) * 100,
                            'offer_price' => ($variantData['retailOfferPrice'] ?? 0) * 100,
                            'weight' => $commonFields['weight'],
                            'stock' => $commonFields['stock'],
                            'allow_preorder' => $commonFields['allow_preorder'],
                            'expected_delivery' => $commonFields['expected_delivery'],
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        // Insert wholesale variant
                        $wholesaleId = DB::table('product_variants')->insertGetId([
                            'product_id' => $id,
                            'channel' => 'wholesale',
                            'variant_slug' => $wholesaleSlug,
                            'variant_name' => $variantData['name'],
                            'thumbnail' => $variantData['thumbnail'] ?? null,
                            'sku' => $baseSku . '-W-' . rand(1000, 9999),
                            'custom_sku' => $variantData['sellerSku'] ?? null,
                            'purchase_cost' => $commonFields['purchase_cost'],
                            'price' => ($variantData['wholesalePrice'] ?? 0) * 100,
                            'offer_price' => ($variantData['wholesaleOfferPrice'] ?? 0) * 100,
                            'moq' => $variantData['wholesaleMoq'] ?? 6,
                            'weight' => $commonFields['weight'],
                            'stock' => $commonFields['stock'],
                            'allow_preorder' => $commonFields['allow_preorder'],
                            'expected_delivery' => $commonFields['expected_delivery'],
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        $submittedRetailIds[] = $retailId;
                        $submittedWholesaleIds[] = $wholesaleId;

                    } else {
                        // Track submitted IDs
                        if (!empty($variantData['retail_id'])) {
                            $submittedRetailIds[] = $variantData['retail_id'];
                        }
                        if (!empty($variantData['wholesale_id'])) {
                            $submittedWholesaleIds[] = $variantData['wholesale_id'];
                        }

                        // Update retail variant using direct SQL
                        if (!empty($variantData['retail_id'])) {
                            $existingRetail = DB::table('product_variants')
                                ->where('id', $variantData['retail_id'])
                                ->where('product_id', $id)
                                ->first();

                            if ($existingRetail) {
                                $newRetailSlug = $existingRetail->variant_slug;
                                if (isset($variantData['name']) && $variantData['name'] !== $existingRetail->variant_name) {
                                    $newRetailSlug = SlugHelper::generateVariantSlug($newSlugForVariants, $variantData['name'], 'retail');
                                }

                                $updateData = array_merge($commonFields, [
                                    'variant_slug' => $newRetailSlug,
                                    'sku' => $variantData['sellerSku'] ?? $existingRetail->sku,
                                    'price' => ($variantData['retailPrice'] ?? 0) * 100,
                                    'offer_price' => ($variantData['retailOfferPrice'] ?? 0) * 100,
                                    'updated_at' => now(),
                                ]);

                                if (array_key_exists('thumbnail', $variantData)) {
                                    $updateData['thumbnail'] = $variantData['thumbnail'];
                                }

                                DB::table('product_variants')
                                    ->where('id', $variantData['retail_id'])
                                    ->update($updateData);
                                unset($existingRetail);
                            }
                        }

                        // Update wholesale variant using direct SQL
                        if (!empty($variantData['wholesale_id'])) {
                            $existingWholesale = DB::table('product_variants')
                                ->where('id', $variantData['wholesale_id'])
                                ->where('product_id', $id)
                                ->first();

                            if ($existingWholesale) {
                                $newWholesaleSlug = $existingWholesale->variant_slug;
                                if (isset($variantData['name']) && $variantData['name'] !== $existingWholesale->variant_name) {
                                    $newWholesaleSlug = SlugHelper::generateVariantSlug($newSlugForVariants, $variantData['name'], 'wholesale');
                                }

                                $updateData = array_merge($commonFields, [
                                    'variant_slug' => $newWholesaleSlug,
                                    'price' => ($variantData['wholesalePrice'] ?? 0) * 100,
                                    'offer_price' => ($variantData['wholesaleOfferPrice'] ?? 0) * 100,
                                    'updated_at' => now(),
                                ]);

                                if (array_key_exists('wholesaleMoq', $variantData)) {
                                    $updateData['moq'] = $variantData['wholesaleMoq'];
                                }

                                if (array_key_exists('thumbnail', $variantData)) {
                                    $updateData['thumbnail'] = $variantData['thumbnail'];
                                }

                                DB::table('product_variants')
                                    ->where('id', $variantData['wholesale_id'])
                                    ->update($updateData);
                                unset($existingWholesale);
                            }
                        }
                    }
                }

                // Delete variants that were removed using direct SQL
                $retailIdsToDelete = array_diff($existingRetailIds, $submittedRetailIds);
                $wholesaleIdsToDelete = array_diff($existingWholesaleIds, $submittedWholesaleIds);

                if (!empty($retailIdsToDelete)) {
                    DB::table('product_variants')->whereIn('id', $retailIdsToDelete)->delete();
                }
                if (!empty($wholesaleIdsToDelete)) {
                    DB::table('product_variants')->whereIn('id', $wholesaleIdsToDelete)->delete();
                }
            }

            DB::commit();

            // Lazychat webhook - load minimal Product model (only ID, no relationships to avoid memory overhead)
            $webhookProduct = new Product();
            $webhookProduct->id = $id;
            dispatch(new \App\Jobs\SendLazychatWebhook($webhookProduct, 'product.updated', 'product/update'))
                ->onQueue('lazychat-webhooks');
            unset($webhookProduct);

            // Build response using DIRECT SQL (no Eloquent models)
            // This is the same optimized approach as show() method
            $responseProduct = DB::table('products as p')
                ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
                ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
                ->where('p.id', $id)
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
                    'p.cross_sale',
                    'p.up_sale',
                    'p.created_at',
                    'p.updated_at',
                    'c.id as category_id',
                    'c.name as category_name',
                    'c.slug as category_slug',
                    'b.id as brand_id',
                    'b.name as brand_name',
                    'b.slug as brand_slug',
                    'm.id as thumbnail_id',
                    'm.path as thumbnail_path',
                    'm.url as thumbnail_url',
                    'm.disk as thumbnail_disk',
                ])
                ->first();

            if (!$responseProduct) {
                return $this->sendError('Failed to load updated product', [], 500);
            }

            // Load variants using direct SQL
            $variants = DB::table('product_variants')
                ->where('product_id', $id)
                ->select([
                    'id',
                    'product_id',
                    'channel',
                    'variant_slug',
                    'variant_name',
                    'thumbnail',
                    'sku',
                    'custom_sku',
                    'color',
                    'size',
                    'weight',
                    'stock',
                    'moq',
                    'is_active',
                    'allow_preorder',
                    'expected_delivery',
                    'price',
                    'offer_price',
                    'offer_starts',
                    'offer_ends',
                ])
                ->get();

            // Transform variants to paired format (same as show() method)
            $variantPairs = $variants->groupBy('variant_name')->map(function ($group) {
                $retail = $group->firstWhere('channel', 'retail');
                $wholesale = $group->firstWhere('channel', 'wholesale');
                $base = $retail ?? $wholesale;

                $stockValue = (int)($base->stock ?? 0);

                // Build thumbnail URL
                $thumbnailUrl = null;
                if ($base->thumbnail) {
                    if (str_starts_with($base->thumbnail, 'http')) {
                        $thumbnailUrl = $base->thumbnail;
                    } else {
                        $thumbnailUrl = Storage::disk('public')->url($base->thumbnail);
                    }
                }

                return [
                    'id' => $base->id,
                    'retailId' => $retail?->id,
                    'wholesaleId' => $wholesale?->id,
                    'productId' => $base->product_id,
                    'variantName' => $base->variant_name,
                    'variantSlug' => $base->variant_slug,
                    'customSku' => $base->custom_sku,
                    'sku' => $base->sku,
                    'thumbnail' => $thumbnailUrl,
                    'weight' => (float)($base->weight ?? 0),
                    'stock' => $stockValue,
                    'currentStock' => $stockValue,
                    'moq' => (int)($base->moq ?? 1),
                    'isActive' => (bool)($base->is_active ?? true),
                    'allowPreorder' => (bool)($base->allow_preorder ?? false),
                    'expectedDelivery' => $base->expected_delivery,
                    'retailPrice' => ($retail?->price ?? 0) / 100,
                    'retailOfferPrice' => $retail && $retail->offer_price ? $retail->offer_price / 100 : null,
                    'retailOfferStarts' => $retail?->offer_starts,
                    'retailOfferEnds' => $retail?->offer_ends,
                    'retailSku' => $retail?->sku,
                    'wholesalePrice' => ($wholesale?->price ?? 0) / 100,
                    'wholesaleOfferPrice' => $wholesale && $wholesale->offer_price ? $wholesale->offer_price / 100 : null,
                    'wholesaleOfferStarts' => $wholesale?->offer_starts,
                    'wholesaleOfferEnds' => $wholesale?->offer_ends,
                    'wholesaleSku' => $wholesale?->sku,
                ];
            })->values();

            // Parse JSON fields for response
            $highlights = $responseProduct->highlights;
            if (is_string($highlights)) {
                $highlights = json_decode($highlights, true) ?? [];
            }
            $highlightsBn = $responseProduct->highlights_bn;
            if (is_string($highlightsBn)) {
                $highlightsBn = json_decode($highlightsBn, true) ?? [];
            }
            $attributes = $responseProduct->attributes;
            if (is_string($attributes)) {
                $attributes = json_decode($attributes, true) ?? [];
            }
            $attributesBn = $responseProduct->attributes_bn;
            if (is_string($attributesBn)) {
                $attributesBn = json_decode($attributesBn, true) ?? [];
            }
            $includesInBox = $responseProduct->includes_in_box;
            if (is_string($includesInBox)) {
                $includesInBox = json_decode($includesInBox, true) ?? [];
            }
            $includesInBoxBn = $responseProduct->includes_in_box_bn;
            if (is_string($includesInBoxBn)) {
                $includesInBoxBn = json_decode($includesInBoxBn, true) ?? [];
            }
            $seoTags = $responseProduct->seo_tags;
            if (is_string($seoTags)) {
                $seoTags = json_decode($seoTags, true) ?? [];
            }
            $galleryImages = $responseProduct->gallery_images;
            if (is_string($galleryImages)) {
                $galleryImages = json_decode($galleryImages, true) ?? [];
            }

            // Build thumbnail URL
            $thumbnailUrl = null;
            if ($responseProduct->thumbnail_id) {
                if ($responseProduct->thumbnail_url && str_starts_with($responseProduct->thumbnail_url, 'http')) {
                    $thumbnailUrl = $responseProduct->thumbnail_url;
                } elseif (!empty($responseProduct->thumbnail_path)) {
                    $thumbnailUrl = Storage::disk($responseProduct->thumbnail_disk ?? 'public')->url($responseProduct->thumbnail_path);
                }
            }

            // Build final response array (plain array, not a model)
            $finalResponse = [
                'id' => $responseProduct->id,
                'name' => $responseProduct->name,
                'retailName' => $responseProduct->retail_name,
                'wholesaleName' => $responseProduct->wholesale_name,
                'retailNameBn' => $responseProduct->retail_name_bn,
                'wholesaleNameBn' => $responseProduct->wholesale_name_bn,
                'slug' => $responseProduct->slug,
                'productCode' => $responseProduct->product_code,
                'status' => $responseProduct->status,
                'description' => $responseProduct->description,
                'descriptionBn' => $responseProduct->description_bn,
                'highlights' => $highlights ?: [],
                'highlightsBn' => $highlightsBn ?: [],
                'attributes' => $attributes ?: [],
                'attributesBn' => $attributesBn ?: [],
                'includesInBox' => $includesInBox ?: [],
                'includesInBoxBn' => $includesInBoxBn ?: [],
                'videoUrl' => $responseProduct->video_url,
                'warrantyEnabled' => (bool)$responseProduct->warranty_enabled,
                'warrantyDetails' => $responseProduct->warranty_details,
                'seoTitle' => $responseProduct->seo_title,
                'seoDescription' => $responseProduct->seo_description,
                'seoTags' => $seoTags ?: [],
                'category' => $responseProduct->category_id ? [
                    'id' => $responseProduct->category_id,
                    'name' => $responseProduct->category_name,
                    'slug' => $responseProduct->category_slug,
                ] : null,
                'brand' => $responseProduct->brand_id ? [
                    'id' => $responseProduct->brand_id,
                    'name' => $responseProduct->brand_name,
                    'slug' => $responseProduct->brand_slug,
                ] : null,
                'thumbnail' => $responseProduct->thumbnail_id ? [
                    'id' => $responseProduct->thumbnail_id,
                    'path' => $responseProduct->thumbnail_path,
                    'url' => $responseProduct->thumbnail_url,
                    'fullUrl' => $thumbnailUrl,
                ] : null,
                'thumbnailUrl' => $thumbnailUrl,
                'featured_image' => $thumbnailUrl,
                'galleryImages' => $galleryImages ?: [],
                'galleryImagesUrls' => $this->getGalleryImagesUrls($galleryImages ?: []),
                'affiliateCommission' => 5.00,
                'variants' => $variantPairs,
                'cross_sale' => $responseProduct->cross_sale,
                'up_sale' => $responseProduct->up_sale,
                'created_at' => $responseProduct->created_at,
                'updated_at' => $responseProduct->updated_at,
            ];

            // Free all variables before returning
            unset($responseProduct, $variants, $variantPairs, $thumbnailUrl);

            return $this->sendSuccess($finalResponse, 'Product updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Product update failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete Product (Soft Delete)
     * DELETE /api/v2/catalog/products/{id}
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        DB::beginTransaction();
        try {
            $product->delete();
            DB::commit();

            // Lazychat webhook sent to queue (background) instead of blocking response
            // This prevents timeout issues during product deletion
            dispatch(new \App\Jobs\SendLazychatWebhook($product, 'product.deleted', 'product/delete', true))
                ->onQueue('lazychat-webhooks');

            return $this->sendSuccess(null, 'Product deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Product deletion failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Duplicate Product
     * POST /api/v2/catalog/products/{id}/duplicate
     */
    public function duplicate($id)
    {
        $product = Product::with(['variants', 'category', 'brand', 'thumbnail'])->findOrFail($id);

        DB::beginTransaction();
        try {
            // Create new product from existing
            $newProduct = Product::create([
                'name' => $product->name . ' (Copy)',
                'slug' => Str::slug($product->name) . '-copy-' . time(),
                'category_id' => $product->category_id,
                'brand_id' => $product->brand_id,
                'thumbnail_id' => $product->thumbnail_id,
                'gallery_images' => $product->gallery_images,
                'description' => $product->description,
                'status' => 'draft', // Always start as draft
                'video_url' => $product->video_url
            ]);

            // Duplicate variants
            foreach ($product->variants as $variant) {
                $newVariant = $variant->replicate();
                $newVariant->product_id = $newProduct->id;

                // Generate unique SKU
                $originalSku = $variant->sku;
                $newSku = $originalSku . '-COPY';
                $counter = 1;
                while (ProductVariant::where('sku', $newSku)->exists()) {
                    $newSku = $originalSku . '-COPY-' . $counter;
                    $counter++;
                }
                $newVariant->sku = $newSku;

                // Generate unique variant_slug
                $originalSlug = $variant->variant_slug;
                $newSlug = $originalSlug . '-copy-' . time() . '-' . rand(1000, 9999);
                $newVariant->variant_slug = $newSlug;

                $newVariant->save();
            }

            DB::commit();

            // Lazychat webhook sent to queue (background) instead of blocking response
            // This prevents timeout issues during product duplication
            dispatch(new \App\Jobs\SendLazychatWebhook($newProduct, 'product.created', 'product/create'))
                ->onQueue('lazychat-webhooks');

            // Transform variants to plain arrays - prevents model appends overhead
            // Load all variant data needed for the response
            $newProduct->load(['variants' => fn($q) => $q->select(
                'id',
                'product_id',
                'channel',
                'variant_slug',
                'variant_name',
                'thumbnail',
                'sku',
                'custom_sku',
                'color',
                'size',
                'material',
                'weight',
                'pattern',
                'unit_id',
                'unit_value',
                'purchase_cost',
                'stock',
                'stock_alert_level',
                'moq',
                'is_active',
                'allow_preorder',
                'expected_delivery',
                'price',
                'offer_price',
                'offer_starts',
                'offer_ends'
            )]);

            $variants = $newProduct->variants->groupBy('variant_name')->map(function ($group) {
                $retail  = $group->firstWhere('channel', 'retail');
                $wholesale = $group->firstWhere('channel', 'wholesale');
                $base = $retail ?? $wholesale;

                // Use stock directly from column - current_stock is just a cast
                $stockValue = (int)($base->stock ?? 0);

                return [
                    'id'                    => $base->id,
                    'retailId'              => $retail?->id,
                    'wholesaleId'           => $wholesale?->id,
                    'productId'             => $base->product_id,
                    'variantName'           => $base->variant_name,
                    'variantSlug'           => $base->variant_slug,
                    'customSku'             => $base->custom_sku,
                    'sku'                   => $base->sku,
                    'thumbnail'             => $base->thumbnail ? (str_starts_with($base->thumbnail, 'http') ? $base->thumbnail : url($base->thumbnail)) : null,
                    'color'                 => $base->color,
                    'size'                  => $base->size,
                    'material'              => $base->material,
                    'weight'                => (float)($base->weight ?? 0),
                    'pattern'               => $base->pattern,
                    'unitId'                => $base->unit_id,
                    'unitValue'             => $base->unit_value,
                    'purchaseCost'          => $base->purchase_cost ? (int) $base->purchase_cost : 0,
                    'stock'                 => $stockValue,
                    'currentStock'          => $stockValue, // Use stock directly - no accessor overhead
                    'stockAlertLevel'       => (int)($base->stock_alert_level ?? 5),
                    'moq'                   => (int)($base->moq ?? 1),
                    'isActive'              => (bool)($base->is_active ?? true),
                    'allowPreorder'         => (bool)($base->allow_preorder ?? false),
                    'expectedDelivery'      => $base->expected_delivery,
                    'retailPrice'           => $retail ? (float) $retail->price : 0,
                    'retailOfferPrice'      => $retail && $retail->offer_price ? (float) $retail->offer_price : null,
                    'retailOfferStarts'     => $retail?->offer_starts,
                    'retailOfferEnds'       => $retail?->offer_ends,
                    'retailSku'             => $retail?->sku,
                    'wholesalePrice'        => $wholesale ? (float) $wholesale->price : 0,
                    'wholesaleOfferPrice'   => $wholesale && $wholesale->offer_price ? (float) $wholesale->offer_price : null,
                    'wholesaleOfferStarts'  => $wholesale?->offer_starts,
                    'wholesaleOfferEnds'    => $wholesale?->offer_ends,
                    'wholesaleSku'          => $wholesale?->sku,
                ];
            })->values();
            $newProduct->setRelation('variants', $variants);

            return $this->sendSuccess($newProduct->load(['category', 'brand', 'thumbnail']), 'Product duplicated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Product duplication failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Generate Product Code for a Category
     * GET /api/v2/catalog/products/generate-code/{categoryId}
     */
    public function generateProductCode($categoryId)
    {
        $generatedCode = ProductCodeService::generateProductCode((int) $categoryId);

        if ($generatedCode === null) {
            return $this->sendError('Category has no code assigned', ['categoryId' => $categoryId], 404);
        }

        return $this->sendSuccess([
            'product_code' => $generatedCode,
            'category_id' => $categoryId,
        ], 'Product code generated successfully');
    }

    /**
     * Quick Status Change
     * PATCH /api/v2/catalog/products/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,published,archived'
        ]);

        $product = Product::findOrFail($id);
        $product->update(['status' => $request->status]);

        return $this->sendSuccess($product, 'Product status updated successfully');
    }

    /**
     * Reorder Products (Drag & Drop)
     * POST /api/v2/catalog/products/reorder
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'products' => 'required|array',
            'products.*.id' => 'required|integer|exists:products,id',
            'products.*.sort_order' => 'required|integer|min:0',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->products as $productData) {
                Product::where('id', $productData['id'])
                    ->update(['sort_order' => $productData['sort_order']]);
            }

            DB::commit();
            return $this->sendSuccess(null, 'Products reordered successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to reorder products', ['error' => $e->getMessage()], 500);
        }
    }
}