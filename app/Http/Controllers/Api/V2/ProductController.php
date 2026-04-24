<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Helpers\SlugHelper;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    use ApiResponse;

    /**
     * 1. Product List (With Stock Info)
     */
    public function index(Request $request)
    {
        // Dashboard shows wholesale channel only — each logical variant
        // is stored as 2 rows (retail + wholesale) with identical stock.
        // Filtering avoids doubled variant count and doubled stock total.
        $query = Product::with([
            'category', 'brand', 'thumbnail',
            'variants' => fn($q) => $q->where('channel', 'wholesale'),
            'variants.batches',
        ]);

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhereHas('variants', function($q) use ($request) {
                      $q->where('sku', 'like', "%{$request->search}%");
                  });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->brand_id) {
            $query->where('brand_id', $request->brand_id);
        }

        // Sorting
        if ($request->sort_by) {
            // Remove global scope when explicit sorting is applied
            $query->withoutGlobalScope('ordered');

            switch ($request->sort_by) {
                case 'created_at_desc':
                    $query->orderBy('created_at', 'desc');
                    break;
                case 'created_at_asc':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'updated_at_desc':
                    $query->orderBy('updated_at', 'desc');
                    break;
                case 'updated_at_asc':
                    $query->orderBy('updated_at', 'asc');
                    break;
                case 'price_desc':
                    $query->with(['variants' => function($q) {
                        $q->where('channel', 'wholesale')->orderBy('price', 'desc');
                    }])
                    ->select('products.*')
                    ->leftJoin('product_variants as pv', function ($join) {
                        $join->on('products.id', '=', 'pv.product_id')
                             ->where('pv.channel', 'wholesale');
                    })
                    ->groupBy('products.id')
                    ->orderByRaw('MIN(pv.price) DESC');
                    break;
                case 'price_asc':
                    $query->with(['variants' => function($q) {
                        $q->where('channel', 'wholesale')->orderBy('price', 'asc');
                    }])
                    ->select('products.*')
                    ->leftJoin('product_variants as pv', function ($join) {
                        $join->on('products.id', '=', 'pv.product_id')
                             ->where('pv.channel', 'wholesale');
                    })
                    ->groupBy('products.id')
                    ->orderByRaw('MIN(pv.price) ASC');
                    break;
            }
        }
        // If no sort_by is provided (or 'all'), the global scope (sort_order, then id) will be used

        $perPage = $request->per_page ?? 20;
        $page = $request->page ?? 1;

        return $this->sendSuccess($query->paginate($perPage, ['*'], 'page', $page));
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
            'category' => 'required|integer|exists:categories,id',
            'brand' => 'required|integer|exists:brands,id',
            'status' => 'required|in:draft,published,archived',
            'videoUrl' => 'nullable|url|max:500',

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
            'includesInTheBox' => 'nullable|string|max:1000',
            'includesInTheBoxBn' => 'nullable|string|max:1000',

            // SEO
            'seoTitle' => 'nullable|string|max:60',
            'seoDescription' => 'nullable|string|max:160',
            'seoTags' => 'nullable|string|max:255',

            // Media
            'featuredImage' => 'nullable|integer|exists:media_files,id',
            'galleryImages' => 'nullable|array|max:6',
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
            'includesInTheBox.max' => 'Maximum 20 items allowed in box',
            'seoTitle.max' => 'SEO title must not exceed 60 characters',
            'seoDescription.max' => 'SEO description must not exceed 160 characters',
            'featuredImage.exists' => 'Featured image does not exist',
            'galleryImages.max' => 'Maximum 6 gallery images allowed',
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
                'includes_in_box' => !empty($validated['includesInTheBox']) ? json_encode(array_map('trim', explode(',', $validated['includesInTheBox']))) : null,
                'includes_in_box_bn' => !empty($validated['includesInTheBoxBn']) ? json_encode(array_map('trim', explode(',', $validated['includesInTheBoxBn']))) : null,
                'seo_title' => $validated['seoTitle'],
                'seo_description' => $validated['seoDescription'],
                'seo_tags' => $validated['seoTags'] ? explode(',', $validated['seoTags']) : null,
                'thumbnail_id' => $validated['featuredImage'],
                'gallery_images' => $validated['galleryImages'],
            ]);

            // 2. Create Variants - TWO ROWS PER VARIANT (Retail + Wholesale)
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

    public function show($id)
    {
        $product = Product::with(['variants.channelSettings', 'category', 'brand', 'thumbnail'])->findOrFail($id);

        // Pair retail + wholesale variants by variant_name into single rows
        // so the frontend gets both channel prices per variant.
        $variants = $product->variants->groupBy('variant_name')->map(function ($group) {
            $retail  = $group->firstWhere('channel', 'retail');
            $wholesale = $group->firstWhere('channel', 'wholesale');

            // Use whichever row exists as the base (prefer retail)
            $base = $retail ?? $wholesale;

            return [
                'id'                    => $base->id,
                'retailId'              => $retail?->id,
                'wholesaleId'           => $wholesale?->id,
                'productId'             => $base->product_id,
                'variantName'           => $base->variant_name,
                'variantSlug'           => $base->variant_slug,
                'customSku'             => $base->custom_sku,
                'sku'                   => $base->sku,
                'thumbnail'             => $base->thumbnail,
                'color'                 => $base->color,
                'size'                  => $base->size,
                'material'              => $base->material,
                'weight'                => $base->weight,
                'pattern'               => $base->pattern,
                'unitId'                => $base->unit_id,
                'unitValue'             => $base->unit_value,
                'purchaseCost'          => $base->purchase_cost ? (float) $base->purchase_cost : 0,
                'stock'                 => $base->stock ?? 0,
                'currentStock'          => $base->current_stock ?? 0,
                'stockAlertLevel'       => $base->stock_alert_level ?? 5,
                'moq'                   => $base->moq ?? 1,
                'isActive'              => $base->is_active ?? true,
                'allowPreorder'         => $base->allow_preorder ?? false,
                'expectedDelivery'      => $base->expected_delivery,
                // Retail channel fields
                'retailPrice'           => $retail ? (float) $retail->price : 0,
                'retailOfferPrice'      => $retail && $retail->offer_price ? (float) $retail->offer_price : null,
                'retailOfferStarts'     => $retail?->offer_starts,
                'retailOfferEnds'       => $retail?->offer_ends,
                'retailSku'             => $retail?->sku,
                // Wholesale channel fields
                'wholesalePrice'        => $wholesale ? (float) $wholesale->price : 0,
                'wholesaleOfferPrice'   => $wholesale && $wholesale->offer_price ? (float) $wholesale->offer_price : null,
                'wholesaleOfferStarts'  => $wholesale?->offer_starts,
                'wholesaleOfferEnds'    => $wholesale?->offer_ends,
                'wholesaleSku'          => $wholesale?->sku,
            ];
        })->values();

        // Replace the variants relation with paired data
        $product->setRelation('variants', $variants);

        return $this->sendSuccess($product);
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
     * Update Product
     * PUT/PATCH /api/v2/catalog/products/{id}
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'productName' => 'sometimes|required|string',
            'retailName' => 'nullable|string',
            'wholesaleName' => 'nullable|string',
            'category' => 'sometimes|required|exists:categories,id',
            'brand' => 'nullable|exists:brands,id',
            'status' => 'in:draft,published,archived',
            'description' => 'sometimes|required|string|min:10',
            'highlights' => 'nullable|array|max:20',
            'highlights.*' => 'string|max:255',
            'descriptionBn' => 'nullable|string',
            'highlightsBn' => 'nullable|array|max:20',
            'highlightsBn.*' => 'string|max:255',
            'includesInTheBox' => 'nullable|string|max:1000',
            'includesInTheBoxBn' => 'nullable|string|max:1000',
            'featuredImage' => 'nullable|integer|exists:media_files,id',
            'galleryImages' => 'nullable|array|max:6',
            'galleryImages.*' => 'integer|exists:media_files,id',
            'crossSale' => 'nullable|string',
            'upSale' => 'nullable|string',
            'thankYou' => 'nullable|boolean',
        ]);

        $product = Product::findOrFail($id);

        DB::beginTransaction();
        try {
            // Generate new slug if product name changed
            $newSlug = $product->slug;
            if ($request->productName && $request->productName !== $product->name) {
                $newSlug = SlugHelper::generateUniqueSlug($request->productName, 'products', 'slug');
            }

            // Prepare includes_in_box: frontend may send comma-separated string or array
            $includesInTheBox = $product->includes_in_box;
            if ($request->has('includesInTheBox')) {
                $val = $request->includesInTheBox;
                if (is_string($val) && $val !== '') {
                    $includesInTheBox = json_encode(array_map('trim', explode(',', $val)));
                } elseif (is_array($val)) {
                    $includesInTheBox = json_encode($val);
                } elseif ($val === '' || $val === null) {
                    $includesInTheBox = null;
                }
            }

            // Prepare seo_tags: frontend sends comma-separated string
            $seoTags = $product->seo_tags;
            if ($request->has('seoTags')) {
                $val = $request->seoTags;
                if (is_string($val) && $val !== '') {
                    $seoTags = array_map('trim', explode(',', $val));
                } elseif ($val === '' || $val === null) {
                    $seoTags = null;
                }
            }

            // Prepare warranty_details: column is JSON, must store valid JSON or null
            $warrantyDetails = $product->warranty_details;
            if ($request->has('warrantyDetails')) {
                $val = $request->warrantyDetails;
                $warrantyDetails = ($val !== '' && $val !== null) ? $val : null;
            }

            // Prepare includes_in_box_bn: column is NOT NULL, use empty array as fallback
            $includesInTheBoxBn = $product->includes_in_box_bn ?? [];
            if ($request->has('includesInTheBoxBn')) {
                $val = $request->includesInTheBoxBn;
                if (is_string($val) && $val !== '') {
                    $includesInTheBoxBn = json_encode(array_map('trim', explode(',', $val)));
                } elseif (is_array($val)) {
                    $includesInTheBoxBn = json_encode($val);
                } elseif ($val === '' || $val === null) {
                    $includesInTheBoxBn = json_encode([]);
                }
            }

            // Update product fields - map camelCase to snake_case
            $product->update([
                'name' => $request->productName ?? $product->name,
                'retail_name' => $request->retailName ?? ($request->productName ?? $product->retail_name),
                'wholesale_name' => $request->wholesaleName ?? $product->wholesale_name,
                'retail_name_bn' => $request->has('retailNameBn') ? $request->retailNameBn : $product->retail_name_bn,
                'wholesale_name_bn' => $request->has('wholesaleNameBn') ? $request->wholesaleNameBn : $product->wholesale_name_bn,
                'slug' => $newSlug,
                'category_id' => $request->category ?? $product->category_id,
                'brand_id' => $request->brand ?? $product->brand_id,
                'thumbnail_id' => $request->has('featuredImage') ? $request->featuredImage : $product->thumbnail_id,
                'gallery_images' => $request->has('galleryImages') ? $request->galleryImages : $product->gallery_images,
                'description' => $request->description ?? $product->description,
                'description_bn' => $request->has('descriptionBn') ? $request->descriptionBn : $product->description_bn,
                'video_url' => $request->videoUrl ?? $product->video_url,
                'seo_title' => $request->seoTitle ?? $product->seo_title,
                'seo_description' => $request->seoDescription ?? $product->seo_description,
                'seo_tags' => $seoTags,
                'status' => $request->status ?? $product->status,
                'warranty_enabled' => $request->has('enableWarranty') ? $request->boolean('enableWarranty') : $product->warranty_enabled,
                'warranty_details' => $warrantyDetails,
                'highlights' => $request->highlights ?? $product->highlights,
                'highlights_bn' => $request->has('highlightsBn') ? $request->highlightsBn : $product->highlights_bn,
                'includes_in_box' => $includesInTheBox,
                'includes_in_box_bn' => $includesInTheBoxBn,
                'cross_sale' => $request->has('crossSale') ? $request->crossSale : $product->cross_sale,
                'up_sale' => $request->has('upSale') ? $request->upSale : $product->up_sale,
                'thank_you' => $request->has('thankYou') ? $request->thankYou : $product->thank_you,
            ]);

            // Handle variants update (create, update, delete)
            if ($request->has('variants') && is_array($request->variants)) {
                // Get all existing variant IDs for this product
                $existingRetailIds = $product->variants()->where('channel', 'retail')->pluck('id')->toArray();
                $existingWholesaleIds = $product->variants()->where('channel', 'wholesale')->pluck('id')->toArray();
                $submittedRetailIds = [];
                $submittedWholesaleIds = [];

                foreach ($request->variants as $variantData) {
                    \Log::info('Updating variant', [
                        'name' => $variantData['name'],
                        'thumbnail' => $variantData['thumbnail'] ?? null,
                        'retail_id' => $variantData['retail_id'] ?? null,
                        'wholesale_id' => $variantData['wholesale_id'] ?? null
                    ]);

                    // Common fields (same for both channels)
                    $commonFields = [
                        'variant_name' => $variantData['name'],
                        'thumbnail' => $variantData['thumbnail'] ?? null,
                        'purchase_cost' => $variantData['purchaseCost'] ?? 0,
                        'weight' => $variantData['weight'] ?? 0,
                        'stock' => $variantData['stock'] ?? 0,
                        'allow_preorder' => $request->enablePreorder ?? false,
                        'expected_delivery' => $request->expectedDeliveryDate ?? null,
                    ];

                    // Check if this is a new variant (no IDs yet) or existing variant
                    $isNewVariant = empty($variantData['retail_id']) && empty($variantData['wholesale_id']);

                    if ($isNewVariant) {
                        // Create new retail + wholesale variant pair
                        $retailSlug = SlugHelper::generateVariantSlug($product->slug, $variantData['name'], 'retail');
                        $wholesaleSlug = SlugHelper::generateVariantSlug($product->slug, $variantData['name'], 'wholesale');

                        // Generate base SKU if not provided
                        $baseSku = $variantData['sellerSku'] ?? $this->generateSkuFromNames($product->name, $variantData['name']);

                        // Create retail variant with unique SKU
                        $retailVariant = \App\Models\ProductVariant::create(array_merge($commonFields, [
                            'product_id' => $product->id,
                            'channel' => 'retail',
                            'variant_slug' => $retailSlug,
                            'sku' => $baseSku . '-R-' . rand(1000, 9999),
                            'custom_sku' => $variantData['sellerSku'] ?? null,
                            'price' => $variantData['retailPrice'] ?? 0,
                            'offer_price' => $variantData['retailOfferPrice'] ?? 0,
                            'is_active' => true,
                        ]));

                        // Create wholesale variant with unique SKU
                        $wholesaleVariant = \App\Models\ProductVariant::create(array_merge($commonFields, [
                            'product_id' => $product->id,
                            'channel' => 'wholesale',
                            'variant_slug' => $wholesaleSlug,
                            'sku' => $baseSku . '-W-' . rand(1000, 9999),
                            'custom_sku' => $variantData['sellerSku'] ?? null,
                            'price' => $variantData['wholesalePrice'] ?? 0,
                            'offer_price' => $variantData['wholesaleOfferPrice'] ?? 0,
                            'moq' => $variantData['wholesaleMoq'] ?? 6,
                            'is_active' => true,
                        ]));

                        $submittedRetailIds[] = $retailVariant->id;
                        $submittedWholesaleIds[] = $wholesaleVariant->id;

                    } else {
                        // Update existing variants
                        // Track submitted IDs
                        if (!empty($variantData['retail_id'])) {
                            $submittedRetailIds[] = $variantData['retail_id'];
                        }
                        if (!empty($variantData['wholesale_id'])) {
                            $submittedWholesaleIds[] = $variantData['wholesale_id'];
                        }

                        // Update retail variant
                        if (!empty($variantData['retail_id'])) {
                            $retailVariant = \App\Models\ProductVariant::find($variantData['retail_id']);
                            if ($retailVariant && $retailVariant->product_id == $product->id) {
                                // Generate new variant slug if name changed
                                $newRetailVariantSlug = $retailVariant->variant_slug;
                                if (isset($variantData['name']) && $variantData['name'] !== $retailVariant->variant_name) {
                                    $newRetailVariantSlug = SlugHelper::generateVariantSlug($product->slug, $variantData['name'], 'retail');
                                }

                                $retailVariant->update(array_merge($commonFields, [
                                    'variant_slug' => $newRetailVariantSlug,
                                    'sku' => $variantData['sellerSku'] ?? $retailVariant->sku,
                                    'price' => $variantData['retailPrice'] ?? 0,
                                    'offer_price' => $variantData['retailOfferPrice'] ?? 0,
                                ]));
                            }
                        }

                        // Update wholesale variant
                        if (!empty($variantData['wholesale_id'])) {
                            $wholesaleVariant = \App\Models\ProductVariant::find($variantData['wholesale_id']);
                            if ($wholesaleVariant && $wholesaleVariant->product_id == $product->id) {
                                // Generate new variant slug if name changed
                                $newWholesaleVariantSlug = $wholesaleVariant->variant_slug;
                                if (isset($variantData['name']) && $variantData['name'] !== $wholesaleVariant->variant_name) {
                                    $newWholesaleVariantSlug = SlugHelper::generateVariantSlug($product->slug, $variantData['name'], 'wholesale');
                                }

                                $wholesaleUpdateData = [
                                    'variant_slug' => $newWholesaleVariantSlug,
                                    'price' => $variantData['wholesalePrice'] ?? 0,
                                    'offer_price' => $variantData['wholesaleOfferPrice'] ?? 0,
                                ];

                                // Only update MOQ if it's explicitly provided (allow 0, but use current value if not provided)
                                if (array_key_exists('wholesaleMoq', $variantData)) {
                                    $wholesaleUpdateData['moq'] = is_null($variantData['wholesaleMoq']) ? $wholesaleVariant->moq : $variantData['wholesaleMoq'];
                                }

                                $wholesaleVariant->update(array_merge($commonFields, $wholesaleUpdateData));
                            }
                        }
                    }
                }

                // Delete variants that were removed (exist in DB but not in submitted list)
                $retailIdsToDelete = array_diff($existingRetailIds, $submittedRetailIds);
                $wholesaleIdsToDelete = array_diff($existingWholesaleIds, $submittedWholesaleIds);

                if (!empty($retailIdsToDelete)) {
                    \App\Models\ProductVariant::whereIn('id', $retailIdsToDelete)->delete();
                }
                if (!empty($wholesaleIdsToDelete)) {
                    \App\Models\ProductVariant::whereIn('id', $wholesaleIdsToDelete)->delete();
                }
            }

            DB::commit();
            return $this->sendSuccess($product->load(['category', 'brand', 'thumbnail', 'variants']), 'Product updated successfully');

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
            return $this->sendSuccess($newProduct->load(['variants', 'category', 'brand', 'thumbnail']), 'Product duplicated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Product duplication failed', ['error' => $e->getMessage()], 500);
        }
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