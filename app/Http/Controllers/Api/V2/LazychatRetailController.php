<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Services\ThirdParty\LazychatService;
use App\Services\StockService;
use App\Traits\ApiResponse;
use App\Events\Order\OrderCreated;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Lazychat Retail Controller
 *
 * Public API endpoints for Lazychat integration.
 * Lazychat uses these endpoints to fetch product data.
 *
 * @package App\Http\Controllers\Api\V2
 */
class LazychatRetailController extends Controller
{
    use ApiResponse;

    private LazychatService $lazychatService;

    /**
     * Create a new controller instance.
     */
    public function __construct(LazychatService $lazychatService)
    {
        $this->lazychatService = $lazychatService;
    }

    /**
     * Get all products in Lazychat format.
     *
     * Used by Lazychat for initial inventory sync.
     * GET /api/v2/lazychat-retail/products
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function products(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
            'updated_since' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation failed', $validator->errors(), 422);
        }

        // Check if integration is enabled
        if (!$this->lazychatService->isEnabled()) {
            return $this->sendError('Lazychat integration is disabled', [], 503);
        }

        try {
            // Build query - only published products with retail variants
            $query = Product::with(['category', 'brand', 'thumbnail', 'variants'])
                ->where('status', 'published')
                ->whereHas('variants', fn($q) => $q
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                );

            // Filter by updated_since if provided (for incremental sync)
            if ($request->filled('updated_since')) {
                $query->where('updated_at', '>=', $request->input('updated_since'));
            }

            // Pagination
            $perPage = $request->input('per_page', 100);
            $page = $request->input('page', 1);

            $products = $query->paginate($perPage, ['*'], 'page', $page);

            // Transform to Lazychat format
            $transformed = $products->getCollection()->map(function ($product) {
                return $this->lazychatService->transformProductForLazychat($product);
            })->values();

            // Return with pagination metadata
            return $this->sendSuccess([
                'data' => $transformed,
                'pagination' => [
                    'current_page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                    'last_page' => $products->lastPage(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem(),
                ],
            ]);

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch products', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a single product by ID in Lazychat format.
     *
     * OPTIMIZED: Uses direct SQL queries to avoid model serialization memory issues.
     * This prevents the 512MB memory exhaustion that was crashing servers.
     *
     * GET /api/v2/lazychat-retail/products/{id}
     *
     * @param int $id
     * @return JsonResponse
     */
    public function showProduct(int $id): JsonResponse
    {
        // Check if integration is enabled
        if (!$this->lazychatService->isEnabled()) {
            return $this->sendError('Lazychat integration is disabled', [], 503);
        }

        try {
            // Use DIRECT SQL instead of models - prevents memory exhaustion
            $product = DB::table('products as p')
                ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                ->leftJoin('brands as b', 'p.brand_id', '=', 'b.id')
                ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
                ->where('p.id', $id)
                ->where('p.status', 'published')
                ->select([
                    'p.id',
                    'p.name',
                    'p.retail_name',
                    'p.slug',
                    'p.description',
                    'p.status',
                    'p.product_code',
                    'p.seo_tags',
                    'p.created_at',
                    'p.updated_at',
                    'p.deleted_at',
                    'p.gallery_images',
                    'c.id as category_id',
                    'c.name as category_name',
                    'c.slug as category_slug',
                    'b.id as brand_id',
                    'b.name as brand_name',
                    'm.id as thumbnail_id',
                    'm.path as thumbnail_path',
                    'm.url as thumbnail_url',
                    'm.disk as thumbnail_disk',
                ])
                ->first();

            if (!$product) {
                return $this->sendError('Product not found', [], 404);
            }

            // Load retail variants using direct SQL
            $variants = DB::table('product_variants')
                ->where('product_id', $id)
                ->where('channel', 'retail')
                ->where('is_active', true)
                ->select([
                    'id',
                    'variant_name',
                    'sku',
                    'price',
                    'offer_price',
                    'stock',
                    'weight',
                    'size',
                    'color',
                    'material',
                    'created_at',
                    'updated_at',
                ])
                ->get();

            if ($variants->isEmpty()) {
                return $this->sendError('Product not found or has no active variants', [], 404);
            }

            // Build response array directly - NO MODEL SERIALIZATION
            $transformed = $this->buildLazychatProductResponse($product, $variants);

            return $this->sendSuccess($transformed);

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch product', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build Lazychat product response from raw SQL data.
     * PURE FUNCTION - No model overhead.
     *
     * @param object $product
     * @param \Illuminate\Support\Collection $variants
     * @return array
     */
    private function buildLazychatProductResponse($product, $variants): array
    {
        $firstVariant = $variants->first();

        // Build images array
        $images = [];
        if ($product->thumbnail_id) {
            $thumbnailUrl = $product->thumbnail_url;
            if (empty($thumbnailUrl) || !str_starts_with($thumbnailUrl, 'http')) {
                $thumbnailUrl = url($product->thumbnail_path ?? '');
            }
            $images[] = ['url' => $thumbnailUrl];
        }

        // Add gallery images using direct SQL
        if (!empty($product->gallery_images)) {
            $galleryIds = is_array($product->gallery_images)
                ? $product->gallery_images
                : json_decode($product->gallery_images, true);

            if (is_array($galleryIds) && !empty($galleryIds)) {
                $galleryUrls = DB::table('media_files')
                    ->whereIn('id', $galleryIds)
                    ->select('id', 'path', 'url')
                    ->get()
                    ->keyBy('id');

                foreach ($galleryIds as $imageId) {
                    if (isset($galleryUrls[$imageId])) {
                        $file = $galleryUrls[$imageId];
                        $url = ($file->url && str_starts_with($file->url, 'http'))
                            ? $file->url
                            : url($file->path ?? '');
                        $images[] = ['url' => $url];
                    }
                }
            }
        }

        // Build categories array
        $categories = [];
        if ($product->category_id) {
            $categories[] = [
                'id' => $product->category_id,
                'title' => $product->category_name,
                'slug' => $product->category_slug,
            ];
        }

        // Build SEO tags
        $tags = [];
        if (!empty($product->seo_tags)) {
            $tags = is_array($product->seo_tags)
                ? $product->seo_tags
                : json_decode($product->seo_tags, true);
        }

        // Extract attributes from variants
        $attributes = $this->extractAttributesFromVariants($variants);

        // Build sale prices
        $salePrices = [];
        foreach ($variants as $variant) {
            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $salePrices[] = number_format($variant->offer_price, 2, '.', '');
            }
        }

        // Build stock data
        $totalStock = $variants->sum('stock');
        $stocks = [];
        if ($totalStock > 0) {
            $stocks[] = [
                'quantity' => $totalStock,
                'date' => now()->toDateString(),
                'note' => 'Current stock',
            ];
        }

        // Transform variants
        $transformedVariants = [];
        foreach ($variants as $variant) {
            $variantData = [
                'id' => $variant->id,
                'title' => $variant->variant_name,
                'sku' => $variant->sku,
                'published' => true,
                'weight' => (string) $variant->weight,
                'pricing' => [
                    'regular_price' => number_format($variant->price, 2, '.', ''),
                    'sale_prices' => [],
                ],
                'inventory' => [
                    'stock_status' => $variant->stock > 0,
                    'stocks' => [],
                ],
                'images' => [],
                'attributes' => [],
                'created_at' => $variant->created_at,
                'updated_at' => $variant->updated_at,
            ];

            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $variantData['pricing']['sale_prices'][] = number_format($variant->offer_price, 2, '.', '');
            }

            if ($variant->stock > 0) {
                $variantData['inventory']['stocks'][] = [
                    'quantity' => $variant->stock,
                    'date' => now()->toDateString(),
                    'note' => '',
                ];
            }

            $transformedVariants[] = $variantData;
        }

        // Return complete Lazychat format response
        return [
            'id' => $product->id,
            'title' => $product->retail_name ?? $product->name,
            'slug' => $product->slug,
            'url' => config('app.frontend_url') . '/products/' . $product->slug,
            'description' => $product->description ?? '',
            'summary' => '',
            'published' => $product->status === 'published',
            'is_draft' => $product->status === 'draft',
            'featured' => false,
            'purchasable' => $product->status === 'published',
            'sku' => $firstVariant->sku ?? '',
            'brand' => $product->brand_name ?? '',
            'weight' => (string) ($firstVariant->weight ?? 0),
            'tags' => $tags,
            'note' => null,
            'categories' => $categories,
            'images' => $images,
            'attributes' => $attributes,
            'pricing' => [
                'regular_price' => number_format($firstVariant->price ?? 0, 2, '.', ''),
                'sale_prices' => $salePrices,
            ],
            'inventory' => [
                'stock_status' => $totalStock > 0,
                'stocks' => $stocks,
            ],
            'variations' => $transformedVariants,
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
            'deleted_at' => $product->deleted_at,
        ];
    }

