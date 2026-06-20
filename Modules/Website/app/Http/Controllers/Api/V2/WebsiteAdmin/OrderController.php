<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin;


use App\Http\Controllers\Controller;
use App\Services\AlphaSmsService;
use App\Services\Website\DeliveryChargeCalculator;
use App\Services\Website\OrderManagementService;
use App\Services\Website\OrderStatusTransitionService;
use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Website\Models\WebsiteOrderItem;
use App\Modules\Website\Models\WebsiteOrderStatusHistory;
use App\Modules\Website\Models\WebsiteOrderActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private OrderManagementService $orderService;
    private OrderStatusTransitionService $transitionService;

    public function __construct(OrderManagementService $orderService, OrderStatusTransitionService $transitionService)
    {
        $this->orderService = $orderService;
        $this->transitionService = $transitionService;
    }

    // -------------------------------------------------------
    // ORDER LISTING
    // -------------------------------------------------------

    /**
     * List all website orders with filters and pagination.
     * GET /api/v2/website-admin/orders
     */
    public function index(Request $request): JsonResponse
    {
        // Use direct database access for module independence
        // Customer data is denormalized in orders table (customer_name, customer_email, customer_phone)
        $query = WebsiteOrder::query();

        // Search by invoice, customer name, phone
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->channel) {
            $query->where('channel', $request->channel);
        }
        if ($request->sent_to_courier !== null) {
            $query->where('sent_to_courier', $request->boolean('sent_to_courier'));
        }
        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $orders = $query->latest()
            ->paginate($request->per_page ?? 20)
            ->through(fn ($order) => $this->transformOrderListItem($order));

        return response()->json(['success' => true, 'data' => $orders]);
    }

    // -------------------------------------------------------
    // ORDER DETAIL
    // -------------------------------------------------------

    /**
     * Get single order with full details.
     * GET /api/v2/website-admin/orders/{id}
     */
    public function show(int $id): JsonResponse
    {
        // Fetch order with all relations
        $order = WebsiteOrder::with([
            'statusHistories',
            'activityLogs',
        ])->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        // Fetch items with product/variant details via JOIN (use current prices from product_variants)
        $items = DB::table('sales_order_items as sgi')
            ->leftJoin('product_variants as pv', 'sgi.product_variant_id', '=', 'pv.id')
            ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
            ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
            ->where('sgi.sales_order_id', $id)
            ->select(
                'sgi.id',
                'sgi.product_variant_id',
                'sgi.quantity',
                'sgi.total_cost',
                'p.name as product_name',
                'p.slug as product_slug',
                'pv.sku as product_sku',
                'pv.variant_name',
                'pv.price',
                'pv.offer_price',
                'm.path as thumbnail_path',
                DB::raw('CASE WHEN m.path IS NOT NULL THEN CONCAT("https://hooknhunt-api.test/storage/", m.path) ELSE NULL END as thumbnail_url'),
                DB::raw('(pv.offer_price * sgi.quantity) as total_price'),
                DB::raw('((pv.offer_price * sgi.quantity) - sgi.total_cost) as profit')
            )
            ->get()
            ->map(function ($item) {
                return (object) [
                    'id' => $item->id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->offer_price,
                    'original_price' => (float) $item->price,
                    'total_price' => (float) $item->total_price,
                    'total_cost' => (float) $item->total_cost,
                    'profit' => (float) $item->profit,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->product_slug,
                    'product_sku' => $item->product_sku,
                    'variant_name' => $item->variant_name,
                    'thumbnail_path' => $item->thumbnail_path,
                    'thumbnail_url' => $item->thumbnail_url,
                    'weight' => 0,
                    'total_weight' => 0,
                ];
            });

        // Attach enriched items to order
        $order->items = $items;

        // Get allowed next statuses using the transition service
        $validTransitions = $this->transitionService->getValidTransitions($order->status);
        $allowedNextStatuses = array_keys($validTransitions);

        // Special handling for cancelled orders (revival)
        if ($order->status === 'cancelled') {
            $allowedNextStatuses = ['pending', 'processing'];
        }

        return response()->json([
            'success' => true,
            'data' => array_merge($this->transformOrderDetail($order), [
                'allowedNextStatuses' => $allowedNextStatuses,
                'is_editable' => $order->isEditable(),
                'can_send_to_courier' => $order->canSendToCourier(),
            ]),
        ]);
    }

    // -------------------------------------------------------
    // STATUS MANAGEMENT
    // -------------------------------------------------------

    /**
     * Update order status.
     * PUT /api/v2/website-admin/orders/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', WebsiteOrder::STATUSES),
            'note' => 'nullable|string|max:1000',
            'cancellation_reason' => 'nullable|in:customer,admin,courier,system',
        ]);

        $result = $this->orderService->updateStatus(
            $id,
            $validated['status'],
            $validated['note'] ?? null,
            $validated['cancellation_reason'] ?? null
        );

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // PAYMENT
    // -------------------------------------------------------

    /**
     * Update payment info.
     * PUT /api/v2/website-admin/orders/{id}/payment
     */
    public function updatePayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_status' => 'required|in:unpaid,paid,partial',
            'paid_amount' => 'required|numeric|min:0',
        ]);

        $result = $this->orderService->updatePayment($id, $validated['payment_status'], $validated['paid_amount']);

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // ITEM MANAGEMENT
    // -------------------------------------------------------

    /**
     * Add item to order.
     * POST /api/v2/website-admin/orders/{id}/items
     */
    public function addItem(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
        ]);

        $result = $this->orderService->addItem($id, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Update an order item.
     * PUT /api/v2/website-admin/orders/{orderId}/items/{itemId}
     */
    public function updateItem(Request $request, int $orderId, int $itemId): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'sometimes|integer|exists:product_variants,id',
            'quantity' => 'sometimes|integer|min:1',
            'unit_price' => 'sometimes|numeric|min:0',
            'weight' => 'sometimes|numeric|min:0',
        ]);

        $result = $this->orderService->updateItem($orderId, $itemId, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($orderId);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Remove item from order.
     * DELETE /api/v2/website-admin/orders/{orderId}/items/{itemId}
     */
    public function removeItem(int $orderId, int $itemId): JsonResponse
    {
        $result = $this->orderService->removeItem($orderId, $itemId);

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($orderId);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // COURIER INTEGRATION
    // -------------------------------------------------------

    /**
     * Send order to Steadfast courier.
     * POST /api/v2/website-admin/orders/{id}/send-to-courier
     */
    public function sendToCourier(int $id): JsonResponse
    {
        $result = $this->orderService->sendToCourier($id);

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Sync delivery status from courier.
     * POST /api/v2/website-admin/orders/{id}/sync-courier
     */
    public function syncCourierStatus(int $id): JsonResponse
    {
        $result = $this->orderService->syncCourierStatus($id);

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // ORDER UPDATE (misc fields)
    // -------------------------------------------------------

    /**
     * Update order-level fields.
     * PUT /api/v2/website-admin/orders/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'delivery_charge' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:1000',
            'coupon_code' => 'nullable|string|max:50',
            'append_note' => 'nullable|string|max:500',
        ]);

        $result = $this->orderService->updateOrder($id, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // DELIVERY CHARGE CALCULATOR
    // -------------------------------------------------------

    /**
     * Calculate delivery charge based on weight and destination.
     * POST /api/v2/website-admin/orders/calculate-delivery
     */
    public function calculateDeliveryCharge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'weight' => 'required|numeric|min:0',
            'division' => 'required|string|max:100',
        ]);

        $breakdown = DeliveryChargeCalculator::breakdown($validated['weight'], $validated['division']);

        return response()->json([
            'success' => true,
            'data' => $breakdown,
        ]);
    }

    // -------------------------------------------------------
    // STATISTICS
    // -------------------------------------------------------

    /**
     * Get order statistics for dashboard.
     * GET /api/v2/website-admin/orders/statistics
     */
    public function statistics(): JsonResponse
    {
        $baseQuery = WebsiteOrder::query();

        $stats = [
            'timestamp' => now()->toIso8601String(),
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->byStatus('pending')->count(),
            'processing' => (clone $baseQuery)->byStatus('processing')->count(),
            'on_hold' => (clone $baseQuery)->byStatus('on_hold')->count(),
            'approved' => (clone $baseQuery)->byStatus('approved')->count(),
            'sent_to_steadfast' => (clone $baseQuery)->byStatus('sent_to_steadfast')->count(),
            'in_review' => (clone $baseQuery)->byStatus('in_review')->count(),
            'in_transit' => (clone $baseQuery)->byStatus('in_transit')->count(),
            'delivered' => (clone $baseQuery)->byStatus('delivered')->count(),
            'partial_delivered' => (clone $baseQuery)->byStatus('partial_delivered')->count(),
            'delivery_failed_return' => (clone $baseQuery)->byStatus('delivery_failed_return')->count(),
            'return_received' => (clone $baseQuery)->byStatus('return_received')->count(),
            'refunded_completed' => (clone $baseQuery)->byStatus('refunded_completed')->count(),
            'completed' => (clone $baseQuery)->byStatus('completed')->count(),
            'cancelled' => (clone $baseQuery)->byStatus('cancelled')->count(),
            'returned' => (clone $baseQuery)->byStatus('returned')->count(),
            'total_revenue' => (float) (clone $baseQuery)->byStatus('completed')->sum('total_amount'),
            'total_pending_amount' => (float) (clone $baseQuery)->active()->sum('total_amount'),
            'today_orders' => (clone $baseQuery)->whereDate('created_at', today())->count(),
            'today_revenue' => (float) (clone $baseQuery)->whereDate('created_at', today())->byStatus('completed')->sum('total_amount'),
        ];

        return response()
            ->json(['success' => true, 'data' => $stats])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    // -------------------------------------------------------
    // PRODUCT SEARCH (for adding items)
    // -------------------------------------------------------

    /**
     * Search product variants by name or SKU.
     * GET /api/v2/website-admin/products/search
     */
    public function searchProducts(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Use direct database access for module independence
        $results = DB::table('product_variants as pv')
            ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
            ->leftJoin('media_files as mf', 'p.thumbnail_id', '=', 'mf.id')
            ->where(function ($query) use ($q) {
                $query->where('pv.sku', 'like', "%{$q}%")
                      ->orWhere('pv.variant_name', 'like', "%{$q}%")
                      ->orWhere('p.name', 'like', "%{$q}%")
                      ->orWhere('p.wholesale_name', 'like', "%{$q}%");
            })
            ->where('p.status', 'published')
            ->select('pv.*', 'p.name as product_name', 'p.wholesale_name', 'mf.url as thumbnail_url')
            ->limit(20)
            ->get();

        $data = $results->map(fn ($variant) => [
            'variant_id' => $variant->id,
            'product_name' => $variant->product_name,
            'wholesale_name' => $variant->wholesale_name,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'price' => (float) $variant->price,
            'weight' => (float) ($variant->weight ?? 0),
            // Variant thumbnail with fallback to product thumbnail
            'thumbnail' => $variant->thumbnail ?? $variant->product?->thumbnail?->full_url,
            'stock' => (int) $variant->stock,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Get all variants of a product.
     * GET /api/v2/website-admin/products/{id}/variants
     */
    public function productVariants(int $id): JsonResponse
    {
        // Use direct database access for module independence
        $variants = DB::table('product_variants as pv')
            ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
            ->leftJoin('media_files as mf', 'pv.thumbnail_id', '=', 'mf.id')
            ->leftJoin('media_files as pmf', 'p.thumbnail_id', '=', 'pmf.id')
            ->where('pv.product_id', $id)
            ->where('p.status', 'published')
            ->select(
                'pv.*',
                'p.name as product_name',
                'p.wholesale_name',
                'mf.url as variant_thumbnail_url',
                'pmf.url as product_thumbnail_url'
            )
            ->get();

        $data = $variants->map(fn ($variant) => [
            'variant_id' => $variant->id,
            'product_name' => $variant->product_name,
            'wholesale_name' => $variant->wholesale_name,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'price' => (float) $variant->price,
            'weight' => (float) ($variant->weight ?? 0),
            // Variant thumbnail with fallback to product thumbnail
            'thumbnail' => $variant->variant_thumbnail_url ?? $variant->product_thumbnail_url,
            'stock' => (int) $variant->stock,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Search products by name or SKU (returns products, not variants).
     * GET /api/v2/website-admin/products/search-products
     */
    public function searchProductsGrouped(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Use direct database access for module independence
        $products = DB::table('products as p')
            ->leftJoin('media_files as mf', 'p.thumbnail_id', '=', 'mf.id')
            ->leftJoin('product_variants as pv', 'p.id', '=', 'pv.product_id')
            ->where('p.status', 'published')
            ->where(function ($query) use ($q) {
                $query->where('p.name', 'like', "%{$q}%")
                      ->orWhere('p.wholesale_name', 'like', "%{$q}%")
                      ->orWhere('pv.sku', 'like', "%{$q}%");
            })
            ->select('p.*', 'mf.url as thumbnail_url')
            ->selectRaw('COUNT(DISTINCT pv.id) as variants_count')
            ->groupBy('p.id', 'p.name', 'p.wholesale_name', 'p.thumbnail_id', 'mf.url', 'p.status', 'p.created_at', 'p.updated_at')
            ->having('variants_count', '>', 0)
            ->limit(20)
            ->get();

        $data = $products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'wholesale_name' => $product->wholesale_name,
            'thumbnail' => $product->thumbnail_url,
            'variants_count' => $product->variants_count,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Get top selling products based on order item quantity.
     * GET /api/v2/website-admin/products/top-selling
     */
    public function topSellingProducts(): JsonResponse
    {
        // Use direct database access for module independence
        $topProductIds = DB::table('sales_order_items as soi')
            ->join('product_variants as pv', 'soi.product_variant_id', '=', 'pv.id')
            ->join('sales_orders as so', 'soi.sales_order_id', '=', 'so.id')
            ->whereNotIn('so.status', ['cancelled', 'draft'])
            ->selectRaw('pv.product_id, SUM(soi.quantity) as total_sold')
            ->groupBy('pv.product_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->pluck('total_sold', 'product_id');

        if ($topProductIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Get products using direct database access
        $products = DB::table('products as p')
            ->leftJoin('media_files as mf', 'p.thumbnail_id', '=', 'mf.id')
            ->leftJoin('product_variants as pv', 'p.id', '=', 'pv.product_id')
            ->whereIn('p.id', $topProductIds->keys())
            ->where('p.status', 'published')
            ->select('p.*', 'mf.url as thumbnail_url')
            ->selectRaw('COUNT(DISTINCT pv.id) as variants_count')
            ->groupBy('p.id', 'p.name', 'p.wholesale_name', 'p.thumbnail_id', 'mf.url', 'p.status', 'p.created_at', 'p.updated_at')
            ->get()
            ->sortByDesc(fn ($p) => $topProductIds[$p->id]);

        $data = $products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'wholesale_name' => $product->wholesale_name,
            'thumbnail' => $product->thumbnail?->full_url,
            'variants_count' => $product->variants_count,
            'total_sold' => (int) $topProductIds[$product->id],
        ])->values();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // -------------------------------------------------------
    // STATUS HISTORY
    // -------------------------------------------------------

    /**
     * Get status history for an order.
     * GET /api/v2/website-admin/orders/{id}/status-history
     */
    public function statusHistory(int $id): JsonResponse
    {
        // Remove relationship loading for module independence
        $histories = WebsiteOrderStatusHistory::where('order_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $histories]);
    }

    /**
     * Get activity log for an order.
     * GET /api/v2/website-admin/orders/{id}/activity-log
     */
    public function activityLog(int $id): JsonResponse
    {
        // Remove relationship loading for module independence
        $logs = WebsiteOrderActivityLog::where('order_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json(['success' => true, 'data' => $logs]);
    }

    // -------------------------------------------------------
    // SMS TO CUSTOMER
    // -------------------------------------------------------

    /**
     * Send SMS to the order's customer.
     * POST /api/v2/website-admin/orders/{id}/send-sms
     */
    public function sendSms(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:160',
        ]);

        $order = WebsiteOrder::find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        $customerData = $order->getCustomerData();
        $phone = $customerData['phone'] ?? null;

        if (empty($phone)) {
            return response()->json(['success' => false, 'message' => 'Customer phone number not found'], 422);
        }

        $smsService = new AlphaSmsService();
        $result = $smsService->sendSms($validated['message'], $phone);

        $hasError = isset($result['error']) && $result['error'] !== 0;

        WebsiteOrderActivityLog::log(
            $order->id,
            $hasError ? 'sms_failed' : 'sms_sent',
            $hasError
                ? 'SMS failed: ' . ($result['msg'] ?? 'Unknown error')
                : 'SMS sent to ' . $phone,
            null,
            ['message' => $validated['message'], 'phone' => $phone, 'api_response' => $result],
            auth()->id()
        );

        if ($hasError) {
            return response()->json([
                'success' => false,
                'message' => 'SMS failed: ' . ($result['msg'] ?? 'Unknown error'),
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'SMS sent successfully',
        ]);
    }

    // -------------------------------------------------------
    // BULK OPERATIONS
    // -------------------------------------------------------

    /**
     * Bulk update order status.
     * POST /api/v2/website-admin/orders/bulk-update-status
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'integer|exists:sales_orders,id',
            'status' => 'required|string|in:' . implode(',', WebsiteOrder::STATUSES),
            'note' => 'nullable|string|max:1000',
            'cancellation_reason' => 'nullable|in:customer,admin,courier,system',
        ]);

        $result = $this->orderService->bulkUpdateStatus(
            $validated['order_ids'],
            $validated['status'],
            $validated['note'] ?? null,
            $validated['cancellation_reason'] ?? null
        );

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Bulk send orders to Steadfast courier.
     * POST /api/v2/website-admin/orders/bulk-send-to-courier
     */
    public function bulkSendToCourier(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'integer|exists:sales_orders,id',
            'delay_seconds' => 'nullable|numeric|min:0.1|max:5',
        ]);

        $delay = (float) ($validated['delay_seconds'] ?? 0.5);

        $result = $this->orderService->bulkSendToCourier(
            $validated['order_ids'],
            $delay
        );

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Delete a single order (soft delete).
     * DELETE /api/v2/website-admin/orders/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $result = $this->orderService->deleteOrder($id);

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Bulk delete orders (soft delete).
     * POST /api/v2/website-admin/orders/bulk-delete
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'integer|exists:sales_orders,id',
        ]);

        $result = $this->orderService->bulkDeleteOrders($validated['order_ids']);

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // TRANSFORMERS
    // -------------------------------------------------------

    private function buildFullOrderResponse(int $orderId): array
    {
        // Module independence: Only load relationships within Website module
        // Customer data uses denormalized columns (customer_name, customer_email, customer_phone)
        // Thumbnail data added via pure SQL (no cross-module relationships)
        $order = WebsiteOrder::with([
            'statusHistories',
            'activityLogs',
        ])->find($orderId);

        // Fetch items with product/variant details via JOIN (use current prices from product_variants)
        $items = DB::table('sales_order_items as sgi')
            ->leftJoin('product_variants as pv', 'sgi.product_variant_id', '=', 'pv.id')
            ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
            ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
            ->where('sgi.sales_order_id', $orderId)
            ->select(
                'sgi.id',
                'sgi.product_variant_id',
                'sgi.quantity',
                'sgi.total_cost',
                'p.name as product_name',
                'p.slug as product_slug',
                'pv.sku as product_sku',
                'pv.variant_name',
                'pv.price',
                'pv.offer_price',
                'm.path as thumbnail_path',
                DB::raw('CASE WHEN m.path IS NOT NULL THEN CONCAT("https://hooknhunt-api.test/storage/", m.path) ELSE NULL END as thumbnail_url'),
                DB::raw('(pv.offer_price * sgi.quantity) as total_price'),
                DB::raw('((pv.offer_price * sgi.quantity) - sgi.total_cost) as profit')
            )
            ->get()
            ->map(function ($item) {
                return (object) [
                    'id' => $item->id,
                    'product_variant_id' => $item->product_variant_id,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->offer_price,
                    'original_price' => (float) $item->price,
                    'total_price' => (float) $item->total_price,
                    'total_cost' => (float) $item->total_cost,
                    'profit' => (float) $item->profit,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->product_slug,
                    'product_sku' => $item->product_sku,
                    'variant_name' => $item->variant_name,
                    'thumbnail_path' => $item->thumbnail_path,
                    'thumbnail_url' => $item->thumbnail_url,
                    'weight' => 0,
                    'total_weight' => 0,
                ];
            });

        // Attach enriched items to order
        $order->items = $items;

        // Get allowed next statuses using the transition service
        $validTransitions = $this->transitionService->getValidTransitions($order->status);
        $allowedNextStatuses = array_keys($validTransitions);

        // Special handling for cancelled orders (revival)
        if ($order->status === 'cancelled') {
            $allowedNextStatuses = ['pending', 'processing'];
        }

        return array_merge($this->transformOrderDetail($order), [
            'allowedNextStatuses' => $allowedNextStatuses,
            'is_editable' => $order->isEditable(),
            'can_send_to_courier' => $order->canSendToCourier(),
        ]);
    }

    private function transformOrderListItem(WebsiteOrder $order): array
    {
        $shippingData = $order->getShippingData();

        return [
            'id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'channel' => $order->channel,
            'status' => $order->status,
            'status_label' => $order->status_label,
            'payment_status' => $order->payment_status,
            'delivery_status' => $order->delivery_status,
            'sub_total' => (float) $order->sub_total,
            'discount_amount' => (float) $order->discount_amount,
            'delivery_charge' => (float) $order->delivery_charge,
            'total_amount' => (float) $order->total_amount,
            'paid_amount' => (float) $order->paid_amount,
            'due_amount' => $order->due_amount,
            'total_weight' => (float) $order->total_weight,
            'item_count' => $order->items->count(),
            'sent_to_courier' => (bool) $order->sent_to_courier,
            'tracking_code' => $order->tracking_code,
            // Module independence: Use denormalized customer data (no relationship)
            'customer' => [
                'id' => $order->customer_id,
                'name' => $order->customer_name,
                'phone' => $order->customer_phone,
            ],
            'shipping_division' => $shippingData['division'] ?? null,
            'is_editable' => $order->isEditable(),
            'created_at' => $order->created_at?->toIso8601String(),
            'shipped_at' => $order->shipped_at?->toIso8601String(),
        ];
    }

    private function transformOrderDetail(WebsiteOrder $order): array
    {
        $shippingData = $order->getShippingData();
        $customerData = $order->getCustomerData();
        $paymentData = $order->getPaymentData();

        // Calculate correct totals from items (items have current prices from product_variants)
        $calculatedSubTotal = $order->items ? $order->items->sum('total_price') : 0;
        $calculatedProfit = $order->items ? $order->items->sum('profit') : 0;
        $discountAmount = (float) $order->discount_amount;
        $deliveryCharge = (float) $order->delivery_charge;
        $calculatedTotal = max(0, $calculatedSubTotal - $discountAmount + $deliveryCharge);
        $paidAmount = (float) $order->paid_amount;
        $calculatedDueAmount = max(0, $calculatedTotal - $paidAmount);

        return [
            'id' => $order->id,
            'invoiceNo' => $order->invoice_no,
            'channel' => $order->channel,
            'status' => $order->status,
            'statusLabel' => $order->status_label,
            'paymentStatus' => $order->payment_status,
            'deliveryStatus' => $order->delivery_status,
            'subTotal' => $calculatedSubTotal,
            'discountAmount' => $discountAmount,
            'deliveryCharge' => $deliveryCharge,
            'totalAmount' => $calculatedTotal,
            'paidAmount' => $paidAmount,
            'dueAmount' => $calculatedDueAmount,
            'totalWeight' => (float) $order->total_weight,
            'totalProfit' => $calculatedProfit,
            'couponCode' => $order->coupon_code,
            'note' => $order->note,
            'editingLocked' => (bool) $order->editing_locked,
            'sentToCourier' => (bool) $order->sent_to_courier,
            'consignmentId' => $order->consignment_id,
            'trackingCode' => $order->tracking_code,
            'shipping' => $shippingData,
            'customerInfo' => [
                'id' => $order->customer_id,
                'name' => $order->customer_name,
                'phone' => $order->customer_phone,
                'email' => $order->customer_email,
                'type' => $order->external_data['customer_type'] ?? 'retail',
            ] + $customerData,
            'payment' => $paymentData,
            'soldBy' => null, // User relationship removed for independence
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'productVariantId' => $item->product_variant_id,
                'productId' => null,
                'productName' => $item->product_name,
                'wholesaleName' => null,
                'variantName' => $item->variant_name ?? $item->product_sku ?? 'N/A',
                'sku' => $item->product_sku,
                'thumbnail' => $item->thumbnail_url ?? $item->thumbnail_path,
                'thumbnailUrl' => $item->thumbnail_url,
                'slug' => $item->product_slug ?? null,
                'variantWeight' => (float) ($item->weight ?? 0),
                'quantity' => $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'originalPrice' => $item->original_price ? (float) $item->original_price : null,
                'offerPrice' => $item->original_price ? (float) $item->original_price : null,
                'totalPrice' => (float) $item->total_price,
                'totalCost' => (float) $item->total_cost,
                'profit' => (float) $item->profit,
                'weight' => (float) $item->weight,
                'totalWeight' => (float) $item->total_weight,
            ])->toArray(),
            'statusHistory' => $order->statusHistories->map(fn ($h) => [
                'id' => $h->id,
                'fromStatus' => $h->from_status,
                'toStatus' => $h->to_status,
                'comment' => $h->comment,
                'changedBy' => null, // User relationship removed for independence
                'createdAt' => $h->created_at->toIso8601String(),
            ])->toArray(),
            // Module independence: Use activityLogs relationship (Website module)
            'recentActivities' => $order->activityLogs()->latest()->limit(10)->get()->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'oldData' => $log->old_data,
                'newData' => $log->new_data,
                'performedBy' => null, // User relationship removed for module independence
                'createdAt' => $log->created_at->toIso8601String(),
            ])->toArray(),
            'timestamps' => [
                'createdAt' => $order->created_at?->toIso8601String(),
                'confirmedAt' => $order->confirmed_at?->toIso8601String(),
                'shippedAt' => $order->shipped_at?->toIso8601String(),
                'cancelledAt' => $order->cancelled_at?->toIso8601String(),
            ],
        ];
    }

    private function getCustomerSummary(int $customerId, int $currentOrderId): array
    {
        $orders = WebsiteOrder::where('customer_id', $customerId)->get();
        $completedOrders = $orders->where('status', 'completed');
        $canceledOrders = $orders->where('status', 'cancelled');

        $completed = $completedOrders->count();
        $canceled = $canceledOrders->count();
        $total = $orders->count();

        // Rating: 5 - (canceled/total * 5), min 0
        $rating = $total > 0 ? max(0, round(5 - ($canceled / $total * 5), 1)) : 5;

        $previousOrder = $orders->where('id', '!=', $currentOrderId)
            ->sortByDesc('created_at')
            ->first();

        return [
            'total_orders' => $total,
            'completed_orders' => $completed,
            'canceled_orders' => $canceled,
            'total_spent' => (float) $completedOrders->sum('total_amount'),
            'rating' => $rating,
            'last_order_date' => $previousOrder?->created_at?->toIso8601String(),
            'last_order_invoice' => $previousOrder?->invoice_no,
        ];
    }
}
