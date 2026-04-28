<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ThirdParty\LazychatService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

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
            $product = Product::with(['category', 'brand', 'thumbnail', 'variants'])
                ->where('id', $id)
                ->whereHas('variants', fn($q) => $q
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                )
                ->firstOrFail();

            $transformed = $this->lazychatService->transformProductForLazychat($product);

            return $this->sendSuccess($transformed);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->sendError('Product not found', [], 404);
        } catch (\Exception $e) {
            return $this->sendError('Failed to fetch product', [
                'error' => $e->getMessage(),
            ], 500);
        }
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
     * Lazychat will POST orders to this endpoint.
     *
     * POST /api/v2/lazychat-retail/order/create
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function receiveOrder(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer',
            'contact.name' => 'required|string|max:255',
            'contact.phone' => 'required|string|max:20',
            'contact.address_1' => 'required|string|max:500',
            'total_price' => 'required|numeric|min:0',
            'deliveryCharge' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:cash_on_delivery',
            'payment_status' => 'required|string',
            'line_items' => 'required|array|min:1',
            'line_items.*.product_id' => 'required|string',
            'line_items.*.name' => 'required|string',
            'line_items.*.price' => 'required|numeric|min:0',
            'line_items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation failed', $validator->errors(), 422);
        }

        try {
            DB::beginTransaction();

            // Create or get customer
            $customer = \App\Models\User::firstOrCreate(
                [
                    'phone' => $request->input('contact.phone'),
                ],
                [
                    'name' => $request->input('contact.name'),
                    'email' => 'lazychat_' . $request->input('id') . '@temp.hooknhunt.com',
                    'password' => bcrypt(str()->random(16)),
                    'user_type' => 'customer',
                    'status' => 'active',
                ]
            );

            // Create order
            $order = \App\Models\SalesOrder::create([
                'customer_id' => $customer->id,
                'invoice_no' => 'LZ-' . $request->input('id') . '-' . time(),
                'order_date' => now(),
                'total_amount' => $request->input('total_price'),
                'delivery_charge' => $request->input('deliveryCharge'),
                'grand_total' => $request->input('total_price') + $request->input('deliveryCharge'),
                'payment_method' => 'cash_on_delivery',
                'payment_status' => 'unpaid',
                'order_status' => 'pending',
                'shipping_address' => $request->input('contact.address_1'),
                'shipping_city' => 'Dhaka',
                'shipping_phone' => $request->input('contact.phone'),
                'note' => $request->input('note', 'Order from Lazychat AI'),
                'source' => 'lazychat',
                'lazychat_order_id' => $request->input('id'),
            ]);

            // Add order items
            foreach ($request->input('line_items') as $item) {
                // Find product by Lazychat product_id
                $product = \App\Models\Product::find($item['product_id']);

                if (!$product) {
                    Log::warning('Lazychat order: Product not found', [
                        'lazychat_product_id' => $item['product_id'],
                        'lazychat_order_id' => $request->input('id'),
                    ]);
                    continue;
                }

                \App\Models\SalesOrderItem::create([
                    'sales_order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['price'],
                    'total_price' => $item['price'] * $item['quantity'],
                ]);
            }

            DB::commit();

            Log::info('Lazychat order received', [
                'lazychat_order_id' => $request->input('id'),
                'our_order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
                'total_amount' => $order->grand_total,
            ]);

            return $this->sendSuccess([
                'order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
                'message' => 'Order created successfully',
            ], 'Order received from Lazychat', 201);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Lazychat order creation failed', [
                'lazychat_order_id' => $request->input('id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->sendError('Failed to create order', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