    /**
     * Extract attributes from variants (pure SQL data).
     *
     * @param \Illuminate\Support\Collection $variants
     * @return array
     */
    private function extractAttributesFromVariants($variants): array
    {
        $attributes = [];
        $attributeId = 1;

        // Extract sizes
        $sizes = $variants->pluck('size')->filter()->unique()->values();
        if ($sizes->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Size',
                'values' => $sizes->toArray(),
            ];
        }

        // Extract colors
        $colors = $variants->pluck('color')->filter()->unique()->values();
        if ($colors->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Color',
                'values' => $colors->toArray(),
            ];
        }

        // Extract materials
        $materials = $variants->pluck('material')->filter()->unique()->values();
        if ($materials->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Material',
                'values' => $materials->toArray(),
            ];
        }

        return $attributes;
    }

    /**
     * Get webhook status for a product.
     *
     * Returns the latest webhook log entry for the specified product.
     * Can be used by admin dashboard to show sync status.
     *
     * GET /api/v2/lazychat-retail/webhook-status/{productId}
     *
     * @param int $productId
     * @return JsonResponse
     */
    public function webhookStatus(int $productId): JsonResponse
    {
        try {
            $log = \App\Models\LazychatWebhookLog::where('product_id', $productId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$log) {
                return $this->sendSuccess([
                    'product_id' => $productId,
                    'status' => 'never_synced',
                    'message' => 'Product has never been synced to Lazychat',
                ]);
            }

            return $this->sendSuccess([
                'product_id' => $productId,
                'event_type' => $log->event_type,
                'status' => $log->status,
                'attempts' => $log->attempts,
                'last_attempted_at' => $log->last_attempted_at?->toIso8601String(),
                'sent_at' => $log->sent_at?->toIso8601String(),
                'error_message' => $log->error_message,
                'response_code' => $log->response_code,
            ]);

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch webhook status', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all failed webhooks for admin review.
     *
     * Returns paginated list of failed webhook attempts.
     * Can be used by admin dashboard to show sync failures.
     *
     * GET /api/v2/lazychat-retail/failed-webhooks
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function failedWebhooks(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);

            $logs = \App\Models\LazychatWebhookLog::with('product')
                ->failed()
                ->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return $this->sendSuccess($logs);

        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch failed webhooks', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Receive order from Lazychat AI.
     * Lazychat will POST orders to this endpoint after AI conversation.
     *
     * POST /api/v2/lazychat-retail/order/create
     * Authentication: Bearer {LAZYCHAT_API_TOKEN}
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function receiveOrder(Request $request): JsonResponse
    {
        // Validate request with comprehensive rules
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'contact.name' => 'required|string|max:255',
            'contact.phone' => 'required|string|max:20|regex:/^[0-9+]{10,15}$/',
            'contact.address_1' => 'required|string|max:500',
            'contact.email' => 'nullable|email|max:255',
            'total_price' => 'required|numeric|min:0',
            'deliveryCharge' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:cash_on_delivery,cod',
            'payment_status' => 'required|string|in:unpaid,paid',
            'note' => 'nullable|string|max:1000',
            'line_items' => 'required|array|min:1|max:50',
            'line_items.*.product_id' => 'required|integer|exists:products,id',
            'line_items.*.variation_id' => 'nullable|integer|exists:product_variants,id',
            'line_items.*.sku' => 'required|string',
            'line_items.*.name' => 'required|string|max:255',
            'line_items.*.price' => 'required|numeric|min:0',
            'line_items.*.quantity' => 'required|integer|min:1|max:100',
            'line_items.*.image' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            Log::warning('Lazychat order validation failed', [
                'lazychat_order_id' => $request->input('id'),
                'errors' => $validator->errors()->toArray(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'message' => 'Order data is invalid',
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Step 1: Resolve or create customer
            $customer = $this->resolveLazychatCustomer($request);

            // Step 2: Calculate order totals
            $subtotal = (float) $request->input('total_price');
            $deliveryCharge = (float) $request->input('deliveryCharge');
            $totalAmount = $subtotal + $deliveryCharge;

            // Step 3: Create SalesOrder
            $order = SalesOrder::create([
                'invoice_no' => 'LZ-' . $request->input('id') . '-' . strtoupper(Str::random(6)),
                'customer_id' => $customer->id,
                'channel' => 'retail_web', // Lazychat orders are always retail
                'status' => 'pending',
                'payment_status' => $request->input('payment_status', 'unpaid'),
                'sub_total' => $subtotal,
                'discount_amount' => 0,
                'delivery_charge' => $deliveryCharge,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'due_amount' => $totalAmount,
                'note' => $request->input('note', 'Order placed via LazyChat AI. Please review before processing.'),
                'external_data' => [
                    'shipping' => [
                        'address' => $request->input('contact.address_1'),
                        'district' => $request->input('contact.district'),
                        'division' => $request->input('contact.division'),
                        'thana' => $request->input('contact.thana'),
                    ],
                    'customer' => [
                        'name' => $request->input('contact.name'),
                        'phone' => $request->input('contact.phone'),
                        'email' => $request->input('contact.email'),
                    ],
                    'payment' => [
                        'method' => $request->input('payment_method', 'cod'),
                    ],
                    'lazychat' => [
                        'order_id' => $request->input('id'),
                        'source' => 'lazychat_ai',
                        'created_at' => now()->toIso8601String(),
                    ],
                ],
            ]);

            // Step 4: Process order items
            foreach ($request->input('line_items') as $item) {
                $this->processLazychatOrderItem($order, $item);
            }

            // Step 5: Dispatch OrderCreated event (for stock sync & webhooks)
            event(new OrderCreated($order));

            DB::commit();

            Log::info('Lazychat AI order created successfully', [
                'lazychat_order_id' => $request->input('id'),
                'our_order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
                'total_amount' => $totalAmount,
                'customer_phone' => $customer->phone,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => [
                    'order_id' => $order->id,
                    'invoice_no' => $order->invoice_no,
                    'total_amount' => $totalAmount,
                    'status' => 'pending',
                    'payment_status' => $order->payment_status,
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Lazychat AI order creation failed', [
                'lazychat_order_id' => $request->input('id'),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => config('app.debug') ? $e->getMessage() : 'Order creation failed',
            ], 500);
        }
    }

    /**
     * Resolve or create customer from Lazychat order data.
     *
     * @param Request $request
     * @return Customer
     */
    private function resolveLazychatCustomer(Request $request): Customer
    {
        $phone = $request->input('contact.phone');
        $name = $request->input('contact.name');
        $email = $request->input('contact.email');

        // Check if customer exists
        $customer = Customer::where('phone', $phone)->first();

        if (!$customer) {
            // Create new customer
            $customer = Customer::create([
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'type' => 'retail',
            ]);

            Log::info('New customer created from Lazychat AI order', [
                'customer_id' => $customer->id,
                'phone' => $phone,
            ]);
        }

        return $customer;
    }

    /**
     * Process a single line item from Lazychat order.
     * Handles variant lookup, stock decrement, and item creation.
     *
     * @param SalesOrder $order
     * @param array $item
     * @return void
     * @throws \Exception
     */
    private function processLazychatOrderItem(SalesOrder $order, array $item): void
    {
        $productId = $item['product_id'];
        $variantId = $item['variation_id'] ?? null;
        $quantity = (int) $item['quantity'];
        $price = (float) $item['price'];

        // Find variant - first try by variation_id, then by product_id
        $variant = null;

        if ($variantId) {
            $variant = ProductVariant::where('id', $variantId)
                ->where('product_id', $productId)
                ->where('channel', 'retail')
                ->where('is_active', true)
                ->first();
        }

        // If no variant_id or variant not found, find first active retail variant
        if (!$variant) {
            $variant = ProductVariant::where('product_id', $productId)
                ->where('channel', 'retail')
                ->where('is_active', true)
                ->first();
        }

        if (!$variant) {
            Log::error('Lazychat order: No active retail variant found', [
                'lazychat_product_id' => $productId,
                'lazychat_variation_id' => $variantId,
                'sku' => $item['sku'] ?? null,
            ]);
            throw new \Exception("No active variant found for product ID: {$productId}");
        }

        // Check stock availability
        if ($variant->stock < $quantity) {
            Log::warning('Lazychat order: Insufficient stock', [
                'variant_id' => $variant->id,
                'sku' => $variant->sku,
                'requested' => $quantity,
                'available' => $variant->stock,
            ]);
            throw new \Exception("Insufficient stock for {$item['name']} (SKU: {$variant->sku}). Available: {$variant->stock}, Requested: {$quantity}");
        }

        // Get effective price (use Lazychat price if provided, otherwise use variant price)
        $unitPrice = $price > 0 ? $price : (float) $variant->price;
        $originalPrice = (float) $variant->price;

        // Create order item
        SalesOrderItem::create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'original_price' => $originalPrice,
            'total_price' => $unitPrice * $quantity,
            'total_cost' => (float) $variant->purchase_cost * $quantity,
        ]);

        // Decrement stock
        $variant->decrement('stock', $quantity);

        Log::info('Lazychat order item processed', [
            'variant_id' => $variant->id,
            'sku' => $variant->sku,
            'quantity' => $quantity,
            'remaining_stock' => $variant->fresh()->stock,
        ]);
    }
}
